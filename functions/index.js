const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const TEMP_PASSWORD = "12341234";

const ALLOWED_ORIGINS = [
  "https://compassion-course-websit-937d6.firebaseapp.com",
  "https://compassion-course-websit-937d6.web.app",
  "http://localhost:5173",
];

function setCorsHeaders(res, origin) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin);
  if (allowed) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, status, data, origin) {
  setCorsHeaders(res, origin);
  res.status(status).set("Content-Type", "application/json").send(JSON.stringify(data));
}

/**
 * HTTP: createUserByAdmin
 * Only allowed for authenticated admins (Firestore admins collection).
 * CORS: allowed origins for firebaseapp, web.app, localhost:5173.
 * OPTIONS returns 204 with CORS headers; POST requires Authorization: Bearer <idToken>.
 */
exports.createUserByAdmin = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    const origin = req.get("Origin") || null;

    if (req.method === "OPTIONS") {
      setCorsHeaders(res, origin);
      res.status(204).end();
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" }, origin);
      return;
    }

    const authHeader = req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      sendJson(res, 401, { error: "Missing or invalid Authorization header" }, origin);
      return;
    }
    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch (err) {
      sendJson(res, 401, { error: "Invalid or expired token" }, origin);
      return;
    }

    const uid = decoded.uid;
    const email = decoded.email ? String(decoded.email).toLowerCase().trim() : null;
    if (!email) {
      sendJson(res, 403, { error: "Admin only." }, origin);
      return;
    }

    const db = getFirestore();
    const adminByUid = db.collection("admins").doc(uid);
    const adminByEmail = db.collection("admins").doc(email);
    const [snapUid, snapEmail] = await Promise.all([
      adminByUid.get(),
      adminByEmail.get(),
    ]);
    if (!snapUid.exists && !snapEmail.exists) {
      sendJson(res, 403, { error: "Admin only." }, origin);
      return;
    }

    let data;
    try {
      data = typeof req.body === "object" && req.body !== null ? req.body : JSON.parse(req.body || "{}");
    } catch {
      sendJson(res, 400, { error: "Invalid JSON body" }, origin);
      return;
    }

    const newEmail = typeof data.email === "string" ? data.email.trim() : "";
    const name = typeof data.name === "string" ? data.name.trim() : "";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      sendJson(res, 400, { error: "A valid email is required." }, origin);
      return;
    }

    const normalizedNewEmail = newEmail.toLowerCase();
    const auth = getAuth();

    try {
      await auth.getUserByEmail(normalizedNewEmail);
      sendJson(res, 409, { error: "A user with this email already exists." }, origin);
      return;
    } catch (err) {
      const code = err.code || err.errorInfo?.code;
      if (code !== "auth/user-not-found") {
        const msg = err.message || err.errorInfo?.message || "Failed to check existing user.";
        console.error("createUserByAdmin getUserByEmail error:", code, msg, err);
        sendJson(res, 500, { error: msg }, origin);
        return;
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
    } catch (err) {
      const msg = err.message || err.errorInfo?.message || "Failed to create auth user.";
      console.error("createUserByAdmin createUser error:", err.code || err.errorInfo?.code, msg, err);
      sendJson(res, 500, { error: msg }, origin);
      return;
    }

    const now = FieldValue.serverTimestamp();
    const profileData = {
      email: normalizedNewEmail,
      name: name || "",
      organizations: [],
      role: "viewer",
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.collection("userProfiles").doc(userRecord.uid).set(profileData);
    } catch (err) {
      const msg = err.message || "Failed to create user profile in database.";
      console.error("createUserByAdmin Firestore set error:", msg, err);
      sendJson(res, 500, { error: msg }, origin);
      return;
    }

    sendJson(res, 200, {
      uid: userRecord.uid,
      email: normalizedNewEmail,
      temporaryPassword: TEMP_PASSWORD,
    }, origin);
  }
);
