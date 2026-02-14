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
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { Whiteboard, WhiteboardCanvasState } from '../types/whiteboard';

export const DEFAULT_COMPANY_ID = 'default';

const EMPTY_CANVAS_STATE: WhiteboardCanvasState = { elements: [], appState: {} };

function toDate(v: unknown): Date {
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  return new Date();
}

function normalizeCanvasState(raw: unknown): WhiteboardCanvasState {
  if (raw == null || typeof raw !== 'object') return { ...EMPTY_CANVAS_STATE };
  const o = raw as Record<string, unknown>;
  const elements = Array.isArray(o.elements) ? o.elements : [];
  const appState = o.appState != null && typeof o.appState === 'object' && !Array.isArray(o.appState)
    ? (o.appState as Record<string, unknown>)
    : {};
  return { elements, appState };
}

function fromDoc(id: string, data: Record<string, unknown>): Whiteboard {
  const collaborators = data.collaborators;
  const collabList = Array.isArray(collaborators) ? collaborators : [];
  const safeCollaborators = collabList.every((c) => typeof c === 'string')
    ? (collabList as string[])
    : [];

  return {
    id,
    companyId: (data.companyId as string) ?? '',
    teamId: data.teamId != null ? (data.teamId as string) : undefined,
    title: (data.title as string) ?? 'Untitled',
    ownerId: (data.ownerId as string) ?? '',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    canvasState: normalizeCanvasState(data.canvasState),
    collaborators: safeCollaborators.length > 0 ? safeCollaborators : undefined,
    isArchived: data.isArchived === true,
  };
}

export async function createWhiteboard(
  companyId: string,
  ownerId: string,
  options?: { teamId?: string; title?: string }
): Promise<Whiteboard> {
  if (!companyId?.trim()) throw new Error('companyId is required');
  const ref = doc(collection(db, 'companies', companyId, 'whiteboards'));
  const now = new Date();
  const title = options?.title?.trim() || 'Untitled whiteboard';
  const docData: Record<string, unknown> = {
    companyId,
    title,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    canvasState: { ...EMPTY_CANVAS_STATE },
  };
  if (options?.teamId != null && options.teamId !== '') {
    docData.teamId = options.teamId;
  }
  await setDoc(ref, docData);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Failed to create whiteboard');
  return fromDoc(snap.id, snap.data() ?? {});
}

export async function getWhiteboard(
  companyId: string,
  boardId: string
): Promise<Whiteboard | null> {
  if (!companyId?.trim() || !boardId?.trim()) return null;
  const ref = doc(db, 'companies', companyId, 'whiteboards', boardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return fromDoc(snap.id, snap.data() ?? {});
}

export async function listWhiteboards(
  companyId: string,
  teamId?: string
): Promise<Whiteboard[]> {
  if (!companyId?.trim()) return [];
  const coll = collection(db, 'companies', companyId, 'whiteboards');
  let q;
  if (teamId != null && teamId !== '') {
    q = query(
      coll,
      where('teamId', '==', teamId),
      orderBy('updatedAt', 'desc')
    );
  } else {
    q = query(coll, orderBy('updatedAt', 'desc'));
  }
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => fromDoc(d.id, d.data()));
  return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function updateWhiteboard(
  companyId: string,
  boardId: string,
  patch: Partial<Pick<Whiteboard, 'title' | 'canvasState' | 'isArchived' | 'collaborators'>>
): Promise<void> {
  if (!companyId?.trim() || !boardId?.trim()) return;
  const ref = doc(db, 'companies', companyId, 'whiteboards', boardId);
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.canvasState !== undefined) data.canvasState = patch.canvasState;
  if (patch.isArchived !== undefined) data.isArchived = patch.isArchived;
  if (patch.collaborators !== undefined) data.collaborators = Array.isArray(patch.collaborators) ? patch.collaborators : [];
  await updateDoc(ref, data);
}

export async function deleteWhiteboard(
  companyId: string,
  boardId: string
): Promise<void> {
  if (!companyId?.trim() || !boardId?.trim()) return;
  const ref = doc(db, 'companies', companyId, 'whiteboards', boardId);
  await deleteDoc(ref);
}
