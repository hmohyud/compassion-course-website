import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const COLLECTION = 'whiteboards';

export interface WhiteboardMeta {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
}

export interface CanvasState {
  elements?: unknown[];
  appState?: Record<string, unknown>;
}

export interface WhiteboardDoc extends WhiteboardMeta {
  canvasState: CanvasState;
}

function toDate(v: unknown): Date {
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  return new Date();
}

function normalizeCanvasState(raw: unknown): CanvasState {
  if (!raw || typeof raw !== 'object') return { elements: [], appState: {} };
  const o = raw as Record<string, unknown>;
  const elements = Array.isArray(o.elements) ? o.elements : [];
  const appState = o.appState && typeof o.appState === 'object' && !Array.isArray(o.appState)
    ? (o.appState as Record<string, unknown>)
    : {};
  return { elements, appState };
}

function fromDoc(id: string, data: Record<string, unknown>): WhiteboardMeta {
  return {
    id,
    title: (data.title as string) ?? 'Untitled',
    ownerId: (data.ownerId as string) ?? '',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    isArchived: data.isArchived === true,
  };
}

export async function listWhiteboards(): Promise<WhiteboardMeta[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy('updatedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromDoc(d.id, d.data()));
}

export async function createWhiteboard(title: string, ownerId?: string): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const boardId = ref.id;
  await setDoc(ref, {
    title: (title || 'Untitled whiteboard').trim() || 'Untitled whiteboard',
    ownerId: ownerId ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    canvasState: { elements: [], appState: {} },
  });
  return boardId;
}

export async function getWhiteboard(boardId: string): Promise<WhiteboardDoc | null> {
  const ref = doc(db, COLLECTION, boardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() ?? {};
  const meta = fromDoc(snap.id, data);
  const canvasState = normalizeCanvasState(data.canvasState);
  return { ...meta, canvasState };
}

export async function updateWhiteboard(
  boardId: string,
  patch: Partial<Pick<WhiteboardDoc, 'title' | 'canvasState' | 'isArchived'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, boardId);
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.isArchived !== undefined) update.isArchived = patch.isArchived;
  if (patch.canvasState !== undefined) update.canvasState = patch.canvasState;
  await updateDoc(ref, update);
}
