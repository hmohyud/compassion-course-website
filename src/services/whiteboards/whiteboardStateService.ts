import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import type { BoardStateDoc, FileMeta, SaveStateInput } from './whiteboardTypes';
import { normalizeError } from './whiteboardErrors';
import { upload, getUrl } from './whiteboardStorageAdapter';

const COLLECTION_WHITEBOARDS = 'whiteboards';
const STATE_DOC_ID = 'current';
const TENANT_WHITEBOARDS = 'whiteboards';

function toDate(v: unknown): Date {
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  return new Date();
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const binary = atob(parts[1] ?? '');
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function loadCurrentState(boardId: string): Promise<BoardStateDoc | null> {
  try {
    const ref = doc(db, COLLECTION_WHITEBOARDS, boardId, 'state', STATE_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() ?? {};
    const elements = Array.isArray(data.elements) ? data.elements : [];
    const appState = data.appState != null && typeof data.appState === 'object' && !Array.isArray(data.appState)
      ? (data.appState as Record<string, unknown>)
      : {};
    const filesMeta = data.filesMeta != null && typeof data.filesMeta === 'object' && !Array.isArray(data.filesMeta)
      ? (data.filesMeta as Record<string, FileMeta>)
      : {};
    return {
      elements,
      appState,
      filesMeta,
      updatedAt: toDate(data.updatedAt),
      updatedBy: (data.updatedBy as string) ?? '',
    };
  } catch (e) {
    throw normalizeError(e);
  }
}

/**
 * Resolve filesMeta to a map of fileId -> URL for Excalidraw initialData.files.
 */
export async function resolveFileUrls(
  boardId: string,
  filesMeta: Record<string, FileMeta>
): Promise<Record<string, { url: string; mimeType?: string }>> {
  const out: Record<string, { url: string; mimeType?: string }> = {};
  for (const [fileId, meta] of Object.entries(filesMeta)) {
    if (!meta?.path) continue;
    try {
      const url = await getUrl(TENANT_WHITEBOARDS, meta.path);
      out[fileId] = { url, mimeType: meta.mimeType };
    } catch {
      // skip failed resolution
    }
  }
  return out;
}

export async function saveCurrentState(
  boardId: string,
  input: SaveStateInput,
  updatedBy: string
): Promise<void> {
  try {
    const filesMeta: Record<string, FileMeta> = {};
    const files = input.files ?? {};
    for (const [fileId, file] of Object.entries(files)) {
      if (file?.dataUrl) {
        const blob = dataUrlToBlob(file.dataUrl);
        const path = `${boardId}/files/${fileId}`;
        const storedPath = await upload(TENANT_WHITEBOARDS, path, blob);
        filesMeta[fileId] = { path: storedPath, mimeType: file.mimeType };
      }
    }
    const ref = doc(db, COLLECTION_WHITEBOARDS, boardId, 'state', STATE_DOC_ID);
    const existing = await getDoc(ref);
    const existingMeta = existing.exists() && existing.data()?.filesMeta != null
      ? (existing.data()!.filesMeta as Record<string, FileMeta>)
      : {};
    const mergedMeta = { ...existingMeta, ...filesMeta };
    await setDoc(ref, {
      elements: input.elements ?? [],
      appState: input.appState ?? {},
      filesMeta: mergedMeta,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  } catch (e) {
    throw normalizeError(e);
  }
}
