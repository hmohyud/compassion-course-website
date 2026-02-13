import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { LeadershipTeamWhiteboard } from '../types/leadership';

const COLLECTION = 'leadershipTeamWhiteboards';

const EMPTY_SNAPSHOT: Record<string, unknown> = {};

function toWhiteboard(docSnap: { id: string; data: () => Record<string, unknown> }): LeadershipTeamWhiteboard {
  const d = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    teamId: (d.teamId as string) ?? '',
    title: (d.title as string) ?? 'Untitled',
    snapshot: (d.snapshot as Record<string, unknown>) ?? EMPTY_SNAPSHOT,
    createdBy: (d.createdBy as string) ?? '',
    createdAt: (d.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function createTeamWhiteboard(
  teamId: string,
  createdBy: string,
  title?: string
): Promise<LeadershipTeamWhiteboard> {
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, {
    teamId,
    title: title?.trim() || 'Untitled whiteboard',
    snapshot: EMPTY_SNAPSHOT,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return toWhiteboard({ id: snap.id, data: () => snap.data() ?? {} });
}

export async function getTeamWhiteboard(id: string): Promise<LeadershipTeamWhiteboard | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  return snap.exists() ? toWhiteboard({ id: snap.id, data: () => snap.data() ?? {} }) : null;
}

export async function listTeamWhiteboardsByTeam(teamId: string): Promise<LeadershipTeamWhiteboard[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('teamId', '==', teamId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => toWhiteboard({ id: d.id, data: () => d.data() }));
  list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return list;
}

export async function updateTeamWhiteboard(
  id: string,
  updates: Partial<Pick<LeadershipTeamWhiteboard, 'title' | 'snapshot'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.snapshot !== undefined) data.snapshot = updates.snapshot;
  await updateDoc(ref, data);
}

export async function deleteTeamWhiteboard(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
