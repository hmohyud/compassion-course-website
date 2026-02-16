const functions = require("firebase-functions");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/** @param {unknown} err - @returns {{ message: string, code?: string, stack?: string }} */
function normalizeError(err) {
  const e = err && typeof err === "object" ? err : {};
  return {
    message: (e.message != null ? String(e.message) : "") || "unknown",
    code: e.code != null ? String(e.code) : (e.errorInfo && e.errorInfo?.code != null ? String(e.errorInfo.code) : undefined),
    stack: e.stack != null ? String(e.stack) : undefined,
  };
}

/**
 * @param {string} fnName
 * @param {string} step
 * @param {object} [meta]
 */
function logStep(fnName, step, meta = {}) {
  console.log(JSON.stringify({ fn: fnName, step, level: "info", ...meta }));
}

/**
 * @param {string} fnName
 * @param {string} step
 * @param {unknown} err
 * @param {object} [meta]
 */
function logError(fnName, step, err, meta = {}) {
  console.error(JSON.stringify({ fn: fnName, step, level: "error", err: normalizeError(err), ...meta }));
}

/**
 * UID-only admin gate: read admins/{callerUid}, require role in [admin, superAdmin] and status in [active, approved].
 * @param {string|null|undefined} callerUid
 * @returns {Promise<{ uid: string, role: string, status: string, email?: string }>}
 */
async function assertActiveAdmin(callerUid) {
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "sign in required");
  }
  const snap = await db.collection("admins").doc(callerUid).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "admin doc missing");
  }
  const data = snap.data();
  const role = data?.role;
  const status = data?.status;
  if (role !== "admin" && role !== "superAdmin") {
    throw new HttpsError("permission-denied", "admin role required");
  }
  if (status !== "active" && status !== "approved") {
    throw new HttpsError("permission-denied", "admin not active or approved");
  }
  const email = data?.email != null ? String(data.email) : undefined;
  return { uid: callerUid, role, status, email };
}

/**
 * Callable helper: require active admin from request.auth; throws if not.
 * @param {{ auth?: { uid?: string, token?: { email?: string } } }} request
 * @returns {Promise<{ uid: string, email: string }>}
 */
async function requireActiveAdmin(request) {
  const uid = request?.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign-in required.");
  const snap = await db.collection("admins").doc(uid).get();
  if (!snap.exists) throw new HttpsError("permission-denied", "Admin only.");
  const a = snap.data() || {};
  const okRole = a.role === "admin" || a.role === "superAdmin";
  const okStatus = a.status === "active" || a.status === "approved";
  if (!okRole) throw new HttpsError("permission-denied", "Admin role required.");
  if (!okStatus) throw new HttpsError("permission-denied", "Admin not active/approved.");
  return { uid, email: String(request.auth?.token?.email || "").toLowerCase().trim() };
}

/**
 * Gen 1 callable helper: require active admin from context.auth; throws functions.https.HttpsError.
 * @param {{ auth?: { uid?: string, token?: { email?: string } } }} context
 * @returns {Promise<{ uid: string, email: string }>}
 */
async function requireActiveAdminV1(context) {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Sign-in required.");
  }
  const callerUid = context.auth.uid;
  const adminSnap = await db.collection("admins").doc(callerUid).get();
  if (!adminSnap.exists) {
    throw new functions.https.HttpsError("permission-denied", "Admin only.");
  }
  const adminData = adminSnap.data() || {};
  const role = adminData.role;
  const status = adminData.status;
  const okRole = role === "admin" || role === "superAdmin";
  const okStatus = status === "active" || status === "approved";
  if (!okRole) throw new functions.https.HttpsError("permission-denied", "Admin role required.");
  if (!okStatus) throw new functions.https.HttpsError("permission-denied", "Admin not active/approved.");
  return { uid: callerUid, email: String(context.auth.token?.email || "").toLowerCase().trim() };
}

const TEMP_PASSWORD = "12341234";
const USERS_COLLECTION = "users";
const ROLES_ALLOWLIST = ["viewer", "contributor", "manager", "admin"];
const STATUS_PENDING = "pending";
const STATUS_ACTIVE = "active";

