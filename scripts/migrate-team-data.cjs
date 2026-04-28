/**
 * Migrate team data from compassioncourse.org to Firestore via REST API
 *
 * Run: node scripts/migrate-team-data.cjs
 *
 * Auth: Uses Firebase CLI refresh token from ~/.config/configstore/firebase-tools.json
 */

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PROJECT_ID = 'compassion-course-websit-937d6';
const STORAGE_BUCKET = 'compassion-course-websit-937d6.firebasestorage.app';

// ============================================================
// Get access token from Firebase CLI refresh token
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
// Firestore REST API helpers
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

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { integerValue: String(val) };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
  }
  // Add timestamps
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

async function listDocuments(accessToken, collection) {
  const result = await firestoreRequest(accessToken, 'GET', `/${collection}?pageSize=500`, null);
  return result.documents || [];
}

// ============================================================
// Firebase Storage upload via REST
// ============================================================

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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
        const json = JSON.parse(data);
        // Update metadata to add download token
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
// Team data
// ============================================================

const LANGUAGE_SECTIONS = [
  { name: 'English Team', order: 0 },
  { name: 'Guest Trainers', order: 1 },
  { name: 'German Team', order: 2 },
  { name: 'Arabic Team', order: 3 },
  { name: 'Spanish Team', order: 4 },
  { name: 'Turkish Team', order: 5 },
  { name: 'Portuguese Team', order: 6 },
  { name: 'Polish Team', order: 7 },
  { name: 'Netherlands Team', order: 8 },
];

