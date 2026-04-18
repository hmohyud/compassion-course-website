#!/usr/bin/env node
/**
 * Set CORS on the Firebase Storage bucket so the React app at
 * compassioncourse.org can fetch files (HTML, audio) via XHR/fetch.
 *
 * Uses Firebase CLI's stored access token (same pattern as seed-weekly-content-cli-auth.cjs).
 * Requires `firebase login` to have been run.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';

const CORS = [{
  origin: [
    'https://compassioncourse.org',
    'https://www.compassioncourse.org',
    'https://compassion-course-websit-937d6.web.app',
    'https://compassion-course-websit-937d6.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  method: ['GET', 'HEAD', 'OPTIONS'],
  responseHeader: [
    'Content-Type',
    'Content-Length',
    'Content-Disposition',
    'Accept-Ranges',
    'Content-Range',
    'Cache-Control',
    'ETag',
    'x-goog-*',
  ],
  maxAgeSeconds: 3600,
}];

const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

async function getAccessToken() {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  const t = cfg.tokens;
  if (t.access_token && t.expires_at > Date.now() + 60000) return t.access_token;
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
  const token = await getAccessToken();
  console.log('✅ Got access token');

  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}?fields=cors`;
  console.log('Setting CORS on bucket', BUCKET);
  console.log(JSON.stringify(CORS, null, 2));

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cors: CORS }),
  });
  if (!res.ok) {
    throw new Error(`CORS set failed: ${res.status} ${await res.text()}`);
  }
  const result = await res.json();
  console.log('\n✅ CORS applied. Current config:');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
