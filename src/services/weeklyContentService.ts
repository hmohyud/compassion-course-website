import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../firebase/firebaseConfig';

// ──────────────────────────────────────────────────────────────────────────────
// Data model
// ──────────────────────────────────────────────────────────────────────────────

export type RequiredRole = 'admin' | 'student' | 'public';

export interface WeeklyContent {
  /** Stable doc id — the week number as string ("1", "10", "22", etc.) */
  id?: string;
  /** Integer week number 1..52 */
  weekNumber: number;
  /** Display title */
  title: string;
  /** Storage path of the HTML file (e.g. "weekly-html/week-10.html") */
  htmlStoragePath: string;
  /**
   * Storage paths of this week's audio files (e.g. [
   *   "weekly-audio/lcuwkj_part1.mp3", "weekly-audio/lcuwkj_part2.mp3"
   * ]). Used so the viewer can pre-compute signed URLs and inject an Audio()
   * redirect into the iframe.
   */
  audioStoragePaths: string[];
  /** ISO date (YYYY-MM-DD). Non-admin viewers are blocked until this date. */
  releaseDate: string;
  /**
   * Exact ISO UTC timestamp the lesson unlocks — 12:00 America/New_York on
   * `releaseDate`. DST-correct (EDT/EST). Preferred over `releaseDate`
   * alone for gating because it pins the unlock to a specific moment
   * rather than a calendar day. Auto-derived from `releaseDate` on save.
   */
  releaseAt?: string;
  /** Who can view this week once released. Admin always bypasses. */
  requiredRole: RequiredRole;
  /** If false, hide from all non-admins regardless of release date. */
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

// Firestore collection
const COL = 'weeklyContent';
const colRef = () => collection(db!, COL);

// Storage prefixes
export const STORAGE_HTML_PREFIX = 'weekly-html';
export const STORAGE_AUDIO_PREFIX = 'weekly-audio';
export const STORAGE_ASSETS_PREFIX = 'weekly-assets';

// ──────────────────────────────────────────────────────────────────────────────
// Firestore CRUD
// ──────────────────────────────────────────────────────────────────────────────

const toWeeklyContent = (id: string, data: any): WeeklyContent => ({
  id,
  weekNumber: data.weekNumber,
  title: data.title ?? '',
  htmlStoragePath: data.htmlStoragePath ?? '',
  audioStoragePaths: Array.isArray(data.audioStoragePaths) ? data.audioStoragePaths : [],
  releaseDate: data.releaseDate ?? '',
  releaseAt: data.releaseAt ?? undefined,
  requiredRole: data.requiredRole ?? 'admin',
  published: data.published !== false,
  createdAt: data.createdAt?.toDate?.(),
  updatedAt: data.updatedAt?.toDate?.(),
  updatedBy: data.updatedBy,
});

/**
 * Compute the exact UTC ISO timestamp for 12:00 America/New_York on the
 * given YYYY-MM-DD. DST-correct: works out EDT vs EST by round-tripping
 * through Intl.DateTimeFormat. Returns undefined for a malformed date.
 */
export function nyNoonUtcIso(isoDate: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || '');
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // Probe: if 16:00 UTC on that day renders as 12:00 NY, we're in EDT.
  // Otherwise (EST) noon NY maps to 17:00 UTC.
  const probe = new Date(Date.UTC(y, mo - 1, d, 16, 0, 0));
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  }).format(probe);
  const isEdt = Number(hour) === 12;
  const utcHour = isEdt ? 16 : 17;
  return new Date(Date.UTC(y, mo - 1, d, utcHour, 0, 0)).toISOString();
}

export async function listAllWeeklyContent(): Promise<WeeklyContent[]> {
  if (!db) return [];
  const snap = await getDocs(query(colRef(), orderBy('weekNumber', 'asc')));
  return snap.docs.map((d) => toWeeklyContent(d.id, d.data()));
}

export async function getWeeklyContent(weekNumber: number): Promise<WeeklyContent | null> {
  if (!db) return null;
  const s = await getDoc(doc(db, COL, String(weekNumber)));
  if (!s.exists()) return null;
  return toWeeklyContent(s.id, s.data());
}

