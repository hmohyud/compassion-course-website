import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getFunctions } from "firebase/functions";

// Firebase config - using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log('🏛️ Initializing Firebase for Compassion Course');
console.log('🔧 Firebase config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
  storageBucket: firebaseConfig.storageBucket
});

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Missing Firebase env vars. Ensure VITE_FIREBASE_* are set at build time.');
  console.error('Required variables:', {
    VITE_FIREBASE_API_KEY: !!firebaseConfig.apiKey,
    VITE_FIREBASE_PROJECT_ID: !!firebaseConfig.projectId,
    VITE_FIREBASE_AUTH_DOMAIN: !!firebaseConfig.authDomain
  });
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Only initialize analytics in browser and if measurementId is provided
export const analytics = (typeof window !== 'undefined' && firebaseConfig.measurementId)
  ? getAnalytics(app)
  : undefined as unknown as ReturnType<typeof getAnalytics>;

console.log('✅ Firebase services initialized for Compassion Course');

export default app;
