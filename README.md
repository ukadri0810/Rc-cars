# KAS RC Arena v3.13 — Simplified Equipment Operations

Local-first PWA for KAS RC Arena. Firebase is intentionally not configured yet.

## Default logins
- Owner PIN: `1234`
- Operator 1 PIN: `1111`

## Role model
The Owner always has full access. The Owner can create multiple operator accounts in **Owner Console → Staff & Access**, assign a separate PIN, disable an account, and choose which modules/actions each operator can use.

Operator permissions include Queue, Ride History, Equipment, Equipment Controls, Maintenance, Sumo Battle, and Revenue visibility. Core Arena ride operations remain available after operator login.

## Storage
Operational data is stored locally in IndexedDB. Use Owner Console → Backup to export JSON backups regularly until Firebase is connected.


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


## v3.12 - RC Sumo Battle

This build adds RC Sumo as a separate activity without changing the existing timer-based rental workflow.

- Dedicated Sumo operator tab
- 4 or 5 player matches
- Separate Sumo packages with per-player or per-match pricing
- Optional maximum match timer (0 = no time limit)
- Assign one RC Sumo vehicle to each player
- Manual elimination, undo last elimination and winner detection
- Time-up alarm and acknowledgement
- End-as-draw option when time expires with multiple players remaining
- Sumo match history and revenue reporting
- Sumo groups can be added to the existing queue
- Owner Console > Activities manages Sumo pricing and quick-add Sumo vehicles
- Staff & Access includes a separate Sumo Battle permission
- Existing timed ride packages remain timer-only

To use Sumo for the first time, open Owner Console > Activities, add at least four Sumo vehicles, then open Owner Console > Equipment. The system recommends compatible ready batteries and you can assign them with one tap.


## v3.13 — simplified equipment operations

Day-to-day fleet and battery work is now command based instead of configuration based.

- Operator **Batteries** is renamed **Equipment**.
- Equipment combines vehicle state, battery assignment, charging and maintenance in one screen.
- An **Attention** panel tells the user exactly what needs action.
- A vehicle with no battery gets an automatic recommended compatible battery based on least usage.
- One tap assigns the recommended battery; changing an installed battery shows the recommended choice first.
- Old batteries automatically move to **Needs Charge** after a swap.
- Charging workflow is reduced to **Start Charging → Mark Ready**.
- Vehicle issue workflow is **Report Issue → Mark Ready**.
- Owner Console now has one **Equipment** module instead of separate Fleet, Batteries and Maintenance tabs.
- Detailed vehicle/battery editing still exists but is collapsed under **Inventory & Advanced Setup**.
- Maintenance history is collapsed under Equipment so it does not clutter daily operations.
- Physical actions are never falsely inferred: the user confirms/install/charge actions, and the system handles status, assignment, availability and records automatically.
