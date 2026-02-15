const functions = require("firebase-functions");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const cors = require("cors");

initializeApp();

const CORS_ORIGINS = [
  "https://compassion-course-websit-937d6.firebaseapp.com",
  "https://compassion-course-websit-937d6.web.app",
];
const corsHandler = cors({
  origin: CORS_ORIGINS,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

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
 * Shared logic for createUserByAdmin: authenticated admin creates a new Auth user and docs.
 * @param {{ uid: string, email?: string }} caller - callerUid and optional callerEmail
 * @param {object} data - { email, displayName?, name?, role? }
 * @returns {{ ok: boolean, uid: string, email: string, temporaryPassword: string }}
 */
async function createUserByAdminLogic(caller, data) {
  const callerUid = caller.uid;
  const callerEmail = (caller.email && String(caller.email).toLowerCase().trim()) || "";
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

/**
 * Callable: createUserByAdmin (unchanged for existing frontend using httpsCallable).
 */
exports.createUserByAdmin = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign-in required.");
    }
    const caller = {
      uid: request.auth.uid,
      email: request.auth.token?.email ? String(request.auth.token.email) : "",
    };
    const result = await createUserByAdminLogic(caller, request.data);
    return result;
  }
);

/**
 * createUserByAdminHttp: HTTPS endpoint with CORS for Firebase Hosting origins.
 * Use this from fetch when you need CORS. Body: JSON { email, displayName?, role? }.
 * Header: Authorization: Bearer <idToken>.
 */
exports.createUserByAdminHttp = onRequest(
  { region: "us-central1", invoker: "public" },
  (req, res) => {
    const origin = req.headers.origin;
    const allowed = new Set([
      "https://compassion-course-websit-937d6.firebaseapp.com",
      "https://compassion-course-websit-937d6.web.app",
    ]);
    if (origin && allowed.has(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Sign-in required." });
        return;
      }
      const idToken = authHeader.slice(7);
      const auth = getAuth();
      let decoded;
      try {
        decoded = await auth.verifyIdToken(idToken);
      } catch (e) {
        res.status(401).json({ error: "Invalid or expired token." });
        return;
      }
      const callerUid = decoded.uid;
      const callerEmail = (decoded.email && String(decoded.email).toLowerCase().trim()) || "";
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const data = body.data != null ? body.data : body;
      try {
        const result = await createUserByAdminLogic(
          { uid: callerUid, email: callerEmail },
          data
        );
        res.status(200).json(result);
      } catch (e) {
        if (e instanceof HttpsError) {
          const status = {
            unauthenticated: 401,
            "permission-denied": 403,
            "not-found": 404,
            "invalid-argument": 400,
            "already-exists": 409,
            internal: 500,
          }[e.code] || 500;
          res.status(status).json({ error: e.message });
          return;
        }
        res.status(500).json({ error: e.message || "Internal error." });
        return;
      }
    });
  }
);

/**
 * Callable: approveUser — admin-only. Sets users/{uid}.status=active and role.
 */
exports.approveUser = onCall(
  { region: "us-central1", invoker: "public" },
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

/**
 * Callable: grantAdmin — active admin grants admin to another user. Writes /admins/{targetUid}.
 */
exports.grantAdmin = onCall(
  { region: "us-central1", invoker: "public" },
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
    const db = getFirestore();
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
  { region: "us-central1", invoker: "public" },
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
    const db = getFirestore();
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
