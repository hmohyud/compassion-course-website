/**
 * Fix team data in Firestore:
 * 1. Delete old "English" section, keep "English Team"
 * 2. Move Thom Bond & Clara Moisello from "English" to "English Team"
 * 3. Move Antonio Espinoza from "English Team" to "Spanish Team" (he's Spanish Team Leader)
 * 4. Add 6 test Guest Trainers
 * 5. Fix any duplicate issues
 *
 * Run: node scripts/fix-team-data.cjs
 */

const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PROJECT_ID = 'compassion-course-websit-937d6';
const STORAGE_BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';

// ============================================================
// Auth helpers
// ============================================================

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
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        const json = JSON.parse(body);
        if (json.access_token) resolve(json.access_token);
        else reject(new Error('Token exchange failed: ' + body));
      });
    });
    req.write(data);
    req.end();
  });
}

// ============================================================
// Firestore REST helpers
// ============================================================

function firestoreRequest(accessToken, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${urlPath}`,
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Firestore ${res.statusCode}: ${data.slice(0, 500)}`));
        } else {
          resolve(JSON.parse(data));
        }
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

async function createDocument(accessToken, collection, data) {
  const doc = toFirestoreDoc(data);
  return firestoreRequest(accessToken, 'POST', `/${collection}`, doc);
}

function getDocId(doc) {
  return doc.name.split('/').pop();
}

function getDocPath(doc) {
  return doc.name.replace(`projects/${PROJECT_ID}/databases/(default)/documents/`, '');
}

// ============================================================
// Storage helper for Guest Trainer placeholder photos
// ============================================================

