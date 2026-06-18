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

// ─── Lesson audio generation (1st gen, Firestore-triggered) ───────────────────
// Public HTTP/callable invocation is blocked by org policy, so the editor can't
// call a function directly. Instead it writes a job doc to `audioJobs/{id}` and
// this background trigger generates the TTS clips with ElevenLabs, uploads them
// to weekly-audio/, and writes live progress back to the job doc (which the
// editor watches via onSnapshot). The ELEVENLABS_API_KEY secret is bound below.

const ELEVENLABS_VOICE_ID = "0DjnSmpuXSoerT6lyWGz";
const AUDIO_BUCKET = "compassion-course-websit-937d6.firebasestorage.app";
const SAFE_AUDIO_PATH = /^weekly-audio\/[A-Za-z0-9_-]+\.mp3$/;

async function elevenLabsTts(text, apiKey) {
  const res = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/" + ELEVENLABS_VOICE_ID + "/stream?output_format=mp3_22050_32",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!res.ok) {
    throw new Error("ElevenLabs " + res.status + ": " + (await res.text()).slice(0, 200));
  }
  return Buffer.from(await res.arrayBuffer());
}

exports.onAudioJobCreated = functions
  .runWith({ secrets: ["ELEVENLABS_API_KEY"], timeoutSeconds: 540, memory: "512MB" })
  .firestore.document("audioJobs/{jobId}")
  .onCreate(async (snap) => {
    const ref = snap.ref;
    const job = snap.data() || {};
    const items = Array.isArray(job.items) ? job.items.slice() : [];
    const weekNumber = job.weekNumber;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      await ref.update({ status: "error", error: "ELEVENLABS_API_KEY secret not configured", finishedAt: FieldValue.serverTimestamp() });
      return;
    }
    if (!items.length) {
      await ref.update({ status: "complete", done: 0, finishedAt: FieldValue.serverTimestamp() });
      return;
    }

    const bucket = admin.storage().bucket(AUDIO_BUCKET);
    await ref.update({ status: "running", startedAt: FieldValue.serverTimestamp() });

    const generated = [];
    let done = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      try {
        if (typeof it.storagePath !== "string" || !SAFE_AUDIO_PATH.test(it.storagePath)) {
          items[i] = Object.assign({}, it, { status: "error", error: "invalid storage path" });
        } else {
          const file = bucket.file(it.storagePath);
          const [exists] = await file.exists();
          if (exists) {
            items[i] = Object.assign({}, it, { status: "skipped" });
            generated.push(it.storagePath);
          } else if (!it.text || !String(it.text).trim()) {
            items[i] = Object.assign({}, it, { status: "error", error: "empty text" });
          } else {
            const buf = await elevenLabsTts(String(it.text), apiKey);
            await file.save(buf, {
              contentType: "audio/mpeg",
              resumable: false,
              metadata: { cacheControl: "public, max-age=31536000" },
            });
            items[i] = Object.assign({}, it, { status: "done" });
            generated.push(it.storagePath);
          }
        }
      } catch (e) {
        items[i] = Object.assign({}, it, { status: "error", error: String((e && e.message) || e).slice(0, 300) });
      }
      done += 1;
      await ref.update({ items: items, done: done });
      if (i < items.length - 1) await new Promise((r) => setTimeout(r, 500));
    }

    // Register the generated/existing files on the week so the viewer can sign their URLs.
    try {
      if (weekNumber != null && generated.length) {
        await db.collection("weeklyContent").doc(String(weekNumber)).set(
          { audioStoragePaths: FieldValue.arrayUnion.apply(FieldValue, generated), updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
    } catch (e) {
      // non-fatal: the files exist in Storage regardless
    }

    const anyError = items.some((it) => it && it.status === "error");
    await ref.update({
      status: anyError ? "completed_with_errors" : "complete",
      done: done,
      finishedAt: FieldValue.serverTimestamp(),
    });
  });
