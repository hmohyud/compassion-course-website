#!/usr/bin/env node
/**
 * Seed `members` Firestore collection with the 2026 cohort registrants
 * exported from Jotform. Doc id is the lowercase email so subsequent
 * runs upsert (no duplicates).
 *
 * Usage: node scripts/seed-members.cjs [--dry-run]
 *
 * Requires: `firebase login` to have been run on this machine.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = 'compassion-course-websit-937d6';
const SOURCE_FILE = path.resolve(__dirname, 'data', '2026-cohort-members.json');

const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

// ─── auth ───────────────────────────────────────────────────────────────────

function configstorePath() {
  return path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
}

async function getAccessToken() {
  const cfg = JSON.parse(fs.readFileSync(configstorePath(), 'utf8'));
  const t = cfg.tokens;
  if (!t) throw new Error('No tokens in firebase-tools configstore. Run `firebase login`.');
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

// ─── Firestore REST ─────────────────────────────────────────────────────────

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number' && Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number') return { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  throw new Error(`Unsupported value type: ${JSON.stringify(v)}`);
}

async function patchDoc(token, docId, fields) {
  const safeId = encodeURIComponent(docId);
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${FS_BASE}/members/${safeId}?${mask}`;
  const body = {
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFsValue(v)])),
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const records = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
  console.log(`Loaded ${records.length} member records from ${path.basename(SOURCE_FILE)}`);
  if (DRY_RUN) {
    console.log('\n(dry run — no Firestore writes)\n');
    records.slice(0, 5).forEach((r) => console.log(' ', r.email, '→', r.name || '(no name)'));
    console.log('  ...');
    return;
  }

  const token = await getAccessToken();
  let written = 0;
  for (const r of records) {
    const email = (r.email || '').trim().toLowerCase();
    if (!email) continue;
    const fields = { email };
    if (r.name) fields.name = r.name;
    if (r.tier) fields.tier = r.tier;
    if (r.city) fields.city = r.city;
    if (r.state) fields.state = r.state;
    if (r.country) fields.country = r.country;
    if (typeof r.amount === 'number') fields.amount = r.amount;
    fields.source = r.source || 'jotform';
    fields.addedAt = new Date();
    await patchDoc(token, email, fields);
    written++;
    process.stdout.write(`\r  upserted ${written}/${records.length}…`);
  }
  console.log(`\n✓ Done — ${written} member docs written.`);
}

main().catch((err) => {
  console.error('\n❌', err.stack || err.message || err);
  process.exit(1);
});
