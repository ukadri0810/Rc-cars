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
