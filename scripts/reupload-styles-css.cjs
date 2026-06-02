#!/usr/bin/env node
/**
 * Re-upload C:\Users\hyder\Desktop\cc-weekly-emails\styles.css to
 * weekly-assets/styles.css in Firebase Storage. Uses the Firebase CLI
 * stored access token (no service account needed).
 *
 * Run after editing cc-weekly-emails/styles.css — the change becomes
 * live for every weekly lesson without re-seeding lessons.
 *
 * Usage: node scripts/reupload-styles-css.cjs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const STORAGE_BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';
const SOURCE_FILE = path.resolve('C:/Users/hyder/Desktop/cc-weekly-emails/styles.css');
const STORAGE_PATH = 'weekly-assets/styles.css';

const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

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

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) throw new Error(`Source not found: ${SOURCE_FILE}`);
  const bytes = fs.readFileSync(SOURCE_FILE);
  const token = await getAccessToken();

  const url =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o` +
    `?uploadType=media&name=${encodeURIComponent(STORAGE_PATH)}`;

  console.log(`Uploading ${SOURCE_FILE}`);
  console.log(`  → gs://${STORAGE_BUCKET}/${STORAGE_PATH} (${bytes.length} bytes)`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/css',
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  const result = await res.json();
  console.log(`\nUpload complete. generation=${result.generation}, md5=${result.md5Hash}`);
  console.log('All weekly lessons will pick up the new styles.css on their next');
  console.log('signed-URL fetch. Existing viewer sessions may see the old CSS');
  console.log('until their cached signed URL expires.');
}

main().catch((err) => {
  console.error('\n❌', err.stack || err.message || err);
  process.exit(1);
});
