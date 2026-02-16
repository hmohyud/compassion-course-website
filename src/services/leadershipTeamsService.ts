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
  const ref = doc(db, COLLECTION, id);
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.memberIds !== undefined) data.memberIds = updates.memberIds;
  await updateDoc(ref, data);
}

export async function deleteTeam(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
