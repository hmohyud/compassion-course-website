import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase/firebaseConfig';
import type { LeadershipTeam } from '../types/leadership';

const COLLECTION = 'teams';

function toTeam(docSnap: { id: string; data: () => Record<string, unknown> }): LeadershipTeam {
  const d = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    name: (d.name as string) ?? '',
    memberIds: Array.isArray(d.memberIds) ? d.memberIds : [],
    boardId: typeof d.boardId === 'string' ? d.boardId : '',
    whiteboardIds: Array.isArray(d.whiteboardIds) ? d.whiteboardIds : [],
    createdAt: (d.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function listTeams(): Promise<LeadershipTeam[]> {
  const ref = collection(db, COLLECTION);
  const snap = await getDocs(ref);
  return snap.docs.map((d) => toTeam({ id: d.id, data: () => d.data() }));
}

export async function listTeamsForUser(userId: string): Promise<LeadershipTeam[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('memberIds', 'array-contains', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTeam({ id: d.id, data: () => d.data() }));
}

export async function getTeam(id: string): Promise<LeadershipTeam | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  return snap.exists() ? toTeam({ id: snap.id, data: () => snap.data() ?? {} }) : null;
}

export async function createTeam(name: string, memberIds: string[] = []): Promise<LeadershipTeam> {
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, {
    name,
    memberIds,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return toTeam({ id: snap.id, data: () => snap.data() ?? {} });
}

/** Creates a team and its board (1:1) via Firebase callable createTeamWithBoard. */
export async function createTeamWithBoard(
  name: string,
  memberIds: string[] = []
): Promise<LeadershipTeam> {
  if (!auth.currentUser) {
    const err = new Error('Sign in required') as Error & { code?: string };
    (err as { code?: string }).code = 'functions/unauthenticated';
    throw err;
  }

  console.log('[createTeamWithBoard] calling callable', { uid: auth.currentUser?.uid });

  const fn = httpsCallable<
    { name: string; memberIds: string[] },
    { ok: boolean; teamId: string; boardId: string }
  >(functions, 'createTeamWithBoard');
  const res = await fn({ name, memberIds });
  const data = res.data;

  if (!data?.ok || !data?.teamId || !data?.boardId) {
    throw new Error('createTeamWithBoard failed');
  }

  const now = new Date();
  return {
    id: data.teamId,
    name,
    memberIds,
    boardId: data.boardId,
    whiteboardIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTeam(
  id: string,
  updates: Partial<Pick<LeadershipTeam, 'name' | 'memberIds'>>
): Promise<void> {
  const path = `/${COLLECTION}/${id}`;
  console.log('🧪 Attempting write to', path);
  console.log('🧪 Current UID:', auth.currentUser?.uid);
  const ref = doc(db, COLLECTION, id);
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.memberIds !== undefined) data.memberIds = updates.memberIds;
  try {
    await updateDoc(ref, data);
    console.log('✅ SUCCESS writing', path);
  } catch (error) {
    console.error('❌ FAILED writing', path, error);
    console.error('❌ Full error object:', error);
    console.error('❌ auth.currentUser?.uid:', auth.currentUser?.uid);
    throw error;
  }
}

/** Patch boardId onto an existing team (used for auto-initialization). */
export async function patchTeamBoardId(teamId: string, boardId: string): Promise<void> {
  const ref = doc(db, COLLECTION, teamId);
  await updateDoc(ref, { boardId, updatedAt: serverTimestamp() });
}

export async function deleteTeam(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Cascade-delete a team and all its data (board, work items, settings) via Firebase callable. Admin-only. */
export async function deleteTeamWithData(
  teamId: string
): Promise<{ ok: boolean; workItemsDeleted: number }> {
  if (!auth.currentUser) {
    const err = new Error('Sign in required') as Error & { code?: string };
    err.code = 'functions/unauthenticated';
    throw err;
  }

  const fn = httpsCallable<
    { teamId: string },
    { ok: boolean; teamId: string; workItemsDeleted: number }
  >(functions, 'deleteTeamWithData');
  const res = await fn({ teamId });
  const data = res.data;

  if (!data?.ok) {
    throw new Error('deleteTeamWithData failed');
  }

  return { ok: true, workItemsDeleted: data.workItemsDeleted };
}
