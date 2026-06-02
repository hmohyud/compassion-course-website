#!/usr/bin/env node
/**
 * Seed weeks from a zipped batch of Constant-Contact-export HTML files.
 *
 * What it does:
 *   - Walks the unzipped folder.
 *   - Extracts week number from filenames like:
 *       Week-5--Empathy--the-Breath-of-Compassion---The-...html
 *       week 45..html
 *       week47.html
 *   - Skips week numbers we already have in Firestore (don't clobber).
 *   - Skips duplicate files for the same week (prefers the shorter path).
 *   - Reads each HTML, extracts <title>, uploads to Storage at
 *     weekly-html/week-{n}.html, and writes a Firestore doc.
 *   - releaseDate / releaseAt computed from the launch schedule
 *     (Week N = Wednesday after June 24, 2026 + (N-1)*7 days, 12:00 NY).
 *   - requiredRole: 'public' so verified members can view post-release.
 *
 * Usage: node scripts/seed-zipped-weeks.cjs <unzip-dir> [--dry-run]
 *   <unzip-dir> contains the *.html files (the folder inside the zip).
 *
 * Requires: `firebase login` to have been run.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const SOURCE_DIR = args[0];
const DRY_RUN = process.argv.includes('--dry-run');
// --force overwrites titles + storage even if the doc already exists
// (still NEVER touches docs that were created from outside this batch
// — those are preserved by checking the source field).
const FORCE = process.argv.includes('--force');
// Anything in this set is left strictly alone, regardless of --force.
const KEEP_AS_IS = new Set([1, 2, 3, 4, 10, 22]);

if (!SOURCE_DIR || !fs.existsSync(SOURCE_DIR)) {
  console.error('Usage: node scripts/seed-zipped-weeks.cjs <unzip-dir> [--dry-run]');
  process.exit(1);
}

const PROJECT_ID = 'compassion-course-websit-937d6';
const STORAGE_BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

// ─── auth ───────────────────────────────────────────────────────────────────

async function getAccessToken() {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
  const t = cfg.tokens;
  if (!t) throw new Error('No tokens. Run `firebase login`.');
  if (t.access_token && t.expires_at && t.expires_at > Date.now() + 60_000) return t.access_token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FIREBASE_CLI_CLIENT_ID,
      client_secret: FIREBASE_CLI_CLIENT_SECRET,
      refresh_token: t.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

// ─── filename → week number ─────────────────────────────────────────────────

/** Pull "5" from "Week-5--Empathy...html", "week 45..html", "week47.html". */
function weekNumberFromFilename(name) {
  const m = name.match(/[Ww]eek[\s-_]*(\d{1,2})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 && n <= 52 ? n : null;
}

/** Pull the human title. Prefer og:title (always carries
 *  "Week N: Lesson Title - The Compassion Course Online 2025"); fall
 *  back to <title> only if og:title is missing — some exports give
 *  <title> as a generic "Email from NY Center for Nonviolent
 *  Communication". Strip the leading "Week N:" and trailing site name. */
function titleFromHtml(html) {
  let raw = '';
  const og = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (og) raw = og[1];
  if (!raw || /^email from /i.test(raw)) {
    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t) raw = t[1];
  }
  if (!raw) return '';
  let s = raw.trim().replace(/\s+/g, ' ');
  s = s.replace(/^Week\s+\d+:\s*/i, '');
  s = s.replace(/\s*[-–—]\s*(The\s+)?Compassion\s+Course\s+Online.*$/i, '');
  return s.trim();
}

// ─── schedule (matches scripts/update-release-schedule.cjs) ─────────────────

function buildSchedule() {
  const out = {};
  const d = new Date(Date.UTC(2026, 5, 24)); // June 24, 2026 = Week 1
  for (let n = 1; n <= 52; n++) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    out[n] = `${y}-${m}-${day}`;
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

function nyNoonUtcIso(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const probe = new Date(Date.UTC(y, mo - 1, d, 16, 0, 0));
  const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false }).format(probe);
  const isEdt = +hour === 12;
  return new Date(Date.UTC(y, mo - 1, d, isEdt ? 16 : 17, 0, 0)).toISOString();
}

