import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// ──────────────────────────────────────────────────────────────────────────────
// Lesson checkpoints — manual, restorable snapshots of a week's full HTML.
// Stored as a subcollection of the week's metadata doc:
//   weeklyContent/{weekNumber}/checkpoints/{autoId}
// Each checkpoint holds the entire lesson HTML inline (~28-38 KB, well under
// Firestore's 1 MB/doc limit). Created/deleted at will by admins; a one-time
// seed script stamps every week with a 'baseline' checkpoint at rollout.
// ──────────────────────────────────────────────────────────────────────────────

export type CheckpointKind = 'baseline' | 'manual';

export interface Checkpoint {
  id: string;
  weekNumber: number;
  /** Full lesson HTML at the time the checkpoint was taken. */
  html: string;
  /** Auto-generated title — week number + timestamp (or "Baseline …"). */
  title: string;
  /** Optional free-text note. */
  note?: string;
  kind: CheckpointKind;
  createdAt?: Date;
  /** Email of the admin who created it (or 'system' for the seed). */
  createdBy: string;
  byteSize: number;
}

const COL = 'weeklyContent';
const checkpointsCol = (weekNumber: number) => collection(db!, COL, String(weekNumber), 'checkpoints');
const checkpointDoc = (weekNumber: number, id: string) => doc(db!, COL, String(weekNumber), 'checkpoints', id);

const utf8Size = (s: string): number => {
  try {
    return new Blob([s]).size;
  } catch {
    return s.length;
  }
};

const fromDoc = (id: string, data: any, weekNumber: number): Checkpoint => ({
  id,
  weekNumber: data.weekNumber ?? weekNumber,
  html: data.html ?? '',
  title: data.title ?? '',
  note: data.note ?? '',
  kind: data.kind === 'baseline' ? 'baseline' : 'manual',
  createdAt: data.createdAt?.toDate?.(),
  createdBy: data.createdBy ?? '',
  byteSize: typeof data.byteSize === 'number' ? data.byteSize : utf8Size(data.html ?? ''),
});

/** Default checkpoint title: "Week N · Jun 17, 2026, 2:32 PM" (local time). */
export function defaultCheckpointTitle(weekNumber: number, when: Date = new Date()): string {
  const stamp = when.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Week ${weekNumber} · ${stamp}`;
}

export async function createCheckpoint(
  weekNumber: number,
  opts: { html: string; title?: string; note?: string; kind?: CheckpointKind; createdBy: string },
): Promise<void> {
  if (!db) throw new Error('Firestore is not configured');
  await addDoc(checkpointsCol(weekNumber), {
    weekNumber,
    html: opts.html,
    title: opts.title || defaultCheckpointTitle(weekNumber),
    note: opts.note ?? '',
    kind: opts.kind ?? 'manual',
    createdAt: Timestamp.now(),
    createdBy: opts.createdBy,
    byteSize: utf8Size(opts.html),
  });
}

export async function listCheckpoints(weekNumber: number): Promise<Checkpoint[]> {
  if (!db) return [];
  const snap = await getDocs(query(checkpointsCol(weekNumber), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => fromDoc(d.id, d.data(), weekNumber));
}

export async function getCheckpoint(weekNumber: number, id: string): Promise<Checkpoint | null> {
  if (!db) return null;
  const s = await getDoc(checkpointDoc(weekNumber, id));
  if (!s.exists()) return null;
  return fromDoc(s.id, s.data(), weekNumber);
}

export async function deleteCheckpoint(weekNumber: number, id: string): Promise<void> {
  if (!db) throw new Error('Firestore is not configured');
  await deleteDoc(checkpointDoc(weekNumber, id));
}
