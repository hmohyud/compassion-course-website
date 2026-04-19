#!/usr/bin/env node
/**
 * Set releaseDate + releaseAt on every weeklyContent doc to match the
 * 2026 launch schedule:
 *
 *   Week 1  — Wed June 24, 2026 at 12:00 PM New York time
 *   Week 2  — Wed July  1, 2026 at 12:00 PM New York time
 *   …       — and so on every Wednesday
 *   Week 52 — Wed June 16, 2027 at 12:00 PM New York time
 *
 * Uses the Firebase CLI's stored OAuth token against the Firestore REST
 * API (same pattern as scripts/seed-weekly-content-cli-auth.cjs). Only
 * touches docs that already exist — doesn't create new ones.
 *
 * Usage:
 *   node scripts/update-release-schedule.cjs [--dry-run]
 *
 * Requires: `firebase login` to have been run.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = 'compassion-course-websit-937d6';

// Firebase CLI's public OAuth client.
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

// ─── auth ───────────────────────────────────────────────────────────────────

function configstorePath() {
  return path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
}

async function getAccessToken() {
  const cfg = JSON.parse(fs.readFileSync(configstorePath(), 'utf8'));
  const tokens = cfg.tokens;
  if (!tokens) throw new Error('No tokens in firebase-tools configstore. Run `firebase login`.');

  const now = Date.now();
  if (tokens.access_token && tokens.expires_at && tokens.expires_at > now + 60_000) {
    return tokens.access_token;
  }
  // Refresh.
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FIREBASE_CLI_CLIENT_ID,
      client_secret: FIREBASE_CLI_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.access_token;
}

// ─── schedule math ──────────────────────────────────────────────────────────

/**
 * The 52 Wednesdays of the course, starting with Week 1 = June 24, 2026.
 * Returns { 1: "2026-06-24", 2: "2026-07-01", … }.
 */
function buildSchedule() {
  const schedule = {};
  // Start at June 24, 2026. Use UTC date arithmetic so DST doesn't skew.
  const d = new Date(Date.UTC(2026, 5, 24));
  for (let n = 1; n <= 52; n++) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    schedule[n] = `${y}-${m}-${day}`;
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return schedule;
}

/**
 * Compute the exact UTC ISO timestamp for 12:00 America/New_York on the
 * given YYYY-MM-DD. DST-correct: probes whether 16:00 UTC maps to 12:00
 * NY (EDT) or 11:00 NY (EST) and adjusts accordingly.
 */
function nyNoonUtcIso(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
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

// ─── Firestore REST ─────────────────────────────────────────────────────────

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getDoc(token, weekNum) {
  const url = `${FS_BASE}/weeklyContent/${weekNum}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function patchDoc(token, weekNum, fields) {
  // PATCH with ?updateMask so we only touch the fields we set.
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${FS_BASE}/weeklyContent/${weekNum}?${mask}`;
  const body = {
    fields: Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, toFsValue(v)])
    ),
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${url} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function toFsValue(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number' && Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number') return { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  throw new Error(`Unsupported value type for ${JSON.stringify(v)}`);
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const schedule = buildSchedule();
  const token = await getAccessToken();
  console.log(`Updating release schedule on project ${PROJECT_ID}${DRY_RUN ? ' (dry run)' : ''}\n`);

  let touched = 0;
  let missing = 0;

  for (let n = 1; n <= 52; n++) {
    const releaseDate = schedule[n];
    const releaseAt = nyNoonUtcIso(releaseDate);
    const existing = await getDoc(token, n);
    if (!existing) {
      missing++;
      console.log(`  week ${String(n).padStart(2, ' ')} · ${releaseDate} 12:00 NY → (no doc yet, skipped)`);
      continue;
    }
    const existingDate = existing.fields?.releaseDate?.stringValue ?? '(unset)';
    if (DRY_RUN) {
      console.log(`  week ${String(n).padStart(2, ' ')} · ${existingDate} → ${releaseDate} (${releaseAt})`);
      continue;
    }
    await patchDoc(token, n, { releaseDate, releaseAt });
    touched++;
    console.log(`  week ${String(n).padStart(2, ' ')} · ${releaseDate} 12:00 NY (${releaseAt})`);
  }

  console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'} ${DRY_RUN ? (52 - missing) : touched} doc(s). ${missing} week(s) had no Firestore doc.`);
}

main().catch((err) => {
  console.error('\n❌', err.stack || err.message || err);
  process.exit(1);
});
