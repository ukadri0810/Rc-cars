# v4.2 — portal visibility and Account menu fixes

The owner workspace and counter are now mutually exclusive through native hidden attributes, synchronized after login, portal switching, rendering and reload. Owner pages begin directly below the header. Operator bottom tabs are hidden while the owner workspace is open.

Account uses a button and a separate fixed overlay outside the header. Opening it cannot add height to the header. Tap outside, press Escape, choose an action or resize to dismiss it.

Base styles, portal styles and all application scripts have versioned URLs. Portal styling is now in portal.css. The new service worker preloads the matching release and removes obsolete KAS caches while retaining IndexedDB business data. This avoids mixing a new page with old unversioned CSS/scripts.

## Install this update
1. Export your JSON backup first.
2. Replace the full application folder on your existing site, including the new portal.css file and updated index.html, scripts, styles and sw.js.
3. Open the app online, then close it and reopen once. On desktop, a hard reload also fetches the new page. Keep the same site address to retain local records.
4. Do not clear website data or reset the application as an update step; that could erase local business records.

## Verification
Real Chromium tests passed at 390×844 and 1366×900:
- owner workspace directly under the header;
- counter and operator navigation hidden in owner mode;
- unchanged header bounding box when Account opens;
- fixed-position dropdown and Escape dismissal;
- mobile Menu behavior and switches between portals;
- correct role layout after render and reload;
- no horizontal overflow or JavaScript errors.

A cached v4.1 → v4.2 upgrade was tested with intentionally stale CSS under the old service worker. The new styles loaded, session/revenue records persisted, old caches were retired, and offline reload worked.

Battery/accounting rule tests passed. Screenshot inspection completed for mobile Finance and desktop Overview. These tests validate browser layout and upgrade behavior; check the device's alarm volume separately.

Developer regression checks: node tests/rules.cjs; install Playwright locally and its Chromium browser, then node tests/layout.cjs. An existing browser can be selected with KAS_BROWSER_EXECUTABLE. Optional screenshots go to KAS_QA_SCREENSHOT_DIR.
