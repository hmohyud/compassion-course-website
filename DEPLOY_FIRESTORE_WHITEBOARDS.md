# Deploy Firestore rules (required for Whiteboards)

The whiteboard feature will show **"Missing or insufficient permissions"** until Firestore rules and indexes are deployed **to the same project the app uses**.

## 1. See which project the app uses

1. Open the app in the browser and open DevTools → **Console**.
2. On load you should see: **`Firestore projectId: compassion-course-websit-937d6`** (or your value).
3. Note that project ID — you must deploy to this exact project.

## 2. Deploy Firestore to that project

```bash
cd "/Users/jaybond/Projects/Compassion Course"
firebase use default
# Optional: confirm target matches app projectId from step 1
firebase use
firebase deploy --only firestore
```

Wait for **"Deploy complete!"** with no errors. The output should say **Deploying to '…'** — that name must match the projectId from step 1.

This deploys:
- **Rules** (`firestore.rules`) – including `whiteboards` with `allow read, write: if request.auth != null`
- **Indexes** (`firestore.indexes.json`) – required for whiteboard list queries

## 3. Confirm rules in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) and select the **same projectId** from step 1.
2. Go to **Firestore Database** → **Rules**.
3. In the rules text, you must see:
   ```
   match /whiteboards/{whiteboardId} {
     allow read, write: if request.auth != null;
   }
   ```
4. If you don’t see that block, the deploy did not apply to this project; run step 2 again and confirm the deploy target.

## 4. Retry the app

Hard refresh the app (e.g. Cmd+Shift+R), then open **Platform → Whiteboards**. List and create should work.

---

## "403" or "Invalid project selection" or "caller does not have permission"

This means the **Google account** you use with the Firebase CLI does not have permission to deploy Firestore rules for this project.

### Option A: Get access to the project

1. **Check which account you’re using**
   ```bash
   firebase login:list
   ```
   The account marked (current) is the one used for deploy.

2. **Ask a project owner to add you**
   - Someone with **Owner** or **Editor** on the Firebase project must add your Google account.
   - In [Firebase Console](https://console.firebase.google.com/project/compassion-course-websit-937d6/settings/iam) → **Project settings** → **Users and permissions** (or **Your project** → **Project settings** → **Users and permissions**), they add your email with role **Editor** (or at least **Firebase Rules Admin** / **Cloud Datastore User** if using custom roles).

3. **Or use the owner’s machine**
   - If you can’t get access, the person who owns the project can run `firebase deploy --only firestore` from their machine (after `firebase login` with their account and `git pull` of the latest repo).

### Option B: Deploy rules in the Firebase Console (no CLI)

If you can open the project in Firebase Console but CLI deploy fails:

1. Open [Firestore Rules](https://console.firebase.google.com/project/compassion-course-websit-937d6/firestore/rules) for this project.
2. Open `firestore.rules` in this repo and copy its contents.
3. Paste into the Rules editor in the console (replace everything).
4. Click **Publish**.

Then deploy indexes:

1. Open [Firestore Indexes](https://console.firebase.google.com/project/compassion-course-websit-937d6/firestore/indexes) in the same project.
2. Add any missing composite indexes from `firestore.indexes.json` (e.g. `whiteboards` with `ownerId` + `updatedAt`, and `sharedWith` + `updatedAt`).

---

## Still getting "Missing or insufficient permissions" in the app?

- **Project mismatch:** Console projectId (step 1) must equal the project you deploy to and the project in **Firestore → Rules**. If the app was built with a different `.env`, rebuild after fixing `VITE_FIREBASE_PROJECT_ID`.
- **Deploy not run or failed:** Run `firebase deploy --only firestore` and ensure it finishes with no errors.
- **Wrong Firebase project in Console:** In Firebase Console, switch to the project that matches the app’s projectId.
