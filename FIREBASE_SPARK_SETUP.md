# KAS RC Arena — Firebase Spark Setup Guide

This guide is for moving the current local-only PWA to Firebase Cloud Firestore so rides, fleet, batteries, staff permissions and settings can sync across devices.

## Recommended Firebase services

Use these on the Spark plan:

- **Cloud Firestore** — primary cloud database and real-time sync.
- **Firebase Authentication** — real Owner and Operator accounts.
- **App Check** — recommended before production to reduce abusive requests.

Keep GitHub Pages for hosting if you want. Firebase Hosting is not required for this architecture.

## 1. Create the Firebase project

1. Go to Firebase Console.
2. Click **Create a project**.
3. Name it, for example `kas-rc-arena`.
4. Google Analytics is optional for this internal operations app.
5. Stay on the **Spark / no-cost** plan.

## 2. Register the web app

1. Firebase Console → **Project Overview**.
2. Click the **Web `</>`** icon.
3. App nickname: `KAS RC Arena PWA`.
4. Do not enable Firebase Hosting if GitHub Pages remains your host.
5. Firebase will show a `firebaseConfig` object. Keep this config for the app.

Important: the web Firebase config is not a password. Security must come from Authentication + Firestore Security Rules.

## 3. Create Cloud Firestore

1. Firebase Console → **Build → Firestore Database**.
2. Click **Create database**.
3. Choose **Production mode**.
4. Pick the closest appropriate region and do not change it later without planning a migration.

Do not run the production app with open test rules.

## 4. Enable Authentication

1. Firebase Console → **Build → Authentication**.
2. Click **Get started**.
3. Enable **Email/Password**.
4. Create the Owner account first.
5. Later create each operator as a separate Firebase Auth user.

Do not keep shared numeric PIN-only authentication as the security boundary once Firebase is live. The UI can still offer a quick local PIN unlock, but Firebase Auth should own cloud identity.

## 5. Suggested Firestore structure

Use one business document so the app can expand later:

```text
businesses/{businessId}
  name
  timezone
  createdAt

businesses/{businessId}/users/{uid}
  name
  role: owner | operator
  active
  permissions

businesses/{businessId}/vehicles/{vehicleId}
  code
  name
  typeId
  pricingProfileId
  extensionProfileId
  batteryTypeId
  currentBatteryId
  manualStatus
  active

businesses/{businessId}/batteries/{batteryId}
  code
  typeId
  status
  assignedVehicleId
  cycles
  totalRuntimeMin

businesses/{businessId}/rides/{rideId}
  rideNumber
  vehicleId
  customer
  mobile
  packageId
  baseMinutes
  baseAmount
  startedAt
  endsAt
  endedAt
  pausedAt
  totalAmount
  createdBy

businesses/{businessId}/rides/{rideId}/extensions/{extensionId}

businesses/{businessId}/queue/{queueId}

businesses/{businessId}/maintenance/{maintenanceId}

businesses/{businessId}/settings/main
businesses/{businessId}/pricingProfiles/{id}
businesses/{businessId}/packages/{id}
businesses/{businessId}/extensionProfiles/{id}
businesses/{businessId}/extensions/{id}
businesses/{businessId}/vehicleTypes/{id}
businesses/{businessId}/batteryTypes/{id}
```

## 6. Add Firebase SDK to this static GitHub Pages app

The current app does not use npm or a bundler. The simplest integration is to create `firebase.js` as an ES module and load Firebase's browser ESM modules. Firebase recommends npm/module bundlers for production, but browser ESM is supported and is the least disruptive migration for this existing static PWA.

Example `firebase.js`:

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "PASTE_FROM_FIREBASE",
  authDomain: "PASTE_FROM_FIREBASE",
  projectId: "PASTE_FROM_FIREBASE",
  storageBucket: "PASTE_FROM_FIREBASE",
  messagingSenderId: "PASTE_FROM_FIREBASE",
  appId: "PASTE_FROM_FIREBASE"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

await setPersistence(auth, browserLocalPersistence);

