#!/usr/bin/env node
/**
 * Upload the generated per-section narration MP3s to Firebase Storage
 * (weekly-audio/<file>) and set each week's audioStoragePaths in Firestore.
 *
 * Audio filenames are content-addressed (hash of section title + text), so
 * identical sections across weeks share one file. We replicate the exact
 * hashing + chunking from cc-weekly-emails/generate-audio.js so the paths
 * we write match the files the viewer looks up. The "Compassion Course
 * Information" and "Resources" sections are excluded (not narrated).
 *
 * Usage: node scripts/upload-audio.cjs [--dry-run] [--only=1,2,...]
 * Requires: `firebase login`, and generated MP3s in .local-built-audio/.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { JSDOM } = require('C:/Users/hyder/Desktop/cc-weekly-emails/node_modules/jsdom');

const ROOT = path.resolve(__dirname, '..');
const LESSON_DIR = path.join(ROOT, '.local-built-lessons');
const AUDIO_DIR = path.join(ROOT, '.local-built-audio');
const STORAGE_BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';
const PROJECT_ID = 'compassion-course-websit-937d6';
const AUDIO_PREFIX = 'weekly-audio';
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const MAX_CHARS = 4000;

const STRIP_SELECTORS = [
  '.inline-reference-panel', '.inline-ref-trigger', '.breathing-widget',
  '.timer-container', '.journal-area', '.journal-saved', '.journal-footer',
  '.word-count', '.copy-btn', '.section-read-btn', '.section-narrate-btn',
  '.calendar-buttons', '.progress-ring-container', '.rating-slider-container',
  '.needs-panel', '.feelings-panel', '.celebration-overlay',
  '.typewriter-cursor', '.dialogue-controls',
].join(', ');

// ── ported from generate-audio.js (must stay identical) ──────────────────────
function audioHash(title, content) {
  const str = title.toLowerCase().trim() + '::' + content.toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return (h >>> 0).toString(36);
}
function splitAtSentences(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) { chunks.push(remaining); break; }
    const slice = remaining.substring(0, maxChars);
    let splitAt = -1;
    for (let i = slice.length - 1; i > maxChars * 0.3; i--) {
      if ((slice[i] === '.' || slice[i] === '!' || slice[i] === '?') &&
          (i + 1 >= slice.length || slice[i + 1] === ' ')) { splitAt = i + 1; break; }
    }
    if (splitAt === -1) { splitAt = slice.lastIndexOf(' '); if (splitAt === -1) splitAt = maxChars; }
    chunks.push(remaining.substring(0, splitAt).trim());
    remaining = remaining.substring(splitAt).trim();
  }
  return chunks;
}
function sectionFilenames(htmlFile) {
  const doc = new JSDOM(fs.readFileSync(htmlFile, 'utf-8')).window.document;
  const files = [];
  doc.querySelectorAll('.section-card').forEach((card) => {
    if (card.id === 'info' || card.id === 'resources') return;
    const header = card.querySelector('.accordion-header');
    const content = card.querySelector('.accordion-content');
    if (!header || !content) return;
    const sectionName = header.textContent.trim();
    const clone = content.cloneNode(true);
    clone.querySelectorAll(STRIP_SELECTORS).forEach((el) => el.remove());
    const fullText = clone.textContent.replace(/\s+/g, ' ').trim();
    if (!fullText) return;
    const hash = audioHash(sectionName, fullText);
    const chunks = splitAtSentences(fullText, MAX_CHARS);
    if (chunks.length === 1) files.push(hash + '.mp3');
    else chunks.forEach((_, i) => files.push(hash + '_part' + (i + 1) + '.mp3'));
  });
  return files;
}

// ── firebase ─────────────────────────────────────────────────────────────────
async function getAccessToken() {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
  const t = cfg.tokens;
  if (t.access_token && t.expires_at && t.expires_at > Date.now() + 60000) return t.access_token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: FIREBASE_CLI_CLIENT_ID, client_secret: FIREBASE_CLI_CLIENT_SECRET, refresh_token: t.refresh_token, grant_type: 'refresh_token' }).toString(),
  });
  if (!res.ok) throw new Error(`token refresh ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}
async function uploadAudio(token, file) {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o?uploadType=media&name=${encodeURIComponent(AUDIO_PREFIX + '/' + file)}`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'audio/mpeg' }, body: fs.readFileSync(path.join(AUDIO_DIR, file)) });
  if (!res.ok) throw new Error(`upload ${file} → ${res.status} ${await res.text()}`);
}
async function patchAudioPaths(token, week, paths) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/weeklyContent/${week}?updateMask.fieldPaths=audioStoragePaths`;
  const body = JSON.stringify({ fields: { audioStoragePaths: { arrayValue: { values: paths.map((p) => ({ stringValue: p })) } } } });
  const res = await fetch(url, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body });
  if (!res.ok) throw new Error(`patch W${week} → ${res.status} ${await res.text()}`);
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.split('=')[1].split(',').map(Number)) : null;

  // Per-week file lists + global unique set.
  const perWeek = {};
  const allFiles = new Set();
  for (let n = 1; n <= 52; n++) {
    if (n === 48) continue;
    if (only && !only.has(n)) continue;
    const f = path.join(LESSON_DIR, `week-${n}.html`);
    if (!fs.existsSync(f)) continue;
    const files = sectionFilenames(f);
    perWeek[n] = files;
    files.forEach((x) => allFiles.add(x));
  }

  // Only upload files that actually exist locally; warn on any missing.
  const present = [...allFiles].filter((f) => fs.existsSync(path.join(AUDIO_DIR, f)));
  const missing = [...allFiles].filter((f) => !fs.existsSync(path.join(AUDIO_DIR, f)));
  console.log(`Weeks: ${Object.keys(perWeek).length}  unique audio files: ${allFiles.size}  present: ${present.length}  missing locally: ${missing.length}`);
  if (missing.length) console.log('  ! missing (run generate-audio first):', missing.slice(0, 10).join(', ') + (missing.length > 10 ? ' …' : ''));
  if (dry) { console.log('(dry run — nothing uploaded)'); return; }

  const token = await getAccessToken();

  // Upload audio files.
  let up = 0;
  for (const f of present) {
    try { await uploadAudio(token, f); up++; if (up % 20 === 0) console.log(`  uploaded ${up}/${present.length}`); }
    catch (e) { console.error('  [FAIL upload]', f, e.message); }
  }
  console.log(`Uploaded ${up} audio file(s).`);

  // Patch each week's audioStoragePaths (only files that exist).
  let patched = 0;
  for (const n of Object.keys(perWeek).map(Number)) {
    const paths = perWeek[n].filter((f) => fs.existsSync(path.join(AUDIO_DIR, f))).map((f) => `${AUDIO_PREFIX}/${f}`);
    try { await patchAudioPaths(token, n, paths); patched++; console.log(`  [ok] W${String(n).padStart(2)} → ${paths.length} audio paths`); }
    catch (e) { console.error(`  [FAIL patch] W${n}`, e.message); }
  }
  console.log(`Patched audioStoragePaths on ${patched} week(s).`);
}

main().catch((e) => { console.error('\n❌', e.stack || e.message); process.exit(1); });
