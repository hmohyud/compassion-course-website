# Deploy Firestore rules (required for Whiteboards)

The whiteboard feature will show **"Missing or insufficient permissions"** until Firestore rules and indexes are deployed.

## 1. Deploy from your machine

```bash
cd "/Users/jaybond/Projects/Compassion Course"
firebase use default
firebase deploy --only firestore
```

This deploys:
- **Rules** (`firestore.rules`) – including the `whiteboards` collection
- **Indexes** (`firestore.indexes.json`) – required for whiteboard list queries

## 2. Confirm project

Your app uses the project in `.env`:

- `VITE_FIREBASE_PROJECT_ID` must match the project you deploy to.
- Default in this repo: `compassion-course-websit-937d6` (see `.firebaserc`).

If you use a different project (e.g. staging), run:

```bash
firebase use <your-project-id>
firebase deploy --only firestore
```

## 3. Verify in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. Go to **Firestore Database** → **Rules**.
3. Confirm you see a block like:

   ```
   match /whiteboards/{whiteboardId} {
     allow read: if request.auth != null && (...
   ```

If that block is missing, the deploy did not apply; run the deploy again.

## 4. Retry the app

After a successful deploy, reload the app and open **Platform → Whiteboards** again. List and create should work (no permission errors).
