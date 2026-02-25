/**
 * Admin operations via direct Firestore writes.
 *
 * These operations were previously routed through Cloud Functions (onCall/onRequest),
 * but the project's GCP org policy blocks public invocation of Cloud Functions.
 * Moving to client-side Firestore writes with security rules is the reliable solution.
 *
 * Security is enforced by Firestore rules: the isAdmin() function checks the
 * admins/{uid} doc for a valid role + status before allowing any write.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

const USERS_COLLECTION = 'users';
const USER_PROFILES_COLLECTION = 'userProfiles';
const ADMINS_COLLECTION = 'admins';
const ROLES_ALLOWLIST = ['viewer', 'contributor', 'manager', 'admin'];
const STATUS_ACTIVE = 'active';

/**
 * Approve a pending user by setting their status to active and assigning a role.
 * Also syncs the role to the userProfiles collection.
 */
export async function approveUser(uid: string, role: string): Promise<void> {
  if (!uid) throw new Error('uid is required');
  const safeRole = ROLES_ALLOWLIST.includes(role) ? role : 'viewer';

  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User not found.');

  const now = serverTimestamp();
  await updateDoc(userRef, { status: STATUS_ACTIVE, role: safeRole, updatedAt: now });

  // Sync to userProfiles
  const profileRef = doc(db, USER_PROFILES_COLLECTION, uid);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    await updateDoc(profileRef, { role: safeRole, updatedAt: now });
  } else {
    const userData = userSnap.data() || {};
    await setDoc(profileRef, {
      email: userData.email || '',
      name: userData.displayName || '',
      organizations: [],
      role: safeRole,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Grant admin rights to a user by creating/updating their admins doc.
 * Also syncs the role to users and userProfiles collections.
 */
export async function grantAdmin(targetUid: string, email: string): Promise<void> {
  if (!targetUid || !email) throw new Error('targetUid and email are required.');

  const callerEmail = auth.currentUser?.email?.toLowerCase().trim() || 'unknown';
  const now = serverTimestamp();

  await setDoc(doc(db, ADMINS_COLLECTION, targetUid), {
    uid: targetUid,
    email: email.trim().toLowerCase(),
    role: 'admin',
    status: 'active',
    grantedBy: callerEmail,
    grantedAt: new Date().toISOString(),
    updatedAt: now,
  });

  // Sync role to users collection
  const userRef = doc(db, USERS_COLLECTION, targetUid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    await updateDoc(userRef, { role: 'admin', status: STATUS_ACTIVE, updatedAt: now });
  }

  // Sync role to userProfiles collection
  const profileRef = doc(db, USER_PROFILES_COLLECTION, targetUid);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    await updateDoc(profileRef, { role: 'admin', updatedAt: now });
  }
}

/**
 * Revoke admin rights from a user by deleting their admins doc.
 * Also demotes them to 'viewer' in users and userProfiles collections.
 */
export async function revokeAdmin(targetUid: string): Promise<void> {
  if (!targetUid) throw new Error('targetUid is required.');

  const callerUid = auth.currentUser?.uid;
  if (targetUid === callerUid) throw new Error('Cannot revoke your own admin access.');

  // Delete the admin doc
  const adminRef = doc(db, ADMINS_COLLECTION, targetUid);
  const adminSnap = await getDoc(adminRef);
  if (adminSnap.exists()) {
    await deleteDoc(adminRef);
  }

  const now = serverTimestamp();

  // Demote in users collection
  const userRef = doc(db, USERS_COLLECTION, targetUid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userRole = userSnap.data()?.role;
    if (userRole === 'admin' || userRole === 'superAdmin') {
      await updateDoc(userRef, { role: 'viewer', updatedAt: now });
    }
  }

  // Demote in userProfiles collection
  const profileRef = doc(db, USER_PROFILES_COLLECTION, targetUid);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    const profileRole = profileSnap.data()?.role;
    if (profileRole === 'admin' || profileRole === 'superAdmin') {
      await updateDoc(profileRef, { role: 'viewer', updatedAt: now });
    }
  }
}
