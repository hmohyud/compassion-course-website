#!/usr/bin/env node
/**
 * Seed weekly content to Firebase using the Firebase CLI's stored credentials.
 * No service-account key required — reads firebase-tools' configstore and uses
 * its access_token (refreshing via refresh_token if needed) against the GCS
 * JSON API and Firestore REST API directly.
 *
 * Usage:
 *   node scripts/seed-weekly-content-cli-auth.cjs [--dry-run]
 *
 * Requires: `firebase login` to have been run recently.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = 'compassion-course-websit-937d6';
const STORAGE_BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';
const SOURCE_DIR = path.resolve('C:/Users/hyder/Desktop/cc-weekly-emails');

// Firebase CLI's public OAuth client (embedded in firebase-tools source).
// Used only to refresh the stored access token when it expires.
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const RELEASE_DATES = {
  1:  '2025-12-29', 2:  '2026-01-05', 3:  '2026-01-12', 4:  '2026-01-19',
  10: '2026-03-02', 22: '2026-05-25',
};
const WEEK_TITLES = {
  1:  'Everything We Do, We Do to Meet a Need',
  2:  'Most of Us Were Taught Something Else',
  3:  'We Are All Equipped with Onboard Need Radar',
  4:  "What's the Big Deal with Needs?",
  10: "What Empathy Is… and What It's Not",
  22: 'The Power of Thanks — More About Appreciation',
};

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.mp3':  'audio/mpeg',
  '.css':  'text/css',
  '.js':   'application/javascript',
};

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
  if (!tokens.refresh_token) throw new Error('Access token expired and no refresh_token available. Run `firebase login --reauth`.');

  console.log('Refreshing access token…');
  const body = new URLSearchParams({
    client_id: FIREBASE_CLI_CLIENT_ID,
    client_secret: FIREBASE_CLI_CLIENT_SECRET,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ─── Storage (GCS JSON API) ─────────────────────────────────────────────────

async function uploadFile(token, localPath, storagePath) {
  const contentType = CONTENT_TYPES[path.extname(localPath).toLowerCase()] || 'application/octet-stream';
  if (DRY_RUN) {
    console.log(`  [DRY] upload ${path.basename(localPath)} → ${storagePath} (${contentType})`);
    return;
  }
  const data = fs.readFileSync(localPath);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body: data,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${storagePath}): ${res.status} ${await res.text()}`);
  }
}

// ─── Firestore REST ─────────────────────────────────────────────────────────

function firestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v))
    return { arrayValue: { values: v.map(firestoreValue) } };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'object') {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = firestoreValue(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

async function firestoreSet(token, docPath, data) {
  if (DRY_RUN) {
    console.log(`  [DRY] firestore set ${docPath}`);
    return;
  }
  const fields = {};
  for (const k of Object.keys(data)) fields[k] = firestoreValue(data[k]);
  // PATCH with updateMask forces upsert (creates or merges into doc)
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}?${mask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    throw new Error(`Firestore set failed (${docPath}): ${res.status} ${await res.text()}`);
  }
}

async function firestoreGet(token, docPath) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore get failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + (DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ==='));
  console.log(`Source: ${SOURCE_DIR}`);

  const token = await getAccessToken();
  console.log('✅ Got access token from Firebase CLI configstore');

  // Discover source files
  const htmlFiles = fs.readdirSync(SOURCE_DIR)
    .filter((f) => /^week_\d+\.html$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
  const audioDir = path.join(SOURCE_DIR, 'audio');
  const audioFiles = fs.existsSync(audioDir)
    ? fs.readdirSync(audioDir).filter((f) => f.endsWith('.mp3'))
    : [];
  const stylesPath = path.join(SOURCE_DIR, 'styles.css');
  const scriptPath = path.join(SOURCE_DIR, 'script.js');
  const hasStyles = fs.existsSync(stylesPath);
  const hasScript = fs.existsSync(scriptPath);

  console.log(`Found: ${htmlFiles.length} HTML, ${audioFiles.length} audio, styles=${hasStyles}, script=${hasScript}\n`);
  if (!hasStyles || !hasScript) throw new Error('Missing styles.css or script.js in source folder.');

  // 1. Shared assets
  console.log('── Shared assets ──');
  await uploadFile(token, stylesPath, 'weekly-assets/styles.css');
  console.log('  ✓ styles.css');
  await uploadFile(token, scriptPath, 'weekly-assets/script.js');
  console.log('  ✓ script.js\n');

  // 2. Audio files (parallel in batches of 8 to avoid choking the connection)
  console.log(`── Audio (${audioFiles.length} files) ──`);
  const batch = 8;
  for (let i = 0; i < audioFiles.length; i += batch) {
    const chunk = audioFiles.slice(i, i + batch);
    await Promise.all(chunk.map(async (f) => {
      await uploadFile(token, path.join(audioDir, f), `weekly-audio/${f}`);
      console.log(`  ✓ ${f}`);
    }));
  }
  console.log();

  // 3. HTML files + Firestore docs
  console.log('── Week pages + Firestore metadata ──');
  const audioStoragePaths = audioFiles.map((f) => `weekly-audio/${f}`);

  for (const htmlName of htmlFiles) {
    const n = parseInt(htmlName.match(/(\d+)/)[0], 10);
    const storagePath = `weekly-html/week-${n}.html`;
    await uploadFile(token, path.join(SOURCE_DIR, htmlName), storagePath);

    // Firestore metadata doc
    const docPath = `weeklyContent/${n}`;
    const existing = DRY_RUN ? null : await firestoreGet(token, docPath);
    const docData = {
      weekNumber: n,
      title: WEEK_TITLES[n] || `Week ${n}`,
      htmlStoragePath: storagePath,
      audioStoragePaths,
      releaseDate: RELEASE_DATES[n] || '2026-12-21',
      requiredRole: 'admin',
      published: true,
      updatedAt: new Date(),
      updatedBy: 'seed-weekly-content-cli-auth.cjs',
    };
    if (!existing) docData.createdAt = new Date();
    await firestoreSet(token, docPath, docData);
    console.log(`  ✓ week ${n} (HTML uploaded, Firestore doc ${existing ? 'updated' : 'created'})`);
  }

  console.log('\n' + (DRY_RUN ? '=== DRY RUN COMPLETE — no changes made ===' : '=== ✅ SEED COMPLETE ==='));
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
