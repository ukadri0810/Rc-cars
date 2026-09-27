# KAS RC Arena

Offline-first Progressive Web App for KAS RC Arena. This build does **not** use Firebase yet. All data is stored on the current device in browser localStorage, with JSON backup/import.

## Included

- Operator PIN login and Owner PIN login
- Live Arena dashboard
- Dynamic vehicle types and fleet (cars, boats, excavators, trucks, future RC vehicles)
- Configurable pricing profiles and packages
- Configurable extension profiles and extension prices
- Persistent ride timers based on timestamps
- Warning state and audible/vibration time-up alert
- Pause/resume rides
- Ride completion and ride history
- Waiting queue
- Cash / UPI / Other payment recording
- Battery inventory and battery station
- Ready / In Use / Charging / Maintenance battery states
- Battery-to-vehicle assignment and quick battery swap
- Battery compatibility by vehicle type
- Battery cycle tracking
- Owner dashboard with sales and vehicle performance
- Local backup export/import
- Installable PWA with service worker/offline shell
- Responsive phone/tablet/desktop UI
- Repository-style Store class so Firebase can replace local persistence later without redesigning the UI

## Default demo setup

- 2 RC cars
- 7 total batteries: 2 installed + 5 spare
- Standard: 5 min / ₹200
- Fun Ride: 10 min / ₹350
- Pro Ride: 15 min / ₹500
- Extensions: +2 min ₹80, +3 min ₹100, +5 min ₹150

## Default PINs

- Operator: `1111`
- Owner: `1234`

Change these immediately in **Owner → Business**.


## Important: do not double-click index.html

This project uses ES modules and PWA/service-worker features. Modern browsers block parts of these when the page is opened directly with a `file://` URL, which can result in a blank page.

On Windows, simply double-click:

```text
START_KAS_RC_ARENA.bat
```

It starts the included local server and opens `http://localhost:4173` automatically.

## Run locally

Requires Node.js 18+.

```bash
npm start
```

Open:

```text
http://localhost:4173
```

For testing on a phone connected to the same Wi-Fi, run the project on your computer and open your computer's LAN IP with port 4173. PWA/service-worker behavior is guaranteed on localhost or HTTPS; for production hosting use HTTPS.

## Data storage

Current build stores operational data in browser `localStorage` under:

```text
kas_rc_arena_v1
```

Use **Owner → Backup → Export JSON Backup** regularly until Firebase is connected.

## Firebase migration path

The UI talks through `js/store.js`. In the Firebase version, replace persistence/auth methods in this layer with Firebase Auth + Firestore while preserving the page and workflow code. Recommended future collections:

- users
- vehicleTypes
- vehicles
- pricingProfiles
- packages
- extensionProfiles
- extensions
- batteryTypes
- batteries
- rides
- payments
- queue
- batteryLogs
- maintenance
- auditLogs
- settings

## Important note

This version is designed for one active operating device. Local storage is device-specific and is not suitable for simultaneous multi-device operation. Firebase synchronization should be added before using multiple operator devices at the same time.
