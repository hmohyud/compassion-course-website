import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase/firebaseConfig';

const TENANT_WHITEBOARDS = 'whiteboards';

function fullPath(tenantId: string, path: string): string {
  const base = tenantId || TENANT_WHITEBOARDS;
  return path.startsWith(base + '/') ? path : `${base}/${path}`;
}

export function isConfigured(): boolean {
  try {
    return !!storage && !!import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET;
  } catch {
    return false;
  }
}

export async function upload(tenantId: string, path: string, blob: Blob): Promise<string> {
  const full = fullPath(tenantId, path);
  const storageRef = ref(storage, full);
  await uploadBytes(storageRef, blob);
  return full;
}

export async function getUrl(tenantId: string, key: string): Promise<string> {
  const full = key.startsWith(tenantId + '/') || key.startsWith(TENANT_WHITEBOARDS + '/') ? key : fullPath(tenantId, key);
  const storageRef = ref(storage, full);
  return getDownloadURL(storageRef);
}

export async function deletePath(tenantId: string, path: string): Promise<void> {
  const full = fullPath(tenantId, path);
  const storageRef = ref(storage, full);
  try {
    await deleteObject(storageRef);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code !== 'storage/object-not-found') throw e;
  }
}