/**
 * Auth trigger (1st gen): when a new Auth user is created (self-signup), create users/{uid}
 * with status=active, role=viewer for immediate access. No email verification required.
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
const FN_CREATE_USER = "createUserByAdmin";

async function createUserByAdminLogic(caller, data) {
  let step = "start";
  try {
    logStep(FN_CREATE_USER, step, { callerUid: caller?.uid, targetEmail: data?.email });

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

    step = "adminCheck";
    await assertActiveAdmin(caller?.uid ?? null);

    step = "auth.getUserByEmail";
    const auth = admin.auth();
    try {
      await auth.getUserByEmail(email);
      throw new HttpsError("already-exists", "user already exists");
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      const code = e?.code || (e?.errorInfo && e?.errorInfo?.code);
      if (code !== "auth/user-not-found") {
        logError(FN_CREATE_USER, step, e);
        throw new HttpsError("internal", "getUserByEmail failed: " + (e?.message || "unknown"));
      }
    }

    step = "auth.createUser";
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password: TEMP_PASSWORD,
        displayName: displayName || undefined,
      });
    } catch (e) {
      logError(FN_CREATE_USER, step, e);
      throw new HttpsError("internal", "createUser failed: " + (e?.message || "unknown"));
    }

    const now = FieldValue.serverTimestamp();
    const newUid = userRecord.uid;

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
      logError(FN_CREATE_USER, step, e);
      throw new HttpsError("internal", "firestore write failed: " + (e?.message || "unknown"));
    }

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
      logError(FN_CREATE_USER, step, e);
      throw new HttpsError("internal", "firestore write failed: " + (e?.message || "unknown"));
    }

    return {
      ok: true,
      uid: newUid,
      email,
      temporaryPassword: TEMP_PASSWORD,
    };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logError(FN_CREATE_USER, step, e);
    throw new HttpsError("internal", `createUserByAdmin failed at ${step}: ${e?.message || "unknown"}`);
  }
}

/**
 * DEPRECATED: User provisioning is self-signup only. Create User UI removed; callable no longer exposed.
 * Uncomment to re-enable admin-created users (not recommended).
 *
 * Callable (onCall): createUserByAdmin — region us-central1, invoker public for browser OPTIONS.
 * All validation and admin check inside createUserByAdminLogic; handler wraps errors for explicit HttpsError.
 */
// exports.createUserByAdmin = onCall(
//   { region: "us-central1", invoker: "public" },
//   async (request) => {
//     try {
//       const caller = {
//         uid: request.auth?.uid || null,
//         email: request.auth?.token?.email ? String(request.auth.token.email) : "",
//       };
//       const result = await createUserByAdminLogic(caller, request.data || {});
//       return result;
//     } catch (err) {
//       logError(FN_CREATE_USER, "handler", err);
//       if (err instanceof HttpsError) throw err;
//       throw new HttpsError("internal", err?.message || "unknown error");
//     }
//   }
// );

const FN_APPROVE_USER = "approveUser";

/**
 * Callable: approveUser — admin-only. Sets users/{uid}.status=active and role.
 */
exports.approveUser = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    let step = "start";
    try {
      logStep(FN_APPROVE_USER, step);
      if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Sign-in required.");
      }
      step = "adminCheck";
      await assertActiveAdmin(request.auth.uid);
      step = "validate";
      const data = request.data;
      if (!data || typeof data !== "object") {
        throw new HttpsError("invalid-argument", "Missing data.");
      }
      const targetUid = typeof data.uid === "string" ? data.uid.trim() : "";
      if (!targetUid) {
        throw new HttpsError("invalid-argument", "uid is required.");
      }
      const role = typeof data.role === "string" && ROLES_ALLOWLIST.includes(data.role) ? data.role : "viewer";
      step = "firestore.read.user";
      const userRef = db.collection(USERS_COLLECTION).doc(targetUid);
      const snap = await userRef.get();
      if (!snap.exists) {
        throw new HttpsError("not-found", "User not found.");
      }
      step = "firestore.update.user";
      const now = FieldValue.serverTimestamp();
      await userRef.update({
        status: STATUS_ACTIVE,
        role,
        updatedAt: now,
      });
      logStep(FN_APPROVE_USER, "done", { uid: targetUid });
      return { ok: true, uid: targetUid, status: STATUS_ACTIVE, role };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logError(FN_APPROVE_USER, step, e);
      throw new HttpsError("internal", e?.message || "unknown error");
    }
  }
);

