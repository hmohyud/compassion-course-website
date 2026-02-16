import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, setLogLevel as setFirestoreLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getFunctions } from "firebase/functions";

// Firebase config - env vars with fallbacks for compassion-course-websit-937d6
// apiKey must match Firebase Console → Project settings → General → Your apps (Web) → SDK setup (case-sensitive)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyAAMFrWpsv1BIAkPIjNjGnV61IkZ8EIeRY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "compassion-course-websit-937d6.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "compassion-course-websit-937d6",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "compassion-course-websit-937d6.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:1087479449158:web:882a39db02a25172322c47",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_")) {
  throw new Error("Firebase apiKey missing/invalid in firebaseConfig. Set VITE_FIREBASE_API_KEY from Firebase Console → Project settings → Your apps (Web).");
}
if (!firebaseConfig.projectId) {
  throw new Error("Firebase projectId missing. Set VITE_FIREBASE_PROJECT_ID.");
}

console.log("Firebase init:", { projectId: firebaseConfig.projectId, authDomain: firebaseConfig.authDomain });

export const app = initializeApp(firebaseConfig);
console.log("[firebase] apps:", getApps().map((a) => a.name), "project:", app.options.projectId);

export const auth = getAuth(app);
export const db = getFirestore(app);
setFirestoreLogLevel('error');
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Only initialize analytics in browser and if measurementId is provided
export const analytics = (typeof window !== 'undefined' && firebaseConfig.measurementId)
  ? getAnalytics(app)
  : undefined as unknown as ReturnType<typeof getAnalytics>;

export default app;