function generatePlaceholderAvatar(initials, bgColor) {
  // Create a simple SVG avatar
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="${bgColor}" rx="100"/>
    <text x="100" y="115" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="72" font-weight="bold">${initials}</text>
  </svg>`;
  return Buffer.from(svg, 'utf-8');
}

function uploadToStorage(accessToken, storagePath, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const encodedPath = encodeURIComponent(storagePath);
    const token = crypto.randomUUID();

    const options = {
      hostname: 'firebasestorage.googleapis.com',
      path: `/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodedPath}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': contentType,
        'Content-Length': buffer.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`Storage ${res.statusCode}: ${data.slice(0, 300)}`));
        }
        const metaOptions = {
          hostname: 'firebasestorage.googleapis.com',
          path: `/v0/b/${STORAGE_BUCKET}/o/${encodedPath}`,
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        };
        const metaReq = https.request(metaOptions, (metaRes) => {
          let metaData = '';
          metaRes.on('data', (c) => metaData += c);
          metaRes.on('end', () => {
            const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${token}`;
            resolve(downloadUrl);
          });
        });
        metaReq.write(JSON.stringify({ metadata: { firebaseStorageDownloadTokens: token } }));
        metaReq.end();
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

// ============================================================
// Guest Trainer test data
// ============================================================

const GUEST_TRAINERS = [
  {
    name: 'Marshall B. Rosenberg',
    role: 'Founder of Nonviolent Communication',
    bio: 'Dr. Marshall Rosenberg was an American psychologist who developed Nonviolent Communication (NVC), a process of communication that helps people exchange information necessary to resolve conflicts and differences peacefully.',
    initials: 'MR',
    color: '#0d9488',
    order: 0,
  },
  {
    name: 'Robert Gonzales',
    role: 'International NVC Trainer & Author',
    bio: 'Robert Gonzales, PhD, is an internationally recognized trainer of Nonviolent Communication with over 30 years of experience. He developed Living Compassion, an approach that integrates NVC with mindfulness and spiritual practice.',
    initials: 'RG',
    color: '#7c3aed',
    order: 1,
  },
  {
    name: 'Miki Kashtan',
    role: 'NVC Trainer & Facilitator',
    bio: 'Miki Kashtan was a co-founder of Bay Area Nonviolent Communication and an international NVC trainer. She was known for her work on power dynamics, collaboration, and social transformation through compassionate communication.',
    initials: 'MK',
    color: '#dc2626',
    order: 2,
  },
  {
    name: 'Sarah Peyton',
    role: 'Neuroscience & NVC Educator',
    bio: 'Sarah Peyton is a certified trainer of Nonviolent Communication and a neuroscience educator who bridges the gap between relational neuroscience and the practice of NVC, helping people understand the brain science behind empathy and connection.',
    initials: 'SP',
    color: '#ea580c',
    order: 3,
  },
  {
    name: 'Jim Manske',
    role: 'Certified NVC Trainer',
    bio: 'Jim Manske is a certified trainer with the Center for Nonviolent Communication with decades of experience facilitating workshops and retreats worldwide. He specializes in integrating NVC with restorative justice practices.',
    initials: 'JM',
    color: '#2563eb',
    order: 4,
  },
  {
    name: 'Roxy Manning',
    role: 'NVC Trainer & Diversity Consultant',
    bio: 'Dr. Roxy Manning is a clinical psychologist, certified NVC trainer, and diversity consultant who focuses on using NVC to address issues of social justice, equity, and systemic change in organizations and communities.',
    initials: 'RM',
    color: '#059669',
    order: 5,
  },
];

// ============================================================
// Main
// ============================================================

async function fix() {
  console.log('=== Fix Team Data ===\n');

  const refreshToken = getRefreshToken();
  if (!refreshToken) { console.error('No Firebase CLI refresh token.'); process.exit(1); }
  const accessToken = await exchangeRefreshToken(refreshToken);
  console.log('✅ Got access token\n');

  // ---- Fetch current state ----
  const allMembers = await listDocuments(accessToken, 'teamMembers');
  const allSections = await listDocuments(accessToken, 'teamLanguageSections');

  console.log('Current state:');
  console.log(`  ${allMembers.length} team members`);
  console.log(`  ${allSections.length} language sections\n`);

  // Build lookup maps
  const membersByName = {};
  for (const doc of allMembers) {
    const name = doc.fields?.name?.stringValue;
    if (name) {
      if (!membersByName[name]) membersByName[name] = [];
      membersByName[name].push(doc);
    }
  }

  const sectionsByName = {};
  for (const doc of allSections) {
    const name = doc.fields?.name?.stringValue;
    if (name) {
      if (!sectionsByName[name]) sectionsByName[name] = [];
      sectionsByName[name].push(doc);
    }
  }

  // ---- 1. Fix duplicate "English" / "English Team" sections ----
  console.log('--- Step 1: Fix English section duplicate ---');
  if (sectionsByName['English']) {
    for (const doc of sectionsByName['English']) {
      const docPath = getDocPath(doc);
      console.log(`  Deleting old "English" section (${getDocId(doc)})...`);
      await firestoreRequest(accessToken, 'DELETE', `/${docPath}`, null);
      console.log('  ✅ Deleted');
    }
  } else {
    console.log('  No old "English" section found');
  }

  // ---- 2. Fix Thom Bond's teamSection ----
  console.log('\n--- Step 2: Fix Thom Bond teamSection ---');
  if (membersByName['Thom Bond']) {
    for (const doc of membersByName['Thom Bond']) {
      const currentSection = doc.fields?.teamSection?.stringValue;
      if (currentSection !== 'English Team') {
        const docPath = getDocPath(doc);
        console.log(`  Updating Thom Bond: "${currentSection}" → "English Team"`);
        await firestoreRequest(accessToken, 'PATCH',
          `/${docPath}?updateMask.fieldPaths=teamSection&updateMask.fieldPaths=order&updateMask.fieldPaths=updatedAt`,
          {
            fields: {
              teamSection: { stringValue: 'English Team' },
              order: { integerValue: '0' },
              updatedAt: { timestampValue: new Date().toISOString() },
            }
          }
        );
        console.log('  ✅ Updated');
      } else {
        console.log('  Already "English Team" ✓');
      }
    }
  }

  // ---- 3. Fix Clara Moisello's teamSection ----
  console.log('\n--- Step 3: Fix Clara Moisello teamSection ---');
  if (membersByName['Clara Moisello, PhD']) {
    for (const doc of membersByName['Clara Moisello, PhD']) {
      const currentSection = doc.fields?.teamSection?.stringValue;
      if (currentSection !== 'English Team') {
        const docPath = getDocPath(doc);
        console.log(`  Updating Clara Moisello: "${currentSection}" → "English Team"`);
        await firestoreRequest(accessToken, 'PATCH',
          `/${docPath}?updateMask.fieldPaths=teamSection&updateMask.fieldPaths=order&updateMask.fieldPaths=updatedAt`,
          {
            fields: {
              teamSection: { stringValue: 'English Team' },
              order: { integerValue: '1' },
              updatedAt: { timestampValue: new Date().toISOString() },
            }
          }
        );
        console.log('  ✅ Updated');
      } else {
        console.log('  Already "English Team" ✓');
      }
    }
  }

  // ---- 4. Fix Antonio Espinoza — move to Spanish Team ----
  console.log('\n--- Step 4: Move Antonio Espinoza to Spanish Team ---');
  if (membersByName['Antonio Espinoza']) {
    for (const doc of membersByName['Antonio Espinoza']) {
      const currentSection = doc.fields?.teamSection?.stringValue;
      const docPath = getDocPath(doc);
      if (currentSection !== 'Spanish Team') {
        console.log(`  Updating Antonio Espinoza: "${currentSection}" → "Spanish Team", order 0`);
        await firestoreRequest(accessToken, 'PATCH',
          `/${docPath}?updateMask.fieldPaths=teamSection&updateMask.fieldPaths=order&updateMask.fieldPaths=role&updateMask.fieldPaths=updatedAt`,
          {
            fields: {
              teamSection: { stringValue: 'Spanish Team' },
              order: { integerValue: '0' },
              role: { stringValue: 'Compassion Course Spanish Team Leader, Assistant Director, NYCNVC' },
              updatedAt: { timestampValue: new Date().toISOString() },
            }
          }
        );
        console.log('  ✅ Updated');
      } else {
        console.log('  Already "Spanish Team" ✓');
      }
    }
  }

  // ---- 5. Fix Doreen Poulin order (now order 2 after Clara at 1) ----
  console.log('\n--- Step 5: Fix English Team ordering ---');
  if (membersByName['Doreen Poulin']) {
    for (const doc of membersByName['Doreen Poulin']) {
      const docPath = getDocPath(doc);
      console.log('  Setting Doreen Poulin order to 2');
      await firestoreRequest(accessToken, 'PATCH',
        `/${docPath}?updateMask.fieldPaths=order&updateMask.fieldPaths=updatedAt`,
        {
          fields: {
            order: { integerValue: '2' },
            updatedAt: { timestampValue: new Date().toISOString() },
          }
        }
      );
      console.log('  ✅ Updated');
    }
  }

  // Fix Spanish Team ordering: Antonio=0, Celeste=1, Angélica=2
  if (membersByName['Celeste De Vita']) {
    for (const doc of membersByName['Celeste De Vita']) {
      const docPath = getDocPath(doc);
      console.log('  Setting Celeste De Vita order to 1');
      await firestoreRequest(accessToken, 'PATCH',
        `/${docPath}?updateMask.fieldPaths=order&updateMask.fieldPaths=updatedAt`,
        {
          fields: {
            order: { integerValue: '1' },
            updatedAt: { timestampValue: new Date().toISOString() },
          }
        }
      );
      console.log('  ✅ Updated');
    }
  }
  if (membersByName['Angélica Maeireizo Tokeshi']) {
    for (const doc of membersByName['Angélica Maeireizo Tokeshi']) {
      const docPath = getDocPath(doc);
      console.log('  Setting Angélica Maeireizo Tokeshi order to 2');
      await firestoreRequest(accessToken, 'PATCH',
        `/${docPath}?updateMask.fieldPaths=order&updateMask.fieldPaths=updatedAt`,
        {
          fields: {
            order: { integerValue: '2' },
            updatedAt: { timestampValue: new Date().toISOString() },
          }
        }
      );
      console.log('  ✅ Updated');
    }
  }

  // ---- 6. Add 6 Guest Trainers ----
  console.log('\n--- Step 6: Add Guest Trainers ---');
  const existingNames = new Set(Object.keys(membersByName));

  for (const trainer of GUEST_TRAINERS) {
    if (existingNames.has(trainer.name)) {
      console.log(`  ✓ "${trainer.name}" already exists — skipping`);
      continue;
    }

    // Generate SVG avatar and upload
    process.stdout.write(`  📷 "${trainer.name}": generating avatar... `);
    const avatarBuffer = generatePlaceholderAvatar(trainer.initials, trainer.color);
    const safeName = trainer.name.replace(/[^a-zA-Z0-9]/g, '_');
    const storagePath = `team-photos/guest-${safeName}.svg`;
    const photoUrl = await uploadToStorage(accessToken, storagePath, avatarBuffer, 'image/svg+xml');
    console.log('uploaded');

    await createDocument(accessToken, 'teamMembers', {
      name: trainer.name,
      role: trainer.role,
      bio: trainer.bio,
      photo: photoUrl,
      contact: '',
      teamSection: 'Guest Trainers',
      order: trainer.order,
      isActive: true,
    });
    console.log(`  + Created "${trainer.name}" (Guest Trainers)`);
  }

  // ---- Done ----
  console.log('\n=== Verification ===');
  const finalMembers = await listDocuments(accessToken, 'teamMembers');
  const finalSections = await listDocuments(accessToken, 'teamLanguageSections');

  const sectionCounts = {};
  for (const doc of finalMembers) {
    const section = doc.fields?.teamSection?.stringValue || '(unknown)';
    const active = doc.fields?.isActive?.booleanValue;
    if (active !== false) {
      sectionCounts[section] = (sectionCounts[section] || 0) + 1;
    }
  }

  console.log(`\nSections (${finalSections.length}):`);
  for (const doc of finalSections) {
    const name = doc.fields?.name?.stringValue;
    const order = doc.fields?.order?.integerValue;
    const count = sectionCounts[name] || 0;
    console.log(`  [${order}] ${name}: ${count} members`);
  }

  console.log(`\nTotal active members: ${finalMembers.filter(d => d.fields?.isActive?.booleanValue !== false).length}`);
  console.log('\n✅ All fixes applied!');
}

fix().catch(err => { console.error('Failed:', err); process.exit(1); });
