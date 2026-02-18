import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  setLogLevel as setFirestoreLogLevel,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getFunctions, type Functions } from "firebase/functions";

// Firebase config - ONLY from Vite env vars (single source of truth)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Runtime sanity check (safe - does NOT throw)
console.log(
  "Firebase apiKey in use:",
  firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 12)}...` : "(undefined)"
);

// Decide when Firebase is “configured enough” to initialize
export const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  !String(firebaseConfig.apiKey).includes("YOUR_") &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.appId;

if (!isFirebaseConfigured) {
  console.warn(
    "[firebase] Missing/invalid env vars; running with Firebase disabled (UI-only mode). " +
      "Set VITE_FIREBASE_* values in .env to enable auth/db."
  );
}

// Initialize Firebase ONLY if configured (and only once)
export const app: FirebaseApp | null = isFirebaseConfigured
  ? (getApps().length > 0 ? (getApps()[0] as FirebaseApp) : initializeApp(firebaseConfig))
  : null;

if (app && getApps().length === 1) {
  console.log("Firebase init:", {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
  });
}

// Export services as nullable when Firebase is disabled
export const auth: Auth | null = app ? getAuth(app) : null;

export const db: Firestore | null = app ? getFirestore(app) : null;
if (db) setFirestoreLogLevel("error");

export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

export const functions: Functions | null = app ? getFunctions(app, "us-central1") : null;

// Only initialize analytics in browser and if measurementId is provided
export const analytics: Analytics | null =
  app && typeof window !== "undefined" && firebaseConfig.measurementId
    ? getAnalytics(app)
    : null;

export default app;