export async function saveWeeklyContent(
  content: WeeklyContent,
  updatedBy: string,
): Promise<WeeklyContent> {
  if (!db) throw new Error('Firestore is not configured');
  const id = String(content.weekNumber);
  const ref = doc(db, COL, id);
  // Always derive releaseAt from releaseDate on save so the two stay in
  // sync — admin UI only edits the date, but the gate needs the exact
  // 12:00 America/New_York moment.
  const releaseAt = nyNoonUtcIso(content.releaseDate);
  const payload: any = {
    weekNumber: content.weekNumber,
    title: content.title,
    htmlStoragePath: content.htmlStoragePath,
    audioStoragePaths: content.audioStoragePaths,
    releaseDate: content.releaseDate,
    releaseAt: releaseAt ?? null,
    requiredRole: content.requiredRole,
    published: content.published !== false,
    updatedAt: Timestamp.now(),
    updatedBy,
  };
  const existing = await getDoc(ref);
  if (!existing.exists()) payload.createdAt = Timestamp.now();
  await setDoc(ref, payload, { merge: true });
  return { ...content, id, updatedAt: new Date() };
}

export async function updateWeeklyContent(
  weekNumber: number,
  patch: Partial<WeeklyContent>,
  updatedBy: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not configured');
  const ref = doc(db, COL, String(weekNumber));
  // If the patch touches releaseDate, also recompute releaseAt so the
  // gate moment stays in sync.
  const withReleaseAt: Partial<WeeklyContent> = { ...patch };
  if (patch.releaseDate !== undefined) {
    withReleaseAt.releaseAt = nyNoonUtcIso(patch.releaseDate) ?? undefined;
  }
  await updateDoc(ref, {
    ...withReleaseAt,
    updatedAt: Timestamp.now(),
    updatedBy,
  });
}

export async function deleteWeeklyContent(weekNumber: number): Promise<void> {
  if (!db) throw new Error('Firestore is not configured');
  await deleteDoc(doc(db, COL, String(weekNumber)));
}

// ──────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Upload arbitrary bytes to a Storage path. Sets Content-Type from filename. */
export async function uploadWeeklyFile(
  path: string,
  data: Blob | Uint8Array | ArrayBuffer,
  contentType?: string,
): Promise<void> {
  if (!storage) throw new Error('Storage is not configured');
  const r = storageRef(storage, path);
  const metadata = contentType ? { contentType } : undefined;
  await uploadBytes(r, data as any, metadata);
}

/** Fetch a Storage file as UTF-8 text (used for HTML/CSS/JS). */
export async function fetchWeeklyFileText(path: string): Promise<string> {
  if (!storage) throw new Error('Storage is not configured');
  const r = storageRef(storage, path);
  const bytes = await getBytes(r);
  return new TextDecoder().decode(bytes);
}

/** Get a time-limited signed download URL for a Storage file. */
export async function getWeeklyFileUrl(path: string): Promise<string> {
  if (!storage) throw new Error('Storage is not configured');
  const r = storageRef(storage, path);
  return getDownloadURL(r);
}

export async function deleteWeeklyFile(path: string): Promise<void> {
  if (!storage) throw new Error('Storage is not configured');
  const r = storageRef(storage, path);
  await deleteObject(r);
}

// ──────────────────────────────────────────────────────────────────────────────
// Access control (client-side; Storage rules are the real gate)
// ──────────────────────────────────────────────────────────────────────────────

/** Returns true if a given user context can view the given week. */
export function canViewWeek(opts: {
  content: WeeklyContent;
  isAdmin: boolean;
  userRole?: RequiredRole | null;
  now?: Date;
}): { allowed: boolean; reason?: 'unpublished' | 'not-released' | 'role' } {
  const { content, isAdmin, userRole, now } = opts;
  if (isAdmin) return { allowed: true };
  if (!content.published) return { allowed: false, reason: 'unpublished' };
  // Prefer the exact unlock timestamp if present; fall back to deriving
  // it from the YYYY-MM-DD date. Legacy docs without either field keep
  // the old midnight-UTC parse as a last resort.
  const releaseAtIso = content.releaseAt || nyNoonUtcIso(content.releaseDate);
  const release = releaseAtIso ? new Date(releaseAtIso) : new Date(content.releaseDate);
  const today = now ?? new Date();
  if (release > today) return { allowed: false, reason: 'not-released' };
  if (content.requiredRole === 'public') return { allowed: true };
  if (content.requiredRole === 'student' && userRole === 'student') return { allowed: true };
  return { allowed: false, reason: 'role' };
}
