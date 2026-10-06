# KAS Activity Operations v4.1 — portal cleanup

## Owner portal
Owner sign-in opens a full-page workspace. Desktop uses a left sidebar; mobile uses one Menu button with the same sections:
Overview · Operations · Equipment · Activities & Pricing · Finance · Staff · Settings.

Switch to Counter is in the owner menu. Account → Owner portal returns from the counter. Account also contains alarm testing, installation and sign-out.

- Activity setup and package pricing share Activities & Pricing.
- EOD, expense entries and partner investment share Finance.
- Backup is inside Settings.
- Core setup uses explicit Save actions. Leaving edited fields does not save them. A navigation prompt protects unsaved edits.
- Inactive package choices are collapsed under Inactive options. Enable them with Available to staff, then Save.
- Normal owner pages and equipment selectors no longer show Sumo. Existing historical financial amounts are retained and appear as legacy sales only when present.

## Operator portal
Four tabs: Counter · Waiting · Equipment · Today. Desktop uses a sidebar; mobile uses a bottom bar.

- Counter prioritizes collection/battery actions and shows configured package duration/price.
- Expired rides display RETURNED; running rides display EXTEND. Pause, early ending, alarm acknowledgement and battery controls are under More.
- Installed — Resume confirms the operator is ready after a physical battery swap.
- More stays open across timer redraws.
- Customer names are optional: rides get customer numbers, waiting customers get Q-number tokens.
- Package choices that exceed the battery reserve are disabled.
- Staff accounts cannot access the owner workspace via normal controls.

## Updating
Export a JSON backup first. Replace all deployed files, including app.js, activity-os.js, portal-ui.js, style.css, index.html and sw.js. Keep the same site address to retain local data. The service worker cache version changes so the new scripts are available offline after a successful update. If an already-open tab shows old navigation, close it and reopen the app after the update.

Existing owner/operator PINs remain. Fresh setup uses owner 1234 and operator 1111; change these in Settings/Staff. This remains a local-first application; UI PINs are not server-enforced authorization.

## Validation
- JavaScript syntax checks passed.
- Existing battery and accounting rule tests passed.
- DOM integration tests passed for startup, owner menus, all owner sections without Sumo, explicit pricing save, draft protection, investment form, counter switching, operator tabs, ride/waiting tokens, timer redraw behavior and ride return.
- To repeat: `node tests/rules.cjs`. For UI tests, install jsdom as a development dependency, then `node tests/ui.cjs`.
- Visual browser tests could not run: no browser executable was available and browser installation failed. Check mobile/desktop layout and alarm behavior on the operating device before customer use.

This version changes navigation and interface flows. It retains v4.0's battery estimates and financial model; it does not add remote access, lap detection, team match scoring or charging sensors.
