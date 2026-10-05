# KAS Activity Operations v4.0 — core upgrade

## Getting started
1. Export a JSON backup from the old system before updating.
2. Replace the deployed application files with this folder's contents. Keep the same origin to retain IndexedDB data. Serve over HTTPS or localhost; do not open index.html directly.
3. Owner login uses the existing PIN; fresh-install owner PIN is 1234 and operator PIN is 1111. Change these in Settings / Staff before use. Local PINs control the interface, not server-enforced security.
4. Owner → Pricing: launch package and extension are 3 minutes / ₹100. Both can be edited independently. First upgrade disables old package choices without deleting historical transactions.
5. Owner → Activities: set safe backup and reserve per battery type. Default 20 / 5 minutes. Eligibility uses exact milliseconds: a 3-minute ride can start at 12 minutes used, but another cannot start at 15.
6. Operator: START HYPER CAR recommends the least-used eligible car. Select payment and start. RETURNED completes an expired ride. Battery changes pause a running ride; physically install the replacement, then tap RESUME.
7. Owner → Partners & Finance: enter actual names, shares, contributions, and costs. Starting contribution balances are zero. Record operating costs in EOD. Allocate only the surplus you intend to split, leaving the rest unallocated. Record payouts separately.

## Included
- Configurable enabled timed activities and equipment types; new activities are disabled initially.
- Hyper Car launch configuration with editable price and duration.
- Sumo launch controls disabled; legacy Sumo history remains in accounting for compatibility.
- Safe-runtime checks on starts, extensions and replacement batteries.
- Per-charge cumulative driving estimate, live change notification and next-action panel.
- Equipment rotation and suggested compatible replacement batteries.
- Owner-only partner screen: capital, earnings coverage, actual capital returns, fixed historical profit allocations, payouts and remaining entitlement. Changing shares affects future allocations only.
- Existing local storage, charge performance, maintenance, timers, queue and EOD retained.

## Boundaries
- Future Drift Racing / RC Soccer currently support timed sessions only. Lap scoring, team matches and multi-car booking are not implemented.
- Queue retains the existing manual start flow; no background auto-start or activity-specific reservation engine.
- Battery estimates are not voltage telemetry. Charging completion and physical swaps require staff confirmation. An elapsed timer is not proof that a battery is charged.
- No new automatic maintenance thresholds, opening checklist, charging estimates, QR scanner, remote dashboard or accounting of asset depreciation/tax is included.
- Partner earnings coverage is operating surplus divided by contributions, not capital actually repaid. Investment entries represent funding, not an asset-purchase ledger. Payout eligibility is an allocation balance check, not proof of cash availability.
- Browser alarms cannot be guaranteed while a phone is locked or the browser is suspended. Timestamps reconstruct timers after reopening.
- Keep regular JSON backups. Local data and finance access are device-local; multi-device access requires a separately configured backend.

## Validation
JavaScript syntax checks and executable rule tests passed: migration, editable configuration defaults, exact reserve boundaries, live/paused battery usage, charge reset/history, and payout separation from operating costs. Full browser/mobile tests could not run because the environment has no browser executable. Test on the counter device before customer use.
