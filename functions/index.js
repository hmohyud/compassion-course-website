const functions = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const TEMP_PASSWORD = "12341234";
const USERS_COLLECTION = "users";
const ROLES_ALLOWLIST = ["viewer", "contributor", "manager", "admin"];
const STATUS_PENDING = "pending";
const STATUS_ACTIVE = "active";

/**
 * Auth trigger (1st gen): when a new Auth user is created (self-signup), create users/{uid}
 * with status=active, role=viewer for immediate read-only portal access.
 */
exports.onAuthUserCreated = functions.auth.user().onCreate(async (user) => {
  const db = getFirestore();
  const now = FieldValue.serverTimestamp();
  const email = (user.email && String(user.email).trim()) || "";
  const displayName = (user.displayName && String(user.displayName).trim()) || email.split("@")[0] || "";
  await db.collection(USERS_COLLECTION).doc(user.uid).set(
    {
      uid: user.uid,
      email,
      displayName,
      role: "viewer",
      status: STATUS_ACTIVE,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );
});

/**
 * Callable: createUserByAdmin
 * Only callable by authenticated admins (Firestore admins collection).
 * Creates a Firebase Auth user with temporary password and a userProfiles document with mustChangePassword: true.
 */
exports.createUserByAdmin = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign-in required.");
    }
    const callerUid = request.auth.uid;
    const data = request.data;
    if (!data || typeof data !== "object") {
      throw new HttpsError("invalid-argument", "Missing data.");
    }
    const newEmail = typeof data.email === "string" ? data.email.trim() : "";
    const name = (typeof data.displayName === "string" ? data.displayName.trim() : null)
      || (typeof data.name === "string" ? data.name.trim() : "") || "";
    const allowedRoles = ["viewer", "contributor", "manager", "admin"];
    const role = typeof data.role === "string" && allowedRoles.includes(data.role) ? data.role : "viewer";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }
    const db = getFirestore();
    const callerEmail = request.auth.token?.email ? String(request.auth.token.email).toLowerCase().trim() : "";
    const adminByUid = db.collection("admins").doc(callerUid);
    const adminByEmail = db.collection("admins").doc(callerEmail);
    const [snapUid, snapEmail] = await Promise.all([
      adminByUid.get(),
      adminByEmail.get(),
    ]);
    if (!snapUid.exists && !snapEmail.exists) {
      throw new HttpsError("permission-denied", "Admin only.");
    }
    const normalizedNewEmail = newEmail.toLowerCase();
    const auth = getAuth();
    try {
      await auth.getUserByEmail(normalizedNewEmail);
      throw new HttpsError("already-exists", "A user with this email already exists.");
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      const code = e.code || (e.errorInfo && e.errorInfo.code);
      if (code !== "auth/user-not-found") {
        throw new HttpsError("internal", e.message || "Failed to check user.");
      }
    }
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: normalizedNewEmail,
        password: TEMP_PASSWORD,
        displayName: name || undefined,
        emailVerified: false,
      });
    } catch (e) {
      throw new HttpsError("internal", e.message || "Failed to create user.");
    }
    const now = FieldValue.serverTimestamp();
    await db.collection("userProfiles").doc(userRecord.uid).set({
      email: normalizedNewEmail,
      name: name || "",
      organizations: [],
      role,
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });
    await db.collection(USERS_COLLECTION).doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: normalizedNewEmail,
      displayName: name || "",
      role,
      status: STATUS_ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
    return {
      ok: true,
      uid: userRecord.uid,
      email: normalizedNewEmail,
      temporaryPassword: TEMP_PASSWORD,
    };
  }
);

/**
 * Callable: approveUser — admin-only. Sets users/{uid}.status=active and role.
 */
exports.approveUser = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign-in required.");
    }
    const callerUid = request.auth.uid;
    const data = request.data;
    if (!data || typeof data !== "object") {
      throw new HttpsError("invalid-argument", "Missing data.");
    }
    const targetUid = typeof data.uid === "string" ? data.uid.trim() : "";
    if (!targetUid) {
      throw new HttpsError("invalid-argument", "uid is required.");
    }
    const role = typeof data.role === "string" && ROLES_ALLOWLIST.includes(data.role) ? data.role : "viewer";
    const db = getFirestore();
    const callerEmail = request.auth.token?.email ? String(request.auth.token.email).toLowerCase().trim() : "";
    const adminByUid = db.collection("admins").doc(callerUid);
    const adminByEmail = db.collection("admins").doc(callerEmail);
    const [snapUid, snapEmail] = await Promise.all([adminByUid.get(), adminByEmail.get()]);
    if (!snapUid.exists && !snapEmail.exists) {
      throw new HttpsError("permission-denied", "Admin only.");
    }
    const userRef = db.collection(USERS_COLLECTION).doc(targetUid);
    const snap = await userRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "User not found.");
    }
    const now = FieldValue.serverTimestamp();
    await userRef.update({
      status: STATUS_ACTIVE,
      role,
      updatedAt: now,
    });
    return { ok: true, uid: targetUid, status: STATUS_ACTIVE, role };
  }
);
