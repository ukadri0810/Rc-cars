# v4.4 — Automatic partner payments and consistent workspaces

## Pay partners without entering an allocation

Open Owner → Finance → Partners & investment → **Pay partners**, or use **Pay [partner name]** on an individual card.

The summary automatically adds the selected partner's existing unpaid balance and their share of new unallocated net earnings. Keep a reserve if needed, choose Cash or UPI, then confirm after paying. One confirmation saves the allocation and payment records together. This records a payment; it does not initiate a bank or UPI transfer.

- No allocation amount to calculate or re-enter. The saved profit percentages determine each share.
- Paying one partner allocates new profit to both partners and pays only the selected partner. The other partner's saved balance remains due.
- Future percentage changes do not alter earlier allocations.
- The reserve is remembered. Open the payment summary again to reduce it and release retained earnings.
- Repeated confirmation while saving is blocked. A saved payment identifier cannot be recorded twice.
- If balances change while the summary is open, reopen it before confirming. A storage failure shows an error and restores the in-memory finance records.
- New payments show their payment method in money history. Manual entries remain available under Record money, and manual allocation is under Advanced.
- Cash investments, capital returns and payouts are included in expected cash for daily and range reconciliation. Older entries without a payment method are not assumed to be cash. Payments and capital returns remain separate from operating expenses.

Available earnings are calculated from completed session revenue minus recorded operating costs and previous allocations. They are not a bank balance. Confirm the money that actually moved.

## Consistent owner and operator screens

- Overview: daily numbers, next actions, cash/UPI breakdown and activity performance.
- Operations: clear launches for the counter, waiting queue and equipment station.
- Equipment: readiness cards, estimated driving time with the battery reserve excluded, a compact battery rack and collapsed inventory setup.
- Activities: enabled/disabled status, saved package prices and easy-to-read safe battery rules. Editing remains available on each card.
- Packages: clearly labelled price/duration fields and a summary for each saved option.
- Staff: operator cards, masked PIN fields and grouped permissions.
- Settings and backup: focused cards with explicit save/export/restore actions.
- Sales and closing: matching metric cards, tables and cash checks, with review required when cash movements change after closing.
- Counter, waiting, transactions and equipment: matching cards, readable labels and comfortable mobile buttons. The Time up colour now matches the urgent ride state.

The owner workspace continues to open directly under the fixed header. Account opens as an overlay. Legacy Sumo controls remain hidden. Prices, session durations, safe battery backup and reserves remain editable.

## Install the update

Export a JSON backup from Owner → Settings → Backup & data. Replace the complete application folder on the same site with this release. Include index.html, sw.js and all CSS/JS files, especially settlement.js, workspace-ui.js and workspace.css. Open online, then close and reopen the app. Keep the same site address and do not clear browser storage.

Existing IndexedDB records and historical financial entries are retained. New settlement history and reserve fields are added on load. No test sales or investments are included in the release.

## Validation

- Battery rules and reserve boundaries, charge history, active/paused usage and finance separation.
- Automatic payouts with existing balances, reserves, exact cents, single-partner payments, saved shares, stale proposals, repeated identifiers, owner access and storage failure rollback.
- Real Chromium: all owner and operator tabs, editable settings, inventory/staff saves, payment preview, repeated clicks, ride return and queue flow.
- Responsive checks at 320, 390, 768 and 1366 pixels, including horizontal overflow and browser errors.
- Cash/UPI handling, day/range cash totals and closing review after cash changes.
- A cached v4.3 upgrade to v4.4 retains existing investment/allocation/session records. The new payment survives an offline reload.

Developer checks: `node tests/rules.cjs`, `node tests/settlement.cjs`, and, with Playwright/Chromium installed, `node tests/layout.cjs`, `node tests/finance.cjs`, `node tests/workspace.cjs`. Set `KAS_PREVIOUS_RELEASE` to an extracted v4.3 folder to run `node tests/upgrade.cjs`. `KAS_BROWSER_EXECUTABLE` selects an installed Chromium executable.
