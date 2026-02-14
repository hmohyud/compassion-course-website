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
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { BoardDoc, BoardMemberDoc, CreateBoardInput, UpdateBoardMetaInput } from './whiteboardTypes';
import { normalizeError } from './whiteboardErrors';
import { deletePath } from './whiteboardStorageAdapter';
import { loadCurrentState } from './whiteboardStateService';

const COLLECTION_WHITEBOARDS = 'whiteboards';
const TENANT_WHITEBOARDS = 'whiteboards';

function toDate(v: unknown): Date {
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  return new Date();
}

function fromBoardDoc(id: string, data: Record<string, unknown>): BoardDoc {
  return {
    id,
    title: (data.title as string) ?? 'Untitled',
    ownerId: (data.ownerId as string) ?? '',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    lastOpenedAt: data.lastOpenedAt != null ? toDate(data.lastOpenedAt) : undefined,
    teamId: data.teamId != null ? (data.teamId as string) : undefined,
    teamCompanyId: data.teamCompanyId != null ? (data.teamCompanyId as string) : undefined,
  };
}

export async function createBoard(input: CreateBoardInput): Promise<{ boardId: string }> {
  try {
    const boardRef = doc(collection(db, COLLECTION_WHITEBOARDS));
    const boardId = boardRef.id;
    const title = input.title?.trim() || 'Untitled whiteboard';
    await setDoc(boardRef, {
      title,
      ownerId: input.ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(input.teamId != null && input.teamId !== '' ? { teamId: input.teamId } : {}),
      ...(input.teamCompanyId != null && input.teamCompanyId !== '' ? { teamCompanyId: input.teamCompanyId } : {}),
    });
    const membersRef = doc(db, COLLECTION_WHITEBOARDS, boardId, 'members', input.ownerId);
    await setDoc(membersRef, { role: 'owner', addedAt: serverTimestamp() });
    const userBoardRef = doc(db, 'userWhiteboards', input.ownerId, 'boards', boardId);
    await setDoc(userBoardRef, { boardId, addedAt: serverTimestamp() });
    return { boardId };
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function listBoardsForTeam(teamId: string, _companyId?: string): Promise<BoardDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTION_WHITEBOARDS),
      where('teamId', '==', teamId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromBoardDoc(d.id, d.data()));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function listBoardsForUser(userId: string): Promise<BoardDoc[]> {
  try {
    const ownedQ = query(
      collection(db, COLLECTION_WHITEBOARDS),
      where('ownerId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const ownedSnap = await getDocs(ownedQ);
    const owned = ownedSnap.docs.map((d) => fromBoardDoc(d.id, d.data()));
    const sharedRef = collection(db, 'userWhiteboards', userId, 'boards');
    const sharedSnap = await getDocs(sharedRef);
    const sharedIds = sharedSnap.docs.map((d) => d.data().boardId as string).filter(Boolean);
    const byId = new Map<string, BoardDoc>();
    owned.forEach((b) => byId.set(b.id, b));
    for (const boardId of sharedIds) {
      if (byId.has(boardId)) continue;
      const board = await getBoard(boardId);
      if (board) byId.set(board.id, board);
    }
    return Array.from(byId.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function getBoard(boardId: string): Promise<BoardDoc | null> {
  try {
    const ref = doc(db, COLLECTION_WHITEBOARDS, boardId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return fromBoardDoc(snap.id, snap.data() ?? {});
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function updateBoardMeta(boardId: string, partial: UpdateBoardMetaInput): Promise<void> {
  try {
    const ref = doc(db, COLLECTION_WHITEBOARDS, boardId);
    const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (partial.title !== undefined) data.title = partial.title;
    if (partial.lastOpenedAt !== undefined) data.lastOpenedAt = partial.lastOpenedAt;
    await updateDoc(ref, data);
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function addMember(boardId: string, userId: string, role: BoardMemberDoc['role']): Promise<void> {
  try {
    const memberRef = doc(db, COLLECTION_WHITEBOARDS, boardId, 'members', userId);
    await setDoc(memberRef, { role, addedAt: serverTimestamp() });
    const userBoardRef = doc(db, 'userWhiteboards', userId, 'boards', boardId);
    await setDoc(userBoardRef, { boardId, addedAt: serverTimestamp() });
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function listMembers(boardId: string): Promise<BoardMemberDoc[]> {
  try {
    const membersRef = collection(db, COLLECTION_WHITEBOARDS, boardId, 'members');
    const snap = await getDocs(membersRef);
    return snap.docs.map((d) => ({
      userId: d.id,
      role: (d.data().role as BoardMemberDoc['role']) ?? 'viewer',
      addedAt: toDate(d.data().addedAt),
    }));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function deleteBoard(boardId: string): Promise<void> {
  try {
    const state = await loadCurrentState(boardId);
    const filesMeta = state?.filesMeta ?? {};
    if (typeof filesMeta === 'object' && !Array.isArray(filesMeta)) {
      for (const [, meta] of Object.entries(filesMeta)) {
        if (meta?.path) {
          try {
            await deletePath(TENANT_WHITEBOARDS, meta.path);
          } catch {
            // ignore per-file delete failure
          }
        }
      }
    }
    const boardRef = doc(db, COLLECTION_WHITEBOARDS, boardId);
    const membersRef = collection(db, COLLECTION_WHITEBOARDS, boardId, 'members');
    const stateRef = doc(db, COLLECTION_WHITEBOARDS, boardId, 'state', 'current');
    const membersSnap = await getDocs(membersRef);
    const batch = writeBatch(db);
    for (const d of membersSnap.docs) {
      const userBoardRef = doc(db, 'userWhiteboards', d.id, 'boards', boardId);
      batch.delete(userBoardRef);
    }
    batch.delete(stateRef);
    membersSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(boardRef);
    await batch.commit();
  } catch (e) {
    throw normalizeError(e);
  }
}
