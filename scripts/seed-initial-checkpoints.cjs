#!/usr/bin/env node
/**
 * One-time backfill: give every weekly lesson a "Baseline" checkpoint capturing
 * its CURRENT live HTML, so each week has a revert point from day one.
 *
 * Writes to Firestore subcollection  weeklyContent/{n}/checkpoints/{autoId}
 * reading the live HTML from Storage  weekly-html/week-{n}.html.
 *
 * Uses the Firebase CLI stored OAuth token (same mechanism as
 * reupload-styles-css.cjs / upload-customized-lessons.py). That token
 * authenticates as the project owner, so it bypasses security rules — this
 * can run before the firestore.rules checkpoint block is even deployed.
 *
 * Idempotent: skips any week that already has at least one checkpoint.
 *
 * Usage:
 *   node scripts/seed-initial-checkpoints.cjs [--dry-run] [--week=1,2,3]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_ID = 'compassion-course-websit-937d6';
const STORAGE_BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function configstorePath() {
  return path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
}

async function getAccessToken() {
  const cfg = JSON.parse(fs.readFileSync(configstorePath(), 'utf8'));
  const t = cfg.tokens;
  if (!t) throw new Error('No tokens in firebase-tools configstore. Run `firebase login`.');
  const now = Date.now();
  if (t.access_token && t.expires_at && t.expires_at > now + 60_000) return t.access_token;
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

async function weekDocExists(token, n) {
  const res = await fetch(`${FS_BASE}/weeklyContent/${n}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

async function hasCheckpoint(token, n) {
  const res = await fetch(`${FS_BASE}/weeklyContent/${n}/checkpoints?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Array.isArray(data.documents) && data.documents.length > 0;
}

async function fetchLiveHtml(token, n) {
  const objectPath = encodeURIComponent(`weekly-html/week-${n}.html`);
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o/${objectPath}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Storage GET ${res.status}`);
  return await res.text();
}

async function createCheckpoint(token, n, html, title) {
  const body = {
    fields: {
      weekNumber: { integerValue: String(n) },
      html: { stringValue: html },
      title: { stringValue: title },
      note: { stringValue: '' },
      kind: { stringValue: 'baseline' },
      createdAt: { timestampValue: new Date().toISOString() },
      createdBy: { stringValue: 'system (seed)' },
      byteSize: { integerValue: String(Buffer.byteLength(html, 'utf8')) },
    },
  };
  const res = await fetch(`${FS_BASE}/weeklyContent/${n}/checkpoints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firestore POST ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run');
  const onlyArg = args.find((a) => a.startsWith('--week='));
  const only = onlyArg ? onlyArg.split('=')[1].split(',').map((x) => parseInt(x, 10)) : null;

  const token = await getAccessToken();
  const dateLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const title = `Baseline — current live version (${dateLabel})`;

  console.log(`Seeding baseline checkpoints${dry ? ' (DRY RUN)' : ''} — "${title}"\n`);

  let created = 0;
  let skipped = 0;
  let missing = 0;
  for (let n = 1; n <= 52; n++) {
    if (only && !only.includes(n)) continue;
    if (!(await weekDocExists(token, n))) {
      console.log(`  skip W${n} — no weeklyContent doc`);
      missing += 1;
      continue;
    }
    if (await hasCheckpoint(token, n)) {
      console.log(`  skip W${n} — already has a checkpoint`);
      skipped += 1;
      continue;
    }
    let html;
    try {
      html = await fetchLiveHtml(token, n);
    } catch (e) {
      console.log(`  FAIL W${n} — ${e.message}`);
      continue;
    }
    if (dry) {
      console.log(`  W${n} — would seed baseline (${(html.length / 1024).toFixed(1)} KB)`);
      created += 1;
      continue;
    }
    await createCheckpoint(token, n, html, title);
    console.log(`  [ok] W${n} — baseline checkpoint created (${(html.length / 1024).toFixed(1)} KB)`);
    created += 1;
  }

  console.log(
    `\n${dry ? 'Would create' : 'Created'} ${created}; skipped ${skipped} (already had one); ${missing} week(s) had no metadata doc.`,
  );
}

main().catch((err) => {
  console.error('\n❌', err.stack || err.message || err);
  process.exit(1);
});
