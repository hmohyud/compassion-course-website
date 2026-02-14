import { getBoard } from './whiteboardService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { BoardMemberRole } from './whiteboardTypes';

const COLLECTION_WHITEBOARDS = 'whiteboards';

export type BoardRole = BoardMemberRole | 'none';

export async function getUserRoleForBoard(boardId: string, userId: string): Promise<BoardRole> {
  const memberRef = doc(db, COLLECTION_WHITEBOARDS, boardId, 'members', userId);
  const memberSnap = await getDoc(memberRef);
  if (memberSnap.exists() && memberSnap.data()?.role) {
    return memberSnap.data()!.role as BoardMemberRole;
  }
  const board = await getBoard(boardId);
  if (board && board.ownerId === userId) return 'owner';
  return 'none';
}

export function isEditable(role: BoardRole): boolean {
  return role === 'owner' || role === 'editor';
}
