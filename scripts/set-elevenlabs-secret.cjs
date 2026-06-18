#!/usr/bin/env node
/**
 * Store the ElevenLabs API key as a Firebase Functions secret
 * (Google Secret Manager) named ELEVENLABS_API_KEY.
 *
 * The key is read from your local .env and piped straight to the Firebase
 * CLI's stdin. It is NEVER printed, hard-coded, logged, or sent anywhere
 * except your own Firebase project's Secret Manager.
 *
 * Run:  node scripts/set-elevenlabs-secret.cjs
 *
 * Override the .env location if needed:
 *   ELEVENLABS_ENV_PATH="C:/path/to/.env" node scripts/set-elevenlabs-secret.cjs
 */

const fs = require('fs');
const { spawnSync } = require('child_process');

const ENV_PATH = process.env.ELEVENLABS_ENV_PATH || 'C:/Users/hyder/Desktop/cc-weekly-emails/.env';
const PROJECT = 'compassion-course-websit-937d6';
const SECRET = 'ELEVENLABS_API_KEY';

if (!fs.existsSync(ENV_PATH)) {
  console.error('Could not find .env at: ' + ENV_PATH);
  console.error('Set ELEVENLABS_ENV_PATH to point at the right file and re-run.');
  process.exit(1);
}

const line = fs
  .readFileSync(ENV_PATH, 'utf8')
  .split(/\r?\n/)
  .find((l) => /^\s*ELEVENLABS_API_KEY\s*=/.test(l));

if (!line) {
  console.error('No ELEVENLABS_API_KEY=... line found in ' + ENV_PATH);
  process.exit(1);
}

const key = line
  .replace(/^\s*ELEVENLABS_API_KEY\s*=\s*/, '')
  .trim()
  .replace(/^["']|["']$/g, '');

if (!key) {
  console.error('ELEVENLABS_API_KEY is present but empty in ' + ENV_PATH);
  process.exit(1);
}

// Only the length is logged — never the value.
console.log('Read ELEVENLABS_API_KEY from .env (' + key.length + ' chars).');
console.log('Storing it in Firebase Secret Manager as "' + SECRET + '" (project ' + PROJECT + ')…\n');

// `firebase functions:secrets:set NAME --data-file -` reads the value from
// stdin, so the key never appears on the command line / process list.
const res = spawnSync(
  'npx firebase functions:secrets:set ' + SECRET + ' --project ' + PROJECT + ' --data-file -',
  { input: key, stdio: ['pipe', 'inherit', 'inherit'], shell: true },
);

if (res.status === 0) {
  console.log('\n✅ Secret "' + SECRET + '" stored. The Cloud Function will read it at runtime via defineSecret().');
} else {
  console.error('\n❌ Failed (exit ' + res.status + ').');
  console.error('If your Firebase CLI version rejects "--data-file -", run this instead and paste the key from your .env:');
  console.error('  firebase functions:secrets:set ' + SECRET + ' --project ' + PROJECT);
}
process.exit(res.status == null ? 1 : res.status);
