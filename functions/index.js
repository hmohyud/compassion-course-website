const functions = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const TEMP_PASSWORD = "12341234";
const USERS_COLLECTION = "users";
const ROLES_ALLOWLIST = ["viewer", "contributor", "manager", "admin"];
const STATUS_PENDING = "pending";
const STATUS_ACTIVE = "active";

const CORS_ORIGINS = [
  "https://compassion-course-websit-937d6.firebaseapp.com",
  "https://compassion-course-websit-937d6.web.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

/**
 * Auth trigger (1st gen): when a new Auth user is created (self-signup), create users/{uid}
 * with status=active, role=viewer for immediate read-only portal access.
 */
exports.onAuthUserCreated = functions.auth.user().onCreate(async (user) => {
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
 * Shared logic for createUserByAdmin: authenticated admin creates a new Auth user and docs.
 * All failures throw HttpsError with explicit codes. Caller must pass caller.uid (admin check done here).
 * @param {{ uid: string, email?: string }} caller - callerUid and optional callerEmail
 * @param {object} data - { email, displayName?, name?, role? }
 * @returns {{ ok: boolean, uid: string, email: string, temporaryPassword: string }}
 */
async function createUserByAdminLogic(caller, data) {
  let step = "start";
  try {
    console.log("[createUserByAdmin] start", {
      callerUid: caller?.uid,
      callerEmail: caller?.email,
      targetEmail: data?.email,
    });

    // Input validation
    step = "validate";
    if (!data?.email) {
      throw new HttpsError("invalid-argument", "email is required");
    }
    const email = String(data.email).trim().toLowerCase();
    if (!email) {
      throw new HttpsError("invalid-argument", "email is required");
    }
    const displayName = data.displayName != null ? String(data.displayName).trim() : "";
    const role = typeof data.role === "string" && ROLES_ALLOWLIST.includes(data.role) ? data.role : "viewer";

    // Require caller.uid before admin check
    if (!caller?.uid) {
      throw new HttpsError("unauthenticated", "sign in required");
    }

    // Admin check: admins/{caller.uid} (Admin SDK only)
    step = "adminCheck.readAdminDoc";
    const adminSnap = await db.collection("admins").doc(caller.uid).get();
    if (!adminSnap.exists) {
      throw new HttpsError("permission-denied", "admin doc missing");
    }
    const adminData = adminSnap.data();
    const adminRole = adminData?.role;
    const adminStatus = adminData?.status;
    const okRole = adminRole === "admin" || adminRole === "superAdmin";
    const okStatus = adminStatus === "active" || adminStatus === "approved";
    if (!okRole) {
      throw new HttpsError("permission-denied", "admin role required");
    }
    if (!okStatus) {
      throw new HttpsError("permission-denied", "admin not active or approved");
    }

    // Auth: check if user already exists (Admin SDK only)
    step = "auth.getUserByEmail";
    const auth = admin.auth();
    try {
      await auth.getUserByEmail(email);
      throw new HttpsError("already-exists", "user already exists");
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      const code = e.code || (e.errorInfo && e.errorInfo.code);
      if (code !== "auth/user-not-found") {
        console.error("[createUserByAdmin]", { step, err: e, message: e?.message, code: e?.code, stack: e?.stack });
        throw new HttpsError("internal", "getUserByEmail failed: " + (e.message || "unknown"));
      }
    }

    // Create Auth user
    step = "auth.createUser";
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password: TEMP_PASSWORD,
        displayName: displayName || undefined,
        emailVerified: false,
      });
    } catch (e) {
      console.error("[createUserByAdmin]", { step, err: e, message: e?.message, code: e?.code, stack: e?.stack });
      throw new HttpsError("internal", "createUser failed: " + (e.message || "unknown"));
    }

    const now = FieldValue.serverTimestamp();
    const newUid = userRecord.uid;

    // Firestore: users/{newUid} (Admin SDK only)
    step = "firestore.write.users";
    try {
      await db.collection(USERS_COLLECTION).doc(newUid).set(
        {
          uid: newUid,
          email,
          displayName: displayName || "",
          role,
          status: STATUS_PENDING,
          createdAt: now,
          createdBy: caller.uid,
        },
        { merge: true }
      );
    } catch (e) {
      console.error("[createUserByAdmin]", { step, err: e, message: e?.message, code: e?.code, stack: e?.stack });
      throw new HttpsError("internal", "firestore write failed: " + (e.message || "unknown"));
    }

    // Firestore: userProfiles/{newUid} (Admin SDK only; mirror existing schema)
    step = "firestore.write.userProfiles";
    try {
      await db.collection("userProfiles").doc(newUid).set(
        {
          email,
          name: displayName || "",
          organizations: [],
          role,
          mustChangePassword: true,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (e) {
      console.error("[createUserByAdmin]", { step, err: e, message: e?.message, code: e?.code, stack: e?.stack });
      throw new HttpsError("internal", "firestore write failed: " + (e.message || "unknown"));
    }

    return {
      ok: true,
      uid: newUid,
      email,
      temporaryPassword: TEMP_PASSWORD,
    };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error("[createUserByAdmin]", { step, err: e, message: e?.message, code: e?.code, stack: e?.stack });
    throw new HttpsError("internal", `createUserByAdmin failed at ${step}: ${e?.message || "unknown"}`);
  }
}

/**
 * Callable (onCall): createUserByAdmin — region us-central1, invoker public for browser OPTIONS.
 * All validation and admin check inside createUserByAdminLogic; handler wraps errors for explicit HttpsError.
 */
exports.createUserByAdmin = onCall(
  { region: "us-central1", invoker: "public", cors: CORS_ORIGINS },
  async (request) => {
    try {
      const caller = {
        uid: request.auth?.uid || null,
        email: request.auth?.token?.email ? String(request.auth.token.email) : "",
      };
      const result = await createUserByAdminLogic(caller, request.data || {});
      return result;
    } catch (err) {
      console.error("[createUserByAdmin] error", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err?.message || "unknown error");
    }
  }
);

/**
 * Callable: approveUser — admin-only. Sets users/{uid}.status=active and role.
 */
exports.approveUser = onCall(
  { region: "us-central1", invoker: "public", cors: CORS_ORIGINS },
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

/**
 * Callable: grantAdmin — active admin grants admin to another user. Writes /admins/{targetUid}.
 */
exports.grantAdmin = onCall(
  { region: "us-central1", invoker: "public", cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign-in required.");
    }
    const callerUid = request.auth.uid;
    const callerEmail = request.auth.token?.email ? String(request.auth.token.email).toLowerCase().trim() : "";
    const data = request.data;
    if (!data || typeof data !== "object") {
      throw new HttpsError("invalid-argument", "Missing data.");
    }
    const targetUid = typeof data.targetUid === "string" ? data.targetUid.trim() : "";
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (!targetUid || !email) {
      throw new HttpsError("invalid-argument", "targetUid and email are required.");
    }
    const callerAdminSnap = await db.collection("admins").doc(callerUid).get();
    if (!callerAdminSnap.exists) {
      throw new HttpsError("permission-denied", "Admin only.");
    }
    const callerData = callerAdminSnap.data();
    const callerStatus = callerData?.status;
    const callerRole = callerData?.role;
    const okStatus = callerStatus === "active" || callerStatus === "approved";
    const okRole = callerRole === "admin" || callerRole === "superAdmin";
    if (!okStatus || !okRole) {
      throw new HttpsError("permission-denied", "Active admin only.");
    }
    const now = FieldValue.serverTimestamp();
    const grantedAt = new Date().toISOString();
    await db.collection("admins").doc(targetUid).set({
      uid: targetUid,
      email,
      role: "admin",
      status: "active",
      grantedBy: callerEmail || "unknown",
      grantedAt,
      updatedAt: now,
    });
    return { ok: true };
  }
);

/**
 * Callable: revokeAdmin — active admin revokes admin from a user. Deletes /admins/{targetUid}.
 */
exports.revokeAdmin = onCall(
  { region: "us-central1", invoker: "public", cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign-in required.");
    }
    const callerUid = request.auth.uid;
    const data = request.data;
    if (!data || typeof data !== "object") {
      throw new HttpsError("invalid-argument", "Missing data.");
    }
    const targetUid = typeof data.targetUid === "string" ? data.targetUid.trim() : "";
    if (!targetUid) {
      throw new HttpsError("invalid-argument", "targetUid is required.");
    }
    const callerAdminSnap = await db.collection("admins").doc(callerUid).get();
    if (!callerAdminSnap.exists) {
      throw new HttpsError("permission-denied", "Admin only.");
    }
    const callerData = callerAdminSnap.data();
    const callerStatus = callerData?.status;
    const callerRole = callerData?.role;
    const okStatus = callerStatus === "active" || callerStatus === "approved";
    const okRole = callerRole === "admin" || callerRole === "superAdmin";
    if (!okStatus || !okRole) {
      throw new HttpsError("permission-denied", "Active admin only.");
    }
    const targetRef = db.collection("admins").doc(targetUid);
    const targetSnap = await targetRef.get();
    if (targetSnap.exists) {
      await targetRef.delete();
    }
    return { ok: true };
  }
);
