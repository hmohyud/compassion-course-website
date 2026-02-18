#!/usr/bin/env node
/**
 * Generates public/js/firebase-config.js from .env at build time.
 * Ensures ONE source of truth - no hardcoded API keys in repo.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');
const outPath = join(root, 'public', 'js', 'firebase-config.js');

function loadEnv() {
  const vars = { ...process.env };
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return vars;
}

const env = loadEnv();
const apiKey = env.VITE_FIREBASE_API_KEY;
const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = env.VITE_FIREBASE_APP_ID;
const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID;

if (!apiKey || apiKey.includes('YOUR_')) {
  console.warn('⚠️  VITE_FIREBASE_API_KEY missing in .env - firebase-config.js will have placeholder');
}

const config = `// Auto-generated from .env - do not edit. Run: npm run dev or npm run build
// Firebase Configuration - single source of truth via Vite env vars
const firebaseConfig = {
  apiKey: "${apiKey || ''}",
  authDomain: "${authDomain || ''}",
  projectId: "${projectId || ''}",
  storageBucket: "${storageBucket || ''}",
  messagingSenderId: "${messagingSenderId || ''}",
  appId: "${appId || ''}",
  measurementId: "${measurementId || ''}"
};

let app, db, auth;

function initFirebase() {
  if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    window.db = db;
    window.auth = auth;
    console.log('Firebase initialized (legacy pages)');
    return true;
  }
  return false;
}

if (!initFirebase()) {
  window.addEventListener('load', initFirebase);
}
`;

mkdirSync(join(root, 'public', 'js'), { recursive: true });
writeFileSync(outPath, config, 'utf8');
console.log('Generated public/js/firebase-config.js from .env');
