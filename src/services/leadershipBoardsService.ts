import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { LeadershipBoard } from '../types/leadership';

const COLLECTION = 'leadershipBoards';

function toBoard(docSnap: { id: string; data: () => Record<string, unknown> }): LeadershipBoard {
  const d = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    teamId: (d.teamId as string) ?? '',
    createdAt: (d.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function createBoardForTeam(teamId: string): Promise<LeadershipBoard> {
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, {
    teamId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return toBoard({ id: snap.id, data: () => snap.data() ?? {} });
}

export async function getBoardByTeamId(teamId: string): Promise<LeadershipBoard | null> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('teamId', '==', teamId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toBoard({ id: snap.docs[0].id, data: () => snap.docs[0].data() });
}