enableIndexedDbPersistence(db).catch((error) => {
  console.warn("Firestore offline persistence unavailable", error.code);
});
```

Before deploying, confirm the current Firebase SDK version from the official Firebase Web setup page rather than blindly copying an old version number.

## 7. Recommended sync strategy

Do **not** replace the whole current application state with one giant Firestore document.

Instead:

- keep each ride as its own Firestore document;
- keep each battery and vehicle as its own document;
- use real-time listeners for fleet, queue and active rides;
- write only the changed document;
- retain Firestore offline persistence so the counter can keep working during short internet outages;
- use server timestamps for cloud audit fields such as `createdAt`, `updatedAt`, and `completedAt`.

The local IndexedDB currently used by KAS should become either:

1. a migration source for the first upload, then Firestore becomes the source of truth; or
2. a lightweight app cache while Firestore owns authoritative shared data.

Option 1 is simpler and safer.

## 8. Initial local-to-cloud migration

When Firebase integration is added:

1. Owner signs in.
2. App checks whether the Firestore business has existing data.
3. If cloud is empty and local data exists, show:
   **Upload existing local KAS data to cloud?**
4. Upload vehicles, batteries, pricing, staff metadata, ride history, queue, settings and maintenance records in batches.
5. Write a migration marker like `migrationVersion: 1`.
6. Do not automatically repeat the import.

Keep the JSON Export Backup feature even after Firebase is enabled.

## 9. Firestore security model

Rules should use Firebase Auth `request.auth.uid` and the matching business user document.

High-level policy:

- Owner: full read/write within the KAS business.
- Operator: read/write only for modules/actions allowed by their permission document.
- Operators should never be able to promote themselves, edit their own permissions, modify owner identity, or delete audit/history records.
- Completed rides should generally be immutable; corrections should be adjustment/refund records rather than silent edits.

Do not ship with rules such as:

```text
allow read, write: if true;
```

## 10. Suggested production rules approach

Because permissions are granular, create a user document like:

```json
{
  "role": "operator",
  "active": true,
  "permissions": {
    "queue": true,
    "rides": true,
    "batteries": true,
    "batteryActions": false,
    "maintenance": false,
    "revenue": false
  }
}
```

Firestore Rules can then check role/active status, while especially sensitive actions should be restricted to Owner. For complex granular validation, keep rules conservative and move sensitive administrative actions to trusted backend code later if Blaze/Cloud Functions becomes appropriate.

## 11. Spark limits to watch

Cloud Firestore's free quota currently includes daily document read/write/delete limits and a storage allowance. The KAS workload with a few counter devices should normally be small, but inefficient real-time listeners can waste reads.

Avoid:

- listening to the entire historical rides collection all day;
- re-writing every vehicle each second for countdown timers;
- storing timer ticks in Firestore.

For timers, store only `startedAt`, `endsAt`, pause/resume events and extensions. Each device calculates the visible countdown locally from timestamps.

This is essential for both correctness and Firestore efficiency.

## 12. Multi-device conflict rules

When Firebase is connected, use transactions or atomic writes for operations where two devices could conflict:

- starting a ride on one vehicle;
- assigning/swapping a battery;
- claiming/removing the next queue customer;
- marking a vehicle maintenance/available;
- generating sequential ride numbers.

Do not rely only on the UI disabling a button.

## 13. GitHub Pages settings

Your Firebase authorized domains may need your live GitHub Pages host added in:

**Firebase Console → Authentication → Settings → Authorized domains**

Example host:

```text
yourusername.github.io
```

Do not include `https://` or the repository path in the authorized-domain entry.

## 14. What to send before the code integration

To wire Firebase into this KAS build, provide the Firebase web config object from **Project Settings → Your apps → Web app → SDK setup and configuration**.

Do not send service-account JSON, private keys, passwords or Google Cloud credentials.

The web `firebaseConfig` object is the correct information for a browser Firebase app.

## Recommended implementation order

1. Create Firebase project + Firestore + Auth.
2. Add Owner Firebase Auth login.
3. Add Firestore user/permission documents.
4. Sync vehicles and batteries.
5. Sync packages/settings.
6. Sync active rides and queue in real time.
7. Sync ride history and maintenance.
8. Add local-data migration.
9. Add strict Firestore Rules.
10. Test offline/reconnect and simultaneous-device scenarios before live use.


## EOD and expenses when Firebase is connected

Add separate Firestore collections/subcollections for:

- `expenses` — amount, category, paymentMethod, note, date, createdAt, createdBy.
- `eodClosings` — date, salesTotal, expenseTotal, netTotal, expectedCash, actualCash, note, closedAt, closedBy.

Do not overwrite ride history to make an EOD balance match. Corrections should remain separate records. EOD calculations should be derived from ride/Sumo payments and expense records, while the closing document stores the owner-confirmed snapshot and cash count.
