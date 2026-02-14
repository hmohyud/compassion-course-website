import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

const COLLECTION_USER_PROFILES = 'userProfiles';

export async function resolveEmailToUserId(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const ref = collection(db, COLLECTION_USER_PROFILES);
  const q = query(ref, where('email', '==', normalized), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}
