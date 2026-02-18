import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { LeadershipBoard } from '../types/leadership';

const COLLECTION = 'boards';

function toBoard(docSnap: { id: string; data: () => Record<string, unknown> }): LeadershipBoard {
  const d = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    teamId: (d.teamId as string) ?? '',
    createdAt: (d.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (d.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

/** @deprecated Prefer createTeamWithBoard (backend) which creates team + board with boardId/whiteboardIds. Do not use for team board resolution. */
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

/** Get board by doc id. Prefer resolving via team.boardId (single source of truth). */
export async function getBoard(boardId: string): Promise<LeadershipBoard | null> {
  if (!boardId) return null;
  const ref = doc(db, COLLECTION, boardId);
  const snap = await getDoc(ref);
  return snap.exists() ? toBoard({ id: snap.id, data: () => snap.data() ?? {} }) : null;
}

/**
 * @deprecated Resolve board via team.boardId and getBoard(team.boardId) instead. Do not query by teamId.
 */
export async function getBoardByTeamId(teamId: string): Promise<LeadershipBoard | null> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('teamId', '==', teamId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toBoard({ id: snap.docs[0].id, data: () => snap.docs[0].data() });
}
