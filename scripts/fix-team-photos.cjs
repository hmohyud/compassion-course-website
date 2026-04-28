/**
 * Fix team member photos - download from Squarespace and upload to Firebase Storage
 * Updates existing Firestore documents with correct photo URLs
 *
 * Run: node scripts/fix-team-photos.cjs
 */

const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PROJECT_ID = 'compassion-course-websit-937d6';
const STORAGE_BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';

// Correct photo URLs from compassioncourse.org (Squarespace)
const PHOTO_MAP = {
  'Thom Bond': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1555731607755-MJ7HKVHWPK8TKQTV4NER/TMB-2018.jpg',
  'Antonio Espinoza': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1555731864883-4H8BT1X9G64O4COGYZAV/IMG_2522+2.jpg',
  'Doreen Poulin': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1621281830950-BR9YQE5BME6HZ0IO2ETN/Doreen-Poulin.jpg',
  'Gabriele Vana': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1555969215654-RIVDC8TK7ZE54QXKB894/9e219d42-ff4f-47fc-b972-58caa8d78f19.jpg',
  'Sabine Bends': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1556114798714-XN5VBH9BSCOGM5IMMVJE/hs_sabinebends_deutsch.jpg',
  'Shahinaz El Hennawi': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1556119172733-V53NY4ZJJ8IVDDA0Q2N6/67333_345172352311034_6042994648089873584_n.jpg',
  'Celeste De Vita': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1556119455463-6VVKW2NWUA17Z49DD311/foto-CNV.jpg',
  'Angélica Maeireizo Tokeshi': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1556119489109-87C9BXA173FFCHOBFQU4/Me09-264x300.png',
  'Dina Ali': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1556119072073-8FX1N0J4RDR8G89D8A8R/Screen+Shot+2019-04-24+at+11.14.11+AM.png',
  'Kholoud Said': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1556119271946-IHBKTBKNURDSCWO5K606/Finaeus_1534.jpg',
  'Yasmine Arafa': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/1556118372081-RWR5CGTK3D5YBPDR04QC/Finaeus_1534.jpg',
  'Mustafa Tülü': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/4c5d722f-d50c-4b12-bfb5-2ca7bcbf2aa6/Mustafa+Tu%CC%88lu%CC%88+-+Photo.jpg',
  'Nihal Artar': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/a563437c-6ad9-492b-8345-78f7106d224c/Nihal+Artar.jpg',
  'Leticia Penteado': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/54d814bb-f715-4134-abeb-6f5b68d0996f/Picture1.png',
  'Diana de Hollanda': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/9bea4c8b-2a25-4dc9-8b03-bf1406829558/1Picture1.png',
  'Igor Savitsky': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/4ef3d7f1-f446-49b7-bf87-d0c85a75a301/2Picture1.png',
  'Agnes Kowalski': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/dca5aa8a-9a18-471a-a83c-993a58cd3267/4Picture1.png',
  'Adam Kusio': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/cfdaa84b-7899-4015-aa4d-c6e4e00f6b9a/5Picture1.png',
  'Magdalena Macińska': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/5da39230-4030-4754-a0c7-5c59feb1c212/11Picture1.png',
  'Sara Nuytemans': 'https://images.squarespace-cdn.com/content/v1/5ca4f4d1523958120344a27f/192f58bb-1088-4252-8d99-45c3f6282df1/Sara+2018-03-15.jpg',
};

// ============================================================
// Auth
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
// Firestore REST
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
          reject(new Error(`Firestore ${res.statusCode}: ${data.slice(0, 300)}`));
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

// ============================================================
// Storage
// ============================================================

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
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
        // Set download token metadata
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

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }[ext] || 'image/jpeg';
}

// ============================================================
// Main
// ============================================================

async function fixPhotos() {
  console.log('=== Fix Team Photos ===\n');

  const refreshToken = getRefreshToken();
  if (!refreshToken) { console.error('No Firebase CLI refresh token found.'); process.exit(1); }
  console.log('Getting access token...');
  const accessToken = await exchangeRefreshToken(refreshToken);
  console.log('✅ Got access token\n');

  // Get all existing team members
  console.log('Fetching existing team members...');
  const existingMembers = await listDocuments(accessToken, 'teamMembers');
  console.log(`Found ${existingMembers.length} members in Firestore\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const doc of existingMembers) {
    const name = doc.fields?.name?.stringValue;
    const currentPhoto = doc.fields?.photo?.stringValue || '';
    if (!name) continue;

    const newPhotoUrl = PHOTO_MAP[name];
    if (!newPhotoUrl) {
      console.log(`  ⏭  "${name}" — no photo URL in map, skipping`);
      skipped++;
      continue;
    }

    // Skip if already has a Firebase Storage URL (not placeholder)
    if (currentPhoto.includes('firebasestorage.googleapis.com')) {
      console.log(`  ✓ "${name}" — already has Firebase Storage photo`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  📷 "${name}": downloading... `);
      const imageData = await downloadImage(newPhotoUrl);

      // Get filename from URL
      const urlObj = new URL(newPhotoUrl);
      const filename = decodeURIComponent(path.basename(urlObj.pathname));
      const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
      const ts = Date.now();
      const storagePath = `team-photos/${safeName}_${filename}`;
      const contentType = getContentType(filename);

      process.stdout.write(`uploading (${(imageData.length / 1024).toFixed(0)}KB)... `);
      const firebasePhotoUrl = await uploadToStorage(accessToken, storagePath, imageData, contentType);

      // Update Firestore document
      const docPath = doc.name.replace(`projects/${PROJECT_ID}/databases/(default)/documents/`, '');
      const now = new Date().toISOString();
      await firestoreRequest(accessToken, 'PATCH',
        `/${docPath}?updateMask.fieldPaths=photo&updateMask.fieldPaths=updatedAt`,
        {
          fields: {
            photo: { stringValue: firebasePhotoUrl },
            updatedAt: { timestampValue: now },
          }
        }
      );
      console.log('✅');
      updated++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
}

fixPhotos().catch(err => { console.error('Failed:', err); process.exit(1); });