const TEAM_MEMBERS = [
  // English Team
  {
    name: 'Thom Bond',
    role: 'Compassion Course Author and Lead Trainer, Founder and Director of Education of NYCNVC',
    bio: 'Thom brings 29 years of human potential experience and training experience to his work as an Internationally Certified NVC Trainer. His passion and knowledge of Nonviolent Communication (NVC) combine to create a practical, understandable, humorous, and potentially profound approach for learning and integrating the skills of peacemaking. He is described as concise, inspiring, sincere and optimistic, applying transformational and spiritual ideas and sensibilities to real-life situations. Many of his students become active facilitators, trainers and practitioners.\n\nAs a trainer, speaker, mediator, and coach, Thom has taught tens of thousands of clients, participants, readers and listeners Nonviolent Communication. He has been published or featured in The New York Times, New York Magazine, Yoga Magazine.\n\nHe is a founder and the Director of Education for The New York Center for Nonviolent Communication (NYCNVC), the creator of The Compassion Course, a member of the Communications Coordination Committee for the United Nations and a CNVC IIT trainer.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2017/10/TMB-2018.jpg',
    contact: 'thombond@nycnvc.org',
    teamSection: 'English Team',
    order: 0,
  },
  {
    name: 'Antonio Espinoza',
    role: 'Compassion Course Spanish Team Leader, Assistant Director, NYCNVC',
    bio: "As an Assistant Director at NYCNVC Antonio's communication and outreach work has played a major role in our mission of sharing NVC around the world.\n\nAntonio is currently a Discovery Weekend Facilitator, Integration Program Graduate, Leadership Program participant and a principle member of the Spanish Translation and Coordination team for The Compassion Course Online.\n\nAntonio's ability to both learn and practice NVC serves as a model and as an inspiration for all those who work with him.",
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2017/10/IMG_2522-2.jpg',
    contact: 'antonio@nycnvc.org',
    teamSection: 'English Team',
    order: 1,
  },
  {
    name: 'Doreen Poulin',
    role: 'Compassion Course Assistant Coordinator, Assistant Facilitator, NYCNVC',
    bio: "Doreen dedicated much of her life to helping people of all ages communicate more effectively in her career as a speech-language pathologist in hospital, private, and special education settings.\n\nThe desire to improve her own communication skills brought her to NYCNVC in 2013. She completed the NYCNVC Integration Program, and has gone on to facilitate multiple weekend programs, and co-facilitate NYCNVC Practice Groups.\n\nDoreen has been a member of the Core Team since February 2019 and is currently serving as Thom's executive assistant.",
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2017/10/Doreen-Poulin.jpg',
    contact: 'doreen@nycnvc.net',
    teamSection: 'English Team',
    order: 2,
  },
  // German Team
  {
    name: 'Gabriele Vana',
    role: 'German Language Translation Team Leader, Lead Facilitator',
    bio: 'Gabriele has been studying NVC intensively since 2006 under multiple international teachers including Thom Bond and Marshall B. Rosenberg. She has been facilitating workshops and practice groups since 2009, valuing "connection to the life-serving energy" as the heart of NVC.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2017/10/9e219d42-ff4f-47fc-b972-58caa8d78f19.jpg',
    contact: 'betreuung@mitgefuehl-als-weg.com',
    teamSection: 'German Team',
    order: 0,
  },
  {
    name: 'Sabine Bends',
    role: 'German Language Translation Team Primary Proofreader',
    bio: 'Sabine is a translator and student of Byron Katie\'s The Work and NVC. She asks herself "What would Love do?" and wishes to "live from her heart" in every moment.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2017/10/hs_sabinebends_deutsch.jpg',
    contact: 'betreuung@mitgefuehl-als-weg.com',
    teamSection: 'German Team',
    order: 1,
  },
  // Arabic Team
  {
    name: 'Shahinaz El Hennawi',
    role: 'Compassion Course Arabic Team Leader, Assistant Facilitator',
    bio: 'Shahinaz is a co-active coach with ten years of peacebuilding experience. She discovered NVC in 2010 in Austria and created a partnership with Thom Bond and NYCNVC to bring NVC to the Arab-speaking world. She holds undergraduate and graduate degrees from the University for Peace.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2017/10/67333_345172352311034_6042994648089873584_n.jpg',
    contact: 'arabic_coordinator@nycnvc.org',
    teamSection: 'Arabic Team',
    order: 0,
  },
  {
    name: 'Dina Ali',
    role: 'Compassion Course Arabic Team Translator, Assistant Facilitator',
    bio: 'Dina has been a Website Editor in French, Arabic, and English at Bibliotheca Alexandrina since 2008 and a translator since 2005. She co-launched "Shams Women" with Shahinaz to spread compassion and self-development support.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2019/04/Screen-Shot-2019-04-24-at-11.14.11-AM.png',
    contact: 'arabic_coordinator@nycnvc.org',
    teamSection: 'Arabic Team',
    order: 1,
  },
  {
    name: 'Kholoud Said',
    role: 'Compassion Course Arabic Team Translator',
    bio: 'Kholoud is a Website Editor at Bibliotheca Alexandrina; translator, researcher, civil society trainer and consultant. She is a political and social media activist with special interest in gender issues, holding a BA in English Literature and pursuing an MA in Comparative Literature.',
    photoUrl: null,
    contact: 'arabic_coordinator@nycnvc.org',
    teamSection: 'Arabic Team',
    order: 2,
  },
  {
    name: 'Yasmine Arafa',
    role: 'Compassion Course Arabic Team Translator',
    bio: 'Yasmine holds a law degree from the University of Alexandria. She is a research associate and evaluation consultant in multinational conflict resolution and peace studies, and coordinator of the "Women and Democratic Transition in Egypt" dialogue forum.',
    photoUrl: null,
    contact: 'arabic_coordinator@nycnvc.org',
    teamSection: 'Arabic Team',
    order: 3,
  },
  // Spanish Team
  {
    name: 'Celeste De Vita',
    role: 'Compassion Course Spanish Team Lead Translator',
    bio: 'Celeste is from Argentina. She discovered NVC in 2013 through practice groups and holds a psychology degree from Universidad de Buenos Aires (2014). She has facilitated introductory NVC workshops in communities and organizations.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2017/10/foto-CNV.jpg',
    contact: 'celeste.devita@gmail.com',
    teamSection: 'Spanish Team',
    order: 0,
  },
  {
    name: 'Angélica Maeireizo Tokeshi',
    role: 'Compassion Course Spanish Primary Proofreader',
    bio: 'Angélica discovered NVC in 2012. She holds a postgraduate degree from Waseda University (2005) and has over 10 years lecturing on Biophilic Architecture and researching Mindful Urbanism. She is a consultant on social projects and has facilitated Restorative Justice workshops in Lima, Peru.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2017/10/Me09-264x300.png',
    contact: '',
    teamSection: 'Spanish Team',
    order: 1,
  },
  // Turkish Team
  {
    name: 'Mustafa Tülü',
    role: 'Facilitator and Tech Support',
    bio: 'Mustafa has a background in computer engineering and is a PMP-certified project manager. He has taught project management at the university level. He met NVC in 2015, received training in 2017-2018, and learned from Robert Gonzales. He handles the website, email preparation and delivery for the Turkish course.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2020/10/Mustafa-Tu%CC%88lu%CC%88-Photo.jpg',
    contact: '',
    teamSection: 'Turkish Team',
    order: 0,
  },
  {
    name: 'Nihal Artar',
    role: 'Facilitator and Translator',
    bio: "Nihal studied Communication Sciences at university. Her interest in Nonviolent Communication started by participating in circles between 2015-17. She attended the Compassion Course 3 times.\n\nIn addition to organizing the course in Turkish with Mustafa, they also organize Compassion Course Practice meetings as an appendix to the course. Their learning community is growing day by day with course and practice meetups.",
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2020/10/Nihal-Artar.jpg',
    contact: '',
    teamSection: 'Turkish Team',
    order: 1,
  },
  // Portuguese Team
  {
    name: 'Leticia Penteado',
    role: 'Lead Translator',
    bio: 'Leticia is a Law and Education graduate with a postgraduate degree in Transpersonal Psychology. Since 2010, she has been facilitating conversations using NVC, Mediation, Restorative Justice, and Systemic Constellations. She is a co-founder of Conexão Empática and Comunidade Colar.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2020/10/Picture1.png',
    contact: 'conexaoempatica@gmail.com',
    teamSection: 'Portuguese Team',
    order: 0,
  },
  {
    name: 'Diana de Hollanda',
    role: 'Facilitator and Proofreader',
    bio: 'Diana is the author of the poetry book "Dois que não amor" (2007) and the novel "O Homem dos Patos" (2013). She is a Certified Meditation, Compassion and Mindfulness Teacher, with a Master\'s thesis on mindfulness writing (2012) and a doctorate on "Escrita da atenção plena" (2019). She lived in meditative retreat for 11 months (2012-2013).',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2020/10/1Picture1.png',
    contact: 'escritadoinsight@gmail.com',
    teamSection: 'Portuguese Team',
    order: 1,
  },
  {
    name: 'Igor Savitsky',
    role: 'Tech Support and Collaborator',
    bio: 'Igor is a father of two, a federal attorney, and graduated in both Law and Computer Engineering with a postgraduate degree in Transpersonal Psychology. He is interested in therapies, technology, and history. He is a co-founder of Conexão Empática and first took the course in 2019.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2020/10/2Picture1.png',
    contact: 'conexaoempatica@gmail.com',
    teamSection: 'Portuguese Team',
    order: 2,
  },
  // Polish Team
  {
    name: 'Adam Kusio',
    role: 'Coordinator of Polish Edition',
    bio: 'Adam has 18 years of corporate experience. He is a trainer, mediator, and Restorative Circles facilitator working in the NVC spirit. He supports organizations building constructive relationships based on voluntariness. He organized the Polish edition in 2019 and has led three year-long practice groups.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2020/10/5Picture1.png',
    contact: 'kontakt@praktykawspolczucia.pl',
    teamSection: 'Polish Team',
    order: 0,
  },
  {
    name: 'Agnes Kowalski',
    role: 'Editor and Proofreader',
    bio: 'Agnes discovered NVC when her son was two years old. Eight years into her practice, NVC represents for her "feeling deep from the heart, being in connection with the source of life." She hopes to help Polish children develop beautiful inner lives with openness and consciousness.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2020/10/4Picture1.png',
    contact: 'agnes.kowalski@gmail.com',
    teamSection: 'Polish Team',
    order: 1,
  },
  {
    name: 'Magdalena Macińska',
    role: 'Translator',
    bio: 'Magdalena is a translator and interpreter of English and French to Polish. She is sensitive to the beauty of the Polish language and the spirit of the original text. She translated "The Empathy Factor" (2019) and has completed NVC mediation immersion, dialogue foundations, and Empathy Circles facilitation. She is passionate about conflict support through dialogue.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2020/10/11Picture1.png',
    contact: 'm.macinska@interia.pl',
    teamSection: 'Polish Team',
    order: 2,
  },
  // Netherlands Team
  {
    name: 'Sara Nuytemans',
    role: 'Translator, Trainer, Supervisor and Coordinator of Dutch Course',
    bio: 'Sara discovered NVC in 2012 through Marshall Rosenberg\'s book. She participated in Thom Bond\'s online course in 2016, which deepened her practice. She translated the course for the Dutch-speaking audience and offers offline NVC courses and hypnotherapy support.',
    photoUrl: 'https://compassioncourse.org/wp-content/uploads/2018/10/Sara-2018-03-15.jpg',
    contact: '',
    teamSection: 'Netherlands Team',
    order: 0,
  },
];

