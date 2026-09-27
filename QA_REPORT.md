# KAS RC Arena v3.6 — QA / Code Review

This build received a full code-level QA pass before packaging.

## Verified
- JavaScript syntax (`app.js`, `sw.js`)
- No duplicate HTML IDs
- All referenced inline SVG symbols exist
- All static buttons have an operational handler or delegated handler
- All dynamically rendered action buttons have matching handlers
- Manifest JSON is valid
- Service worker cache file list resolves to real project assets
- CSS brace structure is balanced
- Role-based navigation and Owner-only Owner Hub controls remain intact

## Fixed in v3.6
- Replaced the Owner Hub settings icon with a clean outlined cog SVG
- Removed an obsolete/dead Owner PIN modal left from the older access flow
- Fixed queue state so cancelling a queue-start flow cannot remove the wrong queued customer from a later manual ride
- Fixed battery-swap flow so merely opening the battery picker no longer pauses a live ride
- The ride is now paused only when a replacement battery is actually selected
- Added permission protection when removing queue entries
- Preserved legacy-v2 ride-to-vehicle mapping during migration
- Vehicle removal is now Archive/Restore so historical business records are preserved
- Added confirmations to destructive Owner actions (operator, battery, package, extension)
- Updated service-worker cache version and included the KAS logo in offline cache
- Added keyboard focus and interaction polish for buttons and fields
- Cleaned redundant revenue code

## Local-build limitation
Authentication/PINs are local-device access controls only. Firebase Auth / Firestore security should replace them when cloud sync is introduced.