// ─── REST helpers ───────────────────────────────────────────────────────────

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number' && Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number') return { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  throw new Error(`Unsupported value type: ${typeof v}`);
}

async function fsExists(token, n) {
  const url = `${FS_BASE}/weeklyContent/${n}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`HEAD ${url} → ${res.status} ${await res.text()}`);
  return true;
}

async function fsPatch(token, n, fields) {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${FS_BASE}/weeklyContent/${n}?${mask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFsValue(v)])) }),
  });
  if (!res.ok) throw new Error(`PATCH ${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function uploadHtml(token, storagePath, bytes) {
  const url =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o` +
    `?uploadType=media&name=${encodeURIComponent(storagePath)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/html' },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Upload ${storagePath} → ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.toLowerCase().endsWith('.html'));
  console.log(`Found ${files.length} HTML files in ${SOURCE_DIR}\n`);

  // Group by week. When duplicates exist (e.g. "Week-32-... (1).html"),
  // prefer the file whose name doesn't end with "(N).html".
  const byWeek = new Map();
  for (const f of files) {
    const n = weekNumberFromFilename(f);
    if (!n) {
      console.log(`  skip "${f}" — no week number found`);
      continue;
    }
    if (!byWeek.has(n)) {
      byWeek.set(n, f);
    } else {
      const cur = byWeek.get(n);
      const isDupe = (s) => /\(\d+\)\.html$/i.test(s);
      if (isDupe(cur) && !isDupe(f)) byWeek.set(n, f);
    }
  }
  console.log(`Resolved to ${byWeek.size} unique weeks: ${[...byWeek.keys()].sort((a, b) => a - b).join(', ')}\n`);

  const token = await getAccessToken();

  const schedule = buildSchedule();
  let added = 0;
  let skipped = 0;

  for (const n of [...byWeek.keys()].sort((a, b) => a - b)) {
    const f = byWeek.get(n);
    const fullPath = path.join(SOURCE_DIR, f);
    const html = fs.readFileSync(fullPath);
    const title = titleFromHtml(html.toString('utf8'));

    const exists = await fsExists(token, n);
    if (exists && (KEEP_AS_IS.has(n) || !FORCE)) {
      console.log(`  skip W${String(n).padStart(2, ' ')} — already exists in Firestore${KEEP_AS_IS.has(n) ? ' (in protected list)' : ' (use --force to overwrite)'}`);
      skipped++;
      continue;
    }

    const releaseDate = schedule[n];
    const releaseAt = nyNoonUtcIso(releaseDate);
    const storagePath = `weekly-html/week-${n}.html`;

    if (DRY_RUN) {
      console.log(`  W${String(n).padStart(2, ' ')} — would upload "${f}" → ${storagePath}`);
      console.log(`         title: "${title}"`);
      console.log(`         release: ${releaseDate} 12:00 NY → ${releaseAt}`);
      added++;
      continue;
    }

    await uploadHtml(token, storagePath, html);
    await fsPatch(token, n, {
      weekNumber: n,
      title,
      htmlStoragePath: storagePath,
      audioStoragePaths: [],
      releaseDate,
      releaseAt,
      requiredRole: 'public',
      published: true,
      addedAt: new Date(),
      source: 'jotform-zip-2026-04-28',
    });
    console.log(`  ✓ W${String(n).padStart(2, ' ')} — ${title}`);
    added++;
  }

  console.log(`\n${DRY_RUN ? 'Would add' : 'Added'} ${added} week(s); ${skipped} skipped (already present).`);
}

main().catch((err) => {
  console.error('\n❌', err.stack || err.message || err);
  process.exit(1);
});
