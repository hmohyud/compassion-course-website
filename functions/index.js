/**
 * Cloud Functions for Compassion Course — 1st Gen (v1)
 *
 * Only the auth trigger remains here. All admin operations (approve user,
 * grant/revoke admin, create/delete team) are now handled client-side via
 * direct Firestore writes with security rules enforcement.
 *
 * The GCP org policy on this project blocks public Cloud Function invocation,
 * making HTTP callable functions unreachable from the browser. Moving to
 * client-side Firestore is the reliable solution.
 *
 * firebase-functions v5 pinned — do NOT upgrade (v6+/v7+ may force v2 infra).
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const USERS_COLLECTION = "users";
const STATUS_ACTIVE = "active";

// ─── Auth Trigger (1st gen) ───────────────────────────────────────────────
// When a new user signs up, create their Firestore user doc with default role.

exports.onAuthUserCreated = functions.auth.user().onCreate(async (user) => {
  const now = FieldValue.serverTimestamp();
  const email = (user.email && String(user.email).trim()) || "";
  const displayName = (user.displayName && String(user.displayName).trim()) || email.split("@")[0] || "";
  await db.collection(USERS_COLLECTION).doc(user.uid).set(
    { uid: user.uid, email, displayName, role: "viewer", status: STATUS_ACTIVE, createdAt: now, updatedAt: now },
    { merge: true }
  );
});
