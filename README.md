# KAS RC Arena v3.6 — Local Role & Access Edition

Local-first PWA for KAS RC Arena. Firebase is intentionally not configured yet.

## Default logins
- Owner PIN: `1234`
- Operator 1 PIN: `1111`

## Role model
The Owner always has full access. The Owner can create multiple operator accounts in **Owner Hub → Staff & Access**, assign a separate PIN, disable an account, and choose which modules/actions each operator can use.

Operator permissions include Queue, Ride History, Battery Station, Battery Controls, Maintenance, and Revenue visibility. Core Arena ride operations remain available after operator login.

## Storage
Operational data is stored locally in IndexedDB. Use Owner Hub → Backup to export JSON backups regularly until Firebase is connected.


## QA
See `QA_REPORT.md` for the v3.6 code-review and operational checks.

## v3.7 mobile/PWA improvements
- Compact mobile header so the KAS brand and controls no longer consume excessive vertical space.
- Install button for supported Android/desktop browsers; iOS shows Add to Home Screen guidance.
- App-style browser/PWA back navigation: back closes an open modal first or returns Queue/Rides/Batteries to Arena before leaving the app.
- New Ride no longer auto-opens the keyboard; focused fields scroll into view above the software keyboard.
- Owner Hub redesigned as Owner Console with a simpler overview of Fleet, Batteries, Pricing, Staff, Maintenance and Settings.


## v3.11 battery visibility and timer-only stabilization
- KAS RC Arena remains **timer-based only**. No lap/race-counting mode has been added.
- Battery records are normalized on startup/import so older or incomplete local records remain visible.
- Battery Station now shows Total, Ready, In Use, Charging, Needs Charge and Issue filters.
- Newly added/saved batteries are highlighted and immediately available in Battery Station.
- Owner Battery Management shows total inventory and provides a direct **View Battery Station** action.
- Battery/vehicle assignment links are reconciled safely during startup.
- Timer packages and extensions are normalized to valid minutes/prices on load.
