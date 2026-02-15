import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const COLLECTION = 'users';

export type UserStatus = 'pending' | 'active' | 'disabled';
export type UserRole = 'public' | 'viewer' | 'contributor' | 'manager' | 'admin';

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

function toUserDoc(id: string, data: Record<string, unknown>): UserDoc {
  return {
    uid: id,
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? ''),
    role: (data.role as UserRole) ?? 'viewer',
    status: (data.status as UserStatus) ?? 'pending',
    createdAt: (data.createdAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toUserDoc(snap.id, snap.data() ?? {});
}

/** Client bootstrap: create users/{uid} with merge if missing (e.g. existing user before trigger). */
export async function ensureUserDoc(
  uid: string,
  email: string,
  displayName: string,
  options?: { status?: UserStatus; role?: UserRole }
): Promise<UserDoc> {
  const ref = doc(db, COLLECTION, uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return toUserDoc(existing.id, existing.data() ?? {});
  }
  const status = options?.status ?? 'pending';
  const role = options?.role ?? 'viewer';
  await setDoc(
    ref,
    {
      uid,
      email,
      displayName,
      role,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return toUserDoc(snap.id, snap.data() ?? {});
}

/** List users by status (admin-only in rules). */
export async function listUsersByStatus(status: UserStatus): Promise<UserDoc[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('status', '==', status));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toUserDoc(d.id, d.data() ?? {}));
}
