# Admin Portal access — UID nYRwET09K8YtoEHhkz54tHas4o83

## Phase 1 — Create the admin doc in Firestore (manual)

In **Firebase Console → Firestore**:

1. Go to collection: **admins**
2. Create a document with **Document ID** exactly:
   ```
   nYRwET09K8YtoEHhkz54tHas4o83
   ```
3. Add these fields:

   | Field   | Type   | Value                          |
   |---------|--------|--------------------------------|
   | uid     | string | nYRwET09K8YtoEHhkz54tHas4o83   |
   | status  | string | active                         |
   | role    | string | admin                          |
   | email   | string | jaybond@compassioncf.com       |

Do **not** rely on an email-keyed doc like `admins/jaybond@compassioncf.com`. Admin docs must be UID-keyed: `admins/{uid}`.

After this, sign in as jaybond@compassioncf.com and open the Admin Portal; the app will read `/admins/nYRwET09K8YtoEHhkz54tHas4o83` to confirm access.

**Note:** With the current Firestore rules, only **reading your own** `/admins/{uid}` doc is allowed from the client. Listing all admins and grant/revoke from the User Management UI are disabled. To manage admin docs (create/update/delete), use Firebase Console or a Cloud Function (recommended).
