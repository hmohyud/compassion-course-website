import { collection, addDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { ref as storageRef, listAll } from 'firebase/storage';
import { db, storage } from '../firebase/firebaseConfig';
import type { AudioChunk } from '../utils/lessonAudio';

// ──────────────────────────────────────────────────────────────────────────────
// Audio-generation jobs. The editor creates an `audioJobs/{id}` doc and watches
// it live; the onAudioJobCreated Cloud Function generates the clips and writes
// progress back. (Callable functions are blocked by org policy, hence the
// Firestore-trigger pattern.)
// ──────────────────────────────────────────────────────────────────────────────

export type AudioItemStatus = 'pending' | 'done' | 'skipped' | 'error';
export type AudioJobStatus = 'queued' | 'running' | 'complete' | 'completed_with_errors' | 'error';

export interface AudioJobItem {
  storagePath: string;
  label: string;
  text?: string;
  status: AudioItemStatus;
  error?: string;
}

export interface AudioJob {
  id: string;
  weekNumber: number;
  status: AudioJobStatus;
  total: number;
  done: number;
  items: AudioJobItem[];
  error?: string;
}

const COL = 'audioJobs';

/** Queue an audio-generation job for a set of chunks. Returns the job id. */
export async function createAudioJob(weekNumber: number, chunks: AudioChunk[], createdBy: string): Promise<string> {
  if (!db) throw new Error('Firestore is not configured');
  const items: AudioJobItem[] = chunks.map((c) => ({
    storagePath: c.storagePath,
    label: c.label,
    text: c.text,
    status: 'pending',
  }));
  const docRef = await addDoc(collection(db, COL), {
    weekNumber,
    status: 'queued',
    total: items.length,
    done: 0,
    items,
    createdBy,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

/** Subscribe to a job's live progress. Returns an unsubscribe function. */
export function watchAudioJob(jobId: string, cb: (job: AudioJob | null) => void): () => void {
  if (!db) {
    cb(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, COL, jobId),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      const d = snap.data() as any;
      cb({
        id: snap.id,
        weekNumber: d.weekNumber,
        status: d.status ?? 'queued',
        total: d.total ?? 0,
        done: d.done ?? 0,
        items: Array.isArray(d.items) ? d.items : [],
        error: d.error,
      });
    },
    () => cb(null),
  );
}

/** Storage paths of audio files that already exist under weekly-audio/.
 *  Falls back to an empty set if listing isn't permitted (the caller can union
 *  this with the week's audioStoragePaths). */
export async function listExistingWeeklyAudio(): Promise<Set<string>> {
  if (!storage) return new Set();
  try {
    const res = await listAll(storageRef(storage, 'weekly-audio'));
    return new Set(res.items.map((i) => i.fullPath));
  } catch {
    return new Set();
  }
}
