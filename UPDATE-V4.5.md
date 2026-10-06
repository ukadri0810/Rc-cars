# v4.5 — Counter-first navigation and focused equipment pages

## Start with the counter

Owner and operator sign-in both open Counter. Reopening a signed-in app also opens Counter, ready to record a sale. Business management remains available to the owner from the same navigation used for daily work.

There is one Menu on phones and tablets, and one sidebar on desktop. The separate Account dropdown and owner Menu are removed. Daily work appears first: Counter, Waiting, Transactions and Equipment. Owner-only business pages appear below, with descriptive labels. Test alarm, Install app when supported, and Sign out are at the bottom of the same menu.

Management pages have a direct **← Counter** button. Each tab opens as its own page at the top; it does not append content below the previous page. Back restores the previous owner page or equipment page. Unsaved settings still require a save or an explicit decision to discard.

## Equipment without a wall of battery cards

- **To do:** The default equipment page. See cars ready, spare batteries ready and grouped actions for battery changes, charging and service. An empty state clearly says when everything is ready.
- **Cars:** Search for a car, filter by readiness, and open one car for battery or maintenance actions.
- **Batteries:** Search by battery code, installed car or type. Filter Ready, Needs charge, Charging, Installed or In service. Only four compact rows appear per page on phones and six on larger screens, with Previous/Next controls and a total count.
- **Setup:** Owner only. Cars, battery inventory, hardware types and maintenance history have separate pages. Adding an item opens its own edit page. One item is edited at a time.

Battery and car details open on focused pages. Charging rows show the applicable action directly. Physical steps remain explicit: connect the charger before Start charging; confirm a completed charge before marking ready. Existing battery reserve rules, permissions and records are retained.

Equipment Back navigation restores the list's search, filter and page. Operator accounts see only permitted actions and do not see Setup. Equipment labels distinguish disabled activities and insufficient battery time from a car that is actually ready to run a saved package.

## A separate screen for a new session

New ride, extension, battery change, maintenance, queue and history forms now open as full-screen task pages with a clear Back button. Partner forms also use a full-screen layout. Browser Back closes a partner form first; it does not unexpectedly jump to another business page. Payment recording remains protected while a save is pending.

These are separate screens inside the app, rather than extra browser windows. This keeps navigation consistent in an installed mobile PWA. No windows, tabs or unrecorded rides accumulate after a task is closed. Starting a new ride still creates a new ride record, and recorded sessions continue running when navigation changes.

## Update

1. Export a JSON backup from Menu → Settings & backup → Backup & data.
2. Replace the complete application folder on the same site. Include all versioned assets, especially navigation-ui.js, equipment-ui.js, navigation.css, index.html and sw.js.
3. Open online, then close and reopen. Keep the same site address and retain browser data.

Existing local records, PINs, permissions, prices, battery history, investments and payments are retained. The navigation change does not reset the data. The release contains no test transactions or the 50-battery test stock.

## Verified

- Actual Owner PIN login and restored sessions open Counter.
- One navigation surface, stable header dimensions and one highlighted current page.
- Phone, tablet and desktop widths: 320, 390, 768 and 1366 pixels; no horizontal overflow or browser JavaScript errors.
- Owner tab history, direct Counter return, full-screen new ride forms, and Back from partner forms.
- A temporary 50-battery stock: four/six rows per page, paging, search, status actions and restoration of the prior search on Back.
- Inventory creation opens an individual edit page; existing pricing, battery policy and staff saves work.
- Operator permissions hide business pages, inventory setup and unavailable equipment controls.
- Battery safety/accounting tests and automatic payment, reserve, duplicate confirmation and cash-closing checks pass.
- A cached v4.4 upgrade retains records and works offline with the new navigation/equipment assets.

Developer checks: `node tests/rules.cjs`, `node tests/settlement.cjs`, and, with Playwright/Chromium installed, `node tests/navigation.cjs`, `node tests/workspace.cjs`, `node tests/finance.cjs`. To verify an upgrade, set `KAS_PREVIOUS_RELEASE` to an extracted v4.4 folder and run `node tests/upgrade.cjs`. `KAS_BROWSER_EXECUTABLE` selects a browser already installed on the machine. The older layout/UI test entry points now delegate to the corresponding real-browser suites.
