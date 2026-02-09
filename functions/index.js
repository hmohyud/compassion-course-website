const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const TEMP_PASSWORD = "12341234";

/**
 * Callable: createUserByAdmin
 * Only callable by authenticated admins (present in Firestore admins collection).
 * Creates a Firebase Auth user with temporary password and a userProfiles document with mustChangePassword: true.
 */
exports.createUserByAdmin = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to create users.");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email ? String(request.auth.token.email).toLowerCase().trim() : null;
  if (!email) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const db = getFirestore();
  const adminByUid = db.collection("admins").doc(uid);
  const adminByEmail = db.collection("admins").doc(email);
  const [snapUid, snapEmail] = await Promise.all([
    adminByUid.get(),
    adminByEmail.get(),
  ]);
  if (!snapUid.exists && !snapEmail.exists) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  const data = request.data;
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Missing data.");
  }
  const newEmail = typeof data.email === "string" ? data.email.trim() : "";
  const name = typeof data.name === "string" ? data.name.trim() : "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!newEmail || !emailRegex.test(newEmail)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }

  const normalizedNewEmail = newEmail.toLowerCase();

  const auth = getAuth();
  try {
    await auth.getUserByEmail(normalizedNewEmail);
    throw new HttpsError("already-exists", "A user with this email already exists.");
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    if (err.code !== "auth/user-not-found") {
      throw new HttpsError("internal", err.message || "Failed to check existing user.");
    }
  }

  const userRecord = await auth.createUser({
    email: normalizedNewEmail,
    password: TEMP_PASSWORD,
    displayName: name || undefined,
    emailVerified: false,
  });

  const now = FieldValue.serverTimestamp();
  const profileData = {
    email: normalizedNewEmail,
    name: name || "",
    organizations: [],
    role: "participant",
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("userProfiles").doc(userRecord.uid).set(profileData);

  return {
    uid: userRecord.uid,
    email: normalizedNewEmail,
    temporaryPassword: TEMP_PASSWORD,
  };
});
