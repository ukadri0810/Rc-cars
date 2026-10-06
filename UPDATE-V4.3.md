# v4.3 — Partners & Investment dashboard

Open Owner → Finance → Partners & investment.

## What changed
- Four summary cards: total invested, net earnings, available to allocate, and profit still payable.
- Investment coverage progress shows net earnings compared with contributions. Actual capital returned is displayed separately.
- An earnings breakdown connects completed sales, operating costs, net earnings and profit allocations.
- Each partner has a balance card with invested amount, allocated profit, money paid, capital returned and the remaining profit payable. A progress bar shows how much allocated profit has been paid.
- A visual profit-split bar shows the current agreement for future allocations.
- Searchable money history includes investments, payouts, capital returns and allocations, with entry/partner filters and eight records per page.
- Entry forms now open in focused dialogs: Record money, Allocate profit, and Edit partners & shares. Allocation previews calculate each partner's share before saving.

## What the numbers mean
Investment coverage is an earnings comparison, not cash returned. Available to allocate is unassigned net earnings, not cash available in a bank account. Capital returns and profit payouts remain separate from operating costs. Historical allocations keep their saved split when you edit future percentages.

The existing finance model and records are retained. New entries include a creation timestamp for chronological history. No demonstration investments or sales are included in the application; the screenshots used during testing came from a temporary browser test.

## Update
Export a JSON backup. Replace the complete folder on the same site, including finance.css, finance-ui.js and the updated versioned page/service worker. Open online, then close and reopen. Do not clear website data.

## Verified
- Real Chromium at mobile 390×844 and desktop 1366×900.
- Investment entries, allocation previews, saved splits, payouts and capital returns.
- Contributions/payouts do not alter operating earnings.
- Changing current percentages preserves earlier allocations.
- Ledger search, filters, paging and zero-record states.
- No horizontal overflow or browser JavaScript errors.
- Existing role/header layout regression and battery/accounting checks passed.
- Old-cache upgrade and offline reopening passed with records retained.

Developer checks: node tests/rules.cjs; install Playwright and Chromium, then node tests/layout.cjs and node tests/finance.cjs. KAS_BROWSER_EXECUTABLE selects an existing browser, and KAS_QA_SCREENSHOT_DIR optionally captures screenshots.