const FN_GRANT_ADMIN = "grantAdmin";

/**
 * Callable: grantAdmin — active admin grants admin to another user. Writes /admins/{targetUid}.
 */
exports.grantAdmin = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    let step = "start";
    try {
      logStep(FN_GRANT_ADMIN, step);
      if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Sign-in required.");
      }
      step = "adminCheck";
      await assertActiveAdmin(request.auth.uid);
      step = "validate";
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
      step = "firestore.write.admin";
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
      logStep(FN_GRANT_ADMIN, "done", { targetUid });
      return { ok: true };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logError(FN_GRANT_ADMIN, step, e);
      throw new HttpsError("internal", e?.message || "unknown error");
    }
  }
);

const FN_REVOKE_ADMIN = "revokeAdmin";

/**
 * Callable: revokeAdmin — active admin revokes admin from a user. Deletes /admins/{targetUid}.
 */
exports.revokeAdmin = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    let step = "start";
    try {
      logStep(FN_REVOKE_ADMIN, step);
      if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Sign-in required.");
      }
      step = "adminCheck";
      await assertActiveAdmin(request.auth.uid);
      step = "validate";
      const data = request.data;
      if (!data || typeof data !== "object") {
        throw new HttpsError("invalid-argument", "Missing data.");
      }
      const targetUid = typeof data.targetUid === "string" ? data.targetUid.trim() : "";
      if (!targetUid) {
        throw new HttpsError("invalid-argument", "targetUid is required.");
      }
      step = "firestore.delete.admin";
      const targetRef = db.collection("admins").doc(targetUid);
      const targetSnap = await targetRef.get();
      if (targetSnap.exists) {
        await targetRef.delete();
      }
      logStep(FN_REVOKE_ADMIN, "done", { targetUid });
      return { ok: true };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logError(FN_REVOKE_ADMIN, step, e);
      throw new HttpsError("internal", e?.message || "unknown error");
    }
  }
);

const FN_CREATE_TEAM = "createTeamWithBoard";

/**
 * Callable (v2): createTeamWithBoard — admin-only. Creates team + board in Firestore.
 * Use httpsCallable(functions, "createTeamWithBoard") from the client; no direct fetch to avoid CORS.
 */
exports.createTeamWithBoard = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    let step = "start";
    try {
      logStep(FN_CREATE_TEAM, step);
      if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Sign-in required.");
      }
      step = "adminCheck";
      const caller = await requireActiveAdmin(request);
      const data = request.data;
      const name = typeof data?.name === "string" ? data.name.trim() : "";
      const memberIds = Array.isArray(data?.memberIds) ? data.memberIds : [];
      if (!name) {
        throw new HttpsError("invalid-argument", "name is required");
      }
      if (!memberIds.every((x) => typeof x === "string")) {
        throw new HttpsError("invalid-argument", "memberIds must be string[]");
      }

      step = "firestore.write";
      const now = FieldValue.serverTimestamp();
      const teamRef = db.collection("teams").doc();
      const boardRef = db.collection("boards").doc();

      await boardRef.set({
        teamId: teamRef.id,
        createdAt: now,
        updatedAt: now,
        createdBy: caller.uid,
      });

      await teamRef.set({
        name,
        memberIds,
        boardId: boardRef.id,
        whiteboardIds: [],
        createdAt: now,
        updatedAt: now,
        createdBy: caller.uid,
      });

      logStep(FN_CREATE_TEAM, "done", { teamId: teamRef.id });
      return { ok: true, teamId: teamRef.id, boardId: boardRef.id };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logError(FN_CREATE_TEAM, step, e);
      throw new HttpsError("internal", e?.message || "unknown error");
    }
  }
);

/**
 * DEPRECATED: HTTP onRequest version — do not use from browser (CORS). Use createTeamWithBoard callable instead.
 */
// exports.createTeamWithBoard_v2 = onRequest(
//   { region: "us-central1" },
//   async (req, res) => { ... }
// );
