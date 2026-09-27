# KAS RC Arena v3.7 Mobile QA

Changes in this build:
- Reduced mobile topbar footprint and converted header actions to icon-first controls.
- Added PWA installation flow using `beforeinstallprompt` where supported.
- Added iOS installation instructions fallback.
- Added History API navigation so tab changes and modals behave more like native app screens.
- Removed forced autofocus from New Ride to stop the keyboard covering package/payment controls.
- Added VisualViewport handling and input scroll-into-view support while the mobile keyboard is open.
- Redesigned the Owner landing experience into a clearer Owner Console with module cards.
- Bumped service-worker cache to v3.7 so deployed clients receive the new shell.

Validation performed:
- `node --check app.js`
- `node --check sw.js`
- manifest JSON parse


## v3.15 crowded-counter checks
- New Ride action footer remains accessible while the form scrolls.
- Five operational bottom-nav items fit without page-level horizontal scrolling.
- EOD metrics reflow to two columns on phone widths.
- Expense modal is layered above Owner Console and can be completed without closing Owner Console.
- EOD close form becomes one column on narrow screens.
