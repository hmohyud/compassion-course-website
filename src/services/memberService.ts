import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// ─────────────────────────────────────────────────────────────────────────────
// 2026 Cohort Member Roster
//
// Each document represents one allowed member email for the 2026 Member
// Portal. The doc id is the *lowercase, trimmed* email so adds are
// idempotent. Only `email` is required — name/tier/city/etc. are all
// optional metadata captured at registration time (or filled in later).
//
// Admin-only access enforced by firestore.rules — the React UI is also
// admin-gated, but the rules are the real wall.
// ─────────────────────────────────────────────────────────────────────────────

export interface MemberRecord {
  /** Lowercase, trimmed email. Doubles as the Firestore doc id. */
  email: string;
  name?: string;
  tier?: string;
  city?: string;
  state?: string;
  country?: string;
  /** Numeric tuition paid (USD). */
  amount?: number;
  /** Origin of the record: 'jotform' | 'manual' | 'bulk-import' | string. */
  source?: string;
  /** Optional free-form notes the admin can attach. */
  notes?: string;
  addedAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

const COL = 'members';

const colRef = () => collection(db!, COL);

const toMember = (id: string, data: any): MemberRecord => ({
  email: id,
  name: data.name ?? undefined,
  tier: data.tier ?? undefined,
  city: data.city ?? undefined,
  state: data.state ?? undefined,
  country: data.country ?? undefined,
  amount: typeof data.amount === 'number' ? data.amount : undefined,
  source: data.source ?? undefined,
  notes: data.notes ?? undefined,
  addedAt: data.addedAt?.toDate?.(),
  updatedAt: data.updatedAt?.toDate?.(),
  updatedBy: data.updatedBy ?? undefined,
});

/** Normalize an email to its canonical form (used as doc id). */
export function normalizeEmail(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
export function isValidEmail(raw: string): boolean {
  return EMAIL_REGEX.test((raw || '').trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function listMembers(): Promise<MemberRecord[]> {
  if (!db) return [];
  const snap = await getDocs(query(colRef(), orderBy('email', 'asc')));
  return snap.docs.map((d) => toMember(d.id, d.data()));
}

export async function getMember(email: string): Promise<MemberRecord | null> {
  if (!db) return null;
  const id = normalizeEmail(email);
  const s = await getDoc(doc(db, COL, id));
  if (!s.exists()) return null;
  return toMember(s.id, s.data());
}

/**
 * Insert or update one member. The doc id is derived from the email so
 * subsequent saves with the same email overwrite (which is the expected
 * "edit this row" behaviour).
 */
export async function saveMember(
  patch: MemberRecord,
  updatedBy: string,
): Promise<MemberRecord> {
  if (!db) throw new Error('Firestore not configured');
  const id = normalizeEmail(patch.email);
  if (!isValidEmail(id)) throw new Error(`Invalid email: ${patch.email}`);

  const ref = doc(db, COL, id);
  const existing = await getDoc(ref);

  // Only write fields the admin actually set. Strip undefined / empty
  // strings so we don't overwrite real data with blanks on edit.
  const payload: Record<string, unknown> = { email: id };
  if (patch.name?.trim()) payload.name = patch.name.trim();
  if (patch.tier?.trim()) payload.tier = patch.tier.trim();
  if (patch.city?.trim()) payload.city = patch.city.trim();
  if (patch.state?.trim()) payload.state = patch.state.trim();
  if (patch.country?.trim()) payload.country = patch.country.trim();
  if (typeof patch.amount === 'number' && !Number.isNaN(patch.amount)) {
    payload.amount = patch.amount;
  }
  if (patch.source?.trim()) payload.source = patch.source.trim();
  if (patch.notes?.trim()) payload.notes = patch.notes.trim();
  payload.updatedAt = Timestamp.now();
  payload.updatedBy = updatedBy;
  if (!existing.exists()) {
    payload.addedAt = Timestamp.now();
    if (!payload.source) payload.source = 'manual';
  }

  await setDoc(ref, payload, { merge: true });
  return { ...patch, email: id };
}

export async function deleteMember(email: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  const id = normalizeEmail(email);
  await deleteDoc(doc(db, COL, id));
}

/**
 * Bulk insert/update. Skips invalid emails and dedupes by lowercase
 * email within the input. Returns counts of added vs skipped.
 */
export async function bulkAddMembers(
  records: Partial<MemberRecord>[],
  updatedBy: string,
): Promise<{ added: number; skipped: number; invalidEmails: string[] }> {
  if (!db) throw new Error('Firestore not configured');
  const invalidEmails: string[] = [];
  const seen = new Set<string>();
  const valid: MemberRecord[] = [];
  for (const r of records) {
    const email = normalizeEmail(r.email || '');
    if (!isValidEmail(email)) {
      invalidEmails.push(r.email || '(empty)');
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    valid.push({ ...r, email } as MemberRecord);
  }

  // Firestore batches max out at 500 ops; chunk to be safe.
  const CHUNK = 400;
  let added = 0;
  for (let i = 0; i < valid.length; i += CHUNK) {
    const slice = valid.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    for (const r of slice) {
      const ref = doc(db, COL, r.email);
      const fields: Record<string, unknown> = {
        email: r.email,
        updatedAt: Timestamp.now(),
        updatedBy,
        addedAt: Timestamp.now(),
      };
      if (r.name?.trim()) fields.name = r.name.trim();
      if (r.tier?.trim()) fields.tier = r.tier.trim();
      if (r.city?.trim()) fields.city = r.city.trim();
      if (r.state?.trim()) fields.state = r.state.trim();
      if (r.country?.trim()) fields.country = r.country.trim();
      if (typeof r.amount === 'number') fields.amount = r.amount;
      fields.source = r.source?.trim() || 'bulk-import';
      if (r.notes?.trim()) fields.notes = r.notes.trim();
      batch.set(ref, fields, { merge: true });
    }
    await batch.commit();
    added += slice.length;
  }
  return { added, skipped: invalidEmails.length, invalidEmails };
}

/**
 * Parse a textarea blob into draft member records. Supports:
 *  - One email per line (just the email)
 *  - CSV with header row: email,name,city,state,country,tier,amount,notes
 *  - Comma- or whitespace-separated email lists
 */
export function parseBulkInput(raw: string): Partial<MemberRecord>[] {
  const text = (raw || '').trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Detect CSV header row (must contain "email" + one more known field).
  const KNOWN = ['email', 'name', 'tier', 'city', 'state', 'country', 'amount', 'notes', 'source'];
  const firstCols = lines[0].split(',').map((s) => s.trim().toLowerCase());
  const isCsv =
    firstCols.includes('email') &&
    firstCols.filter((c) => KNOWN.includes(c)).length >= 2 &&
    lines.length > 1;

  if (isCsv) {
    const header = firstCols;
    const out: Partial<MemberRecord>[] = [];
    for (const line of lines.slice(1)) {
      const cells = parseCsvLine(line);
      const rec: Partial<MemberRecord> = {};
      header.forEach((col, i) => {
        const val = (cells[i] ?? '').trim();
        if (!val) return;
        if (col === 'amount') {
          const n = Number(val);
          if (!Number.isNaN(n)) rec.amount = n;
        } else if (KNOWN.includes(col)) {
          (rec as any)[col] = val;
        }
      });
      if (rec.email) out.push(rec);
    }
    return out;
  }

  // Otherwise: extract every email-shaped string and create skeleton records.
  const re = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) found.add(m[0].toLowerCase());
  return [...found].map((email) => ({ email, source: 'bulk-import' }));
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
