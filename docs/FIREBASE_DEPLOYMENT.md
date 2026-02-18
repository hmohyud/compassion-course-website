# Firebase Deployment

How to get code changes live on Firebase Hosting (and related services).

## Automatic deployment (recommended)

**Pushing to `main` triggers deployment.**

1. Commit and push to `main`:
   ```bash
   git add -A
   git commit -m "Your message"
   git push origin main
   ```

2. GitHub Actions runs the workflow **Deploy to Firebase Hosting**:
   - Builds the app with `npm run build` using GitHub Secrets for Firebase config
   - Deploys **Hosting**: `firebase deploy --only hosting`
   - Deploys **Storage rules**: `firebase deploy --only storage` (if permissions allow)

3. Check the run:
   - [Actions tab](https://github.com/ccfoundation-admin/compassion-course-website/actions)
   - Live site: https://compassion-course-websit-937d6.web.app

**Important:** The workflow only runs on pushes to `main` (or `master`). If you push to another branch, nothing deploys until you merge to `main` and push.

## Manual deployment

When you need to deploy without pushing (e.g. after fixing config locally):

```bash
# From repo root
npm run build
firebase deploy --only hosting
```

Optional (deploy other targets as needed):

```bash
firebase deploy --only storage        # Storage rules
firebase deploy --only firestore      # Firestore rules + indexes
firebase deploy --only functions      # Cloud Functions (see note below)
```

**Cloud Functions note:** Deploying individual functions (e.g. `firebase deploy --only functions:createTeamWithBoard`) can fail with a Gen 1/CPU error if the project or CLI applies CPU settings to 1st-gen functions. Deploy from Firebase Console or fix project config if that happens.

## Required GitHub Secrets

For the workflow to build and deploy, set these in the repo under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key (Firebase Console → Project settings → Your apps). Case-sensitive. |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `compassion-course-websit-937d6.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | e.g. `compassion-course-websit-937d6` |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `compassion-course-websit-937d6.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Numeric sender ID from Firebase Console |
| `VITE_FIREBASE_APP_ID` | e.g. `1:1087479449158:web:882a39db02a25172322c47` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional; e.g. `G-XXXXXXXXXX` for Analytics |
| `GCP_SA_KEY_JSON` | Full JSON key for a Google Cloud service account with Firebase Admin / Hosting deploy permissions |

Get Firebase values from Firebase Console → Project settings → General → Your apps.

## Local .env (development)

Copy from `.env` or create one with the same `VITE_*` variables so `npm run build` and `npm run dev` work. Do not commit `.env`; use GitHub Secrets for CI.

## Troubleshooting

- **Deploy didn't run:** Ensure you pushed to `main` (not a different branch). Check the Actions tab for the workflow run.
- **Build failed in Actions:** Check that all required secrets are set and the Firebase API key matches Console (including exact casing).
- **auth/api-key-not-valid:** API key in secrets or `.env` must match Firebase Console; a single wrong character (e.g. `BIAKPI` vs `BIAkPI`) causes this.
