#!/usr/bin/env node
/**
 * Seed the weekly content into Firebase Storage + Firestore.
 *
 * Usage:
 *   node scripts/seed-weekly-content.cjs [--dry-run]
 *
 * Required credentials — one of:
 *   1. A service account JSON at ./service-account-key.json or ./serviceAccountKey.json
 *   2. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
 *   3. `gcloud auth application-default login` (application default credentials)
 *
 * To get a service account key:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   Save as ./service-account-key.json (gitignored).
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = 'compassion-course-websit-937d6';
const STORAGE_BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';
const SOURCE_DIR = path.resolve('C:/Users/hyder/Desktop/cc-weekly-emails');

// Release dates (extend as more weeks are authored). Unlisted weeks default to
// year-end.
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

// ───────────────────────────── credential loading ─────────────────────────────

function initFirebase() {
  const tryPaths = [
    path.resolve('./service-account-key.json'),
    path.resolve('./serviceAccountKey.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  for (const p of tryPaths) {
    try {
      if (!fs.existsSync(p)) continue;
      const sa = JSON.parse(fs.readFileSync(p, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        storageBucket: STORAGE_BUCKET,
        projectId: PROJECT_ID,
      });
      console.log(`✅ Loaded service account from ${p}`);
      return;
    } catch (_) { /* try next */ }
  }

  // Fall back to application default credentials (gcloud)
  try {
    admin.initializeApp({
      storageBucket: STORAGE_BUCKET,
      projectId: PROJECT_ID,
    });
    console.log('✅ Using application default credentials (gcloud)');
  } catch (err) {
    console.error('❌ Could not initialize Firebase Admin SDK.');
    console.error('   Provide credentials via one of:');
    console.error('     - ./service-account-key.json');
    console.error('     - ./serviceAccountKey.json');
    console.error('     - GOOGLE_APPLICATION_CREDENTIALS env var');
    console.error('     - gcloud auth application-default login');
    process.exit(1);
  }
}

initFirebase();
const bucket = admin.storage().bucket();
const db = admin.firestore();

// ─────────────────────────── helpers ───────────────────────────

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.mp3':  'audio/mpeg',
  '.css':  'text/css',
  '.js':   'application/javascript',
};

async function uploadFile(localPath, storagePath) {
  const contentType = CONTENT_TYPES[path.extname(localPath).toLowerCase()] || 'application/octet-stream';
  if (DRY_RUN) {
    console.log(`  [DRY] upload ${localPath} → gs://.../${storagePath} (${contentType})`);
    return;
  }
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: { contentType, cacheControl: 'public, max-age=3600' },
  });
}

async function seedFirestoreDoc(weekNumber, docData) {
  if (DRY_RUN) {
    console.log(`  [DRY] firestore set weeklyContent/${weekNumber}`, JSON.stringify(docData));
    return;
  }
  const ref = db.collection('weeklyContent').doc(String(weekNumber));
  const existing = await ref.get();
  const payload = {
    ...docData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'seed-weekly-content.cjs',
  };
  if (!existing.exists) payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(payload, { merge: true });
}

// ─────────────────────────── main ───────────────────────────

async function main() {
  console.log('\n' + (DRY_RUN ? '=== DRY RUN (no writes) ===' : '=== LIVE RUN ==='));
  console.log(`Source: ${SOURCE_DIR}\n`);

  // Discover files
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

  if (!hasStyles || !hasScript) {
    console.error('❌ Missing styles.css or script.js in source folder.');
    process.exit(1);
  }

  // 1. Shared assets
  console.log('── Shared assets ──');
  await uploadFile(stylesPath, 'weekly-assets/styles.css');
  await uploadFile(scriptPath, 'weekly-assets/script.js');
  console.log();

  // 2. Audio files
  console.log('── Audio files ──');
  for (const f of audioFiles) {
    await uploadFile(path.join(audioDir, f), `weekly-audio/${f}`);
  }
  console.log();

  // 3. Per-week HTML + Firestore doc
  console.log('── Week pages ──');
  const audioStoragePaths = audioFiles.map((f) => `weekly-audio/${f}`);

  for (const htmlName of htmlFiles) {
    const n = parseInt(htmlName.match(/(\d+)/)[0], 10);
    const storagePath = `weekly-html/week-${n}.html`;
    await uploadFile(path.join(SOURCE_DIR, htmlName), storagePath);
    await seedFirestoreDoc(n, {
      weekNumber: n,
      title: WEEK_TITLES[n] || `Week ${n}`,
      htmlStoragePath: storagePath,
      audioStoragePaths, // assign all audio; admin can narrow per-week later
      releaseDate: RELEASE_DATES[n] || '2026-12-21',
      requiredRole: 'admin',
      published: true,
    });
    console.log(`  ✓ week ${n}`);
  }

  console.log('\n' + (DRY_RUN ? '=== DRY RUN COMPLETE (no changes made) ===' : '=== ✅ SEED COMPLETE ==='));
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
