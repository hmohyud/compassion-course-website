/**
 * Fix:
 * 1. Add Antonio Espinoza to English Team (he appears in both English & Spanish on original site)
 * 2. Make guest trainers count even (currently 6 — already even, but verify)
 *
 * Run: node scripts/fix-antonio-and-trainers.cjs
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

const PROJECT_ID = 'compassion-course-websit-937d6';

function getRefreshToken() {
  const configPath = path.join(require('os').homedir(), '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.tokens?.refresh_token;
}

function exchangeRefreshToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    }).toString();
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, (res) => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => { const j = JSON.parse(body); j.access_token ? resolve(j.access_token) : reject(body); });
    });
    req.write(data); req.end();
  });
}

function firestoreRequest(accessToken, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${urlPath}`,
      method,
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    };
    const req = https.request(options, (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`Firestore ${res.statusCode}: ${data.slice(0, 500)}`));
        else resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function listDocuments(accessToken, collection) {
  const result = await firestoreRequest(accessToken, 'GET', `/${collection}?pageSize=500`, null);
  return result.documents || [];
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { integerValue: String(val) };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
  }
  const now = new Date().toISOString();
  fields.createdAt = { timestampValue: now };
  fields.updatedAt = { timestampValue: now };
  fields.updatedBy = { stringValue: 'migration-script' };
  return { fields };
}

async function main() {
  console.log('=== Fix Antonio + Verify Guest Trainers ===\n');

  const refreshToken = getRefreshToken();
  const accessToken = await exchangeRefreshToken(refreshToken);
  console.log('✅ Got access token\n');

  const allMembers = await listDocuments(accessToken, 'teamMembers');

  // Find Antonio's Spanish Team entry to get his photo URL
  let antonioPhoto = '';
  let antonioBio = '';
  let antonioInEnglish = false;

  for (const doc of allMembers) {
    const name = doc.fields?.name?.stringValue;
    const section = doc.fields?.teamSection?.stringValue;
    if (name === 'Antonio Espinoza') {
      if (section === 'Spanish Team') {
        antonioPhoto = doc.fields?.photo?.stringValue || '';
        antonioBio = doc.fields?.bio?.stringValue || '';
      }
      if (section === 'English Team') {
        antonioInEnglish = true;
      }
    }
  }

  // 1. Add Antonio to English Team if not already there
  if (!antonioInEnglish) {
    console.log('Adding Antonio Espinoza to English Team...');
    const doc = toFirestoreDoc({
      name: 'Antonio Espinoza',
      role: 'Compassion Course Spanish Team Leader, Assistant Director, NYCNVC',
      bio: antonioBio,
      photo: antonioPhoto,
      contact: 'antonio@nycnvc.org',
      teamSection: 'English Team',
      order: 1, // After Thom Bond (0), before Clara (will be 2), Doreen (3)
      isActive: true,
    });
    await firestoreRequest(accessToken, 'POST', '/teamMembers', doc);
    console.log('✅ Antonio added to English Team\n');

    // Now fix Clara and Doreen ordering
    for (const d of allMembers) {
      const name = d.fields?.name?.stringValue;
      const section = d.fields?.teamSection?.stringValue;
      if (section !== 'English Team') continue;

      const docPath = d.name.replace(`projects/${PROJECT_ID}/databases/(default)/documents/`, '');
      if (name === 'Clara Moisello, PhD') {
        console.log('  Updating Clara order to 2');
        await firestoreRequest(accessToken, 'PATCH',
          `/${docPath}?updateMask.fieldPaths=order&updateMask.fieldPaths=updatedAt`,
          { fields: { order: { integerValue: '2' }, updatedAt: { timestampValue: new Date().toISOString() } } }
        );
      } else if (name === 'Doreen Poulin') {
        console.log('  Updating Doreen order to 3');
        await firestoreRequest(accessToken, 'PATCH',
          `/${docPath}?updateMask.fieldPaths=order&updateMask.fieldPaths=updatedAt`,
          { fields: { order: { integerValue: '3' }, updatedAt: { timestampValue: new Date().toISOString() } } }
        );
      }
    }
  } else {
    console.log('Antonio already in English Team ✓\n');
  }

  // 2. Verify Guest Trainers count
  const guestCount = allMembers.filter(d =>
    d.fields?.teamSection?.stringValue === 'Guest Trainers' &&
    d.fields?.isActive?.booleanValue !== false
  ).length;
  console.log(`\nGuest Trainers count: ${guestCount} (${guestCount % 2 === 0 ? 'even ✅' : 'odd ⚠️'})`);

  // 3. Final verification
  console.log('\n=== Final State ===');
  const finalMembers = await listDocuments(accessToken, 'teamMembers');
  const sections = {};
  for (const doc of finalMembers) {
    const section = doc.fields?.teamSection?.stringValue || '(unknown)';
    const name = doc.fields?.name?.stringValue;
    const active = doc.fields?.isActive?.booleanValue;
    if (active === false) continue;
    if (!sections[section]) sections[section] = [];
    sections[section].push(name);
  }
  for (const [section, members] of Object.entries(sections)) {
    console.log(`\n${section} (${members.length}):`);
    members.forEach(m => console.log(`  - ${m}`));
  }
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