// ============================================================
// Main
// ============================================================

async function migrate() {
  console.log('=== Team Data Migration via REST API ===\n');

  // Get access token
  const refreshToken = getRefreshToken();
  if (!refreshToken) { console.error('No Firebase CLI refresh token found. Run "firebase login" first.'); process.exit(1); }
  console.log('Exchanging refresh token for access token...');
  const accessToken = await exchangeRefreshToken(refreshToken);
  console.log('✅ Got access token\n');

  // Check existing data
  console.log('Checking existing Firestore data...');
  const existingMembers = await listDocuments(accessToken, 'teamMembers');
  const existingNames = new Set();
  for (const doc of existingMembers) {
    if (doc.fields?.name?.stringValue) {
      existingNames.add(doc.fields.name.stringValue);
    }
  }
  console.log(`Found ${existingMembers.length} existing team members: ${[...existingNames].join(', ') || '(none)'}`);

  const existingSections = await listDocuments(accessToken, 'teamLanguageSections');
  const existingSectionNames = new Set();
  for (const doc of existingSections) {
    if (doc.fields?.name?.stringValue) {
      existingSectionNames.add(doc.fields.name.stringValue);
    }
  }
  console.log(`Found ${existingSections.length} existing sections: ${[...existingSectionNames].join(', ') || '(none)'}\n`);

  // Create language sections
  console.log('--- Language Sections ---');
  for (const section of LANGUAGE_SECTIONS) {
    if (existingSectionNames.has(section.name)) {
      console.log(`  ✓ "${section.name}" exists`);
      continue;
    }
    await createDocument(accessToken, 'teamLanguageSections', {
      name: section.name,
      order: section.order,
      isActive: true,
    });
    console.log(`  + Created "${section.name}"`);
  }

  // Create team members with photo upload
  console.log('\n--- Team Members ---');
  let created = 0, skipped = 0;

  for (const member of TEAM_MEMBERS) {
    if (existingNames.has(member.name)) {
      console.log(`  ✓ "${member.name}" exists — skipping`);
      skipped++;
      continue;
    }

    let photoUrl = '';

    if (member.photoUrl) {
      try {
        process.stdout.write(`  📷 ${member.name}: downloading photo... `);
        const imageData = await downloadImage(member.photoUrl);
        const urlPath = new URL(member.photoUrl).pathname;
        const filename = decodeURIComponent(path.basename(urlPath));
        const safeName = member.name.replace(/[^a-zA-Z0-9]/g, '_');
        const ts = Date.now();
        const storagePath = `team-photos/temp-${ts}/${ts}-${safeName}_${filename}`;
        const contentType = getContentType(filename);

        process.stdout.write('uploading... ');
        photoUrl = await uploadToStorage(accessToken, storagePath, imageData, contentType);
        console.log('✅');
      } catch (err) {
        console.log(`⚠️ failed: ${err.message}`);
        photoUrl = '/Team/placeholder.png';
      }
    } else {
      photoUrl = '/Team/placeholder.png';
    }

    await createDocument(accessToken, 'teamMembers', {
      name: member.name,
      role: member.role || '',
      bio: member.bio,
      photo: photoUrl,
      contact: member.contact || '',
      teamSection: member.teamSection,
      order: member.order,
      isActive: true,
    });
    console.log(`  + Created "${member.name}" (${member.teamSection})`);
    created++;
  }

  console.log(`\n=== Done ===`);
  console.log(`  Created: ${created} members`);
  console.log(`  Skipped: ${skipped} (already exist)`);
}

migrate().catch(err => { console.error('Failed:', err); process.exit(1); });
