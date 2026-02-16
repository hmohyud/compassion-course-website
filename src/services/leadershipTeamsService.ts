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
import { auth, db } from '../firebase/firebaseConfig';
import type { LeadershipTeam } from '../types/leadership';

const COLLECTION = 'teams';

function toTeam(docSnap: { id: string; data: () => Record<string, unknown> }): LeadershipTeam {
  const d = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    name: (d.name as string) ?? '',
    memberIds: Array.isArray(d.memberIds) ? d.memberIds : [],
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

/** Creates a team and its board (1:1) via same-origin /api endpoint (HTTP function + ID token). */
export async function createTeamWithBoard(
  name: string,
  memberIds: string[] = []
): Promise<LeadershipTeam> {
  const user = auth.currentUser;
  if (!user) {
    const err = new Error('Sign in required') as Error & { code?: string };
    err.code = 'functions/unauthenticated';
    throw err;
  }

  const token = await user.getIdToken(true);
  console.log('[createTeamWithBoard] token present', { hasToken: !!token, uid: user.uid });

  const res = await fetch('/api/createTeamWithBoard', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, memberIds }),
  });

  if (res.status === 401) {
    const err = new Error('Sign in required') as Error & { code?: string };
    err.code = 'functions/unauthenticated';
    throw err;
  }
  if (res.status === 403) {
    const err = new Error('Only admins can create teams') as Error & { code?: string };
    err.code = 'functions/permission-denied';
    throw err;
  }
  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = (await res.json()) as { ok?: boolean; teamId?: string; boardId?: string };
  if (!data?.ok || !data?.teamId) {
    throw new Error('createTeamWithBoard failed');
  }

  const now = new Date();
  return {
    id: data.teamId,
    name,
    memberIds,
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
