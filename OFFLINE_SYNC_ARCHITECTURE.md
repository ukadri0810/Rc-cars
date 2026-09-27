# KAS RC Arena — Offline-first cloud sync architecture

## Operating rule
The counter app must never depend on internet availability. Every operator action is committed to the local IndexedDB first. The UI responds immediately. Cloud sync is secondary and runs only when connectivity is available.

## Local-first flow
1. Operator starts/extends/pauses/completes a ride.
2. The in-memory model updates immediately.
3. The full local state is persisted to IndexedDB.
4. A local dirty marker is set.
5. The UI continues without waiting for Firebase.
6. When internet is available, the sync coordinator uploads pending changes.

## Non-intrusive sync rule
Cloud sync must NEVER blur an input, close the keyboard, close a modal, change the active tab, or rebuild a form while the operator is typing.

The included sync coordinator checks whether an input/textarea/select is focused. If the user is interacting, cloud reconciliation is deferred. A remote state is stored in memory and applied only at a safe checkpoint after focus leaves the form.

## Firebase adapter contract
When Firebase is added, create a module that exposes:

```js
window.KAS_CLOUD_SYNC = {
  async pushState(localState) { /* write pending entities/changes to Firestore */ },
  async pullState() { /* return merged/newer cloud state, or null */ }
};
```

The adapter must NOT call `render()`, `focus()`, `blur()`, close modals, or change navigation. The coordinator owns safe UI application.

## Recommended production evolution
For multi-device production, move from one full-state snapshot to an operation/outbox model. Persist each mutation locally with a unique operation id:

- `ride.created`
- `ride.extended`
- `ride.paused`
- `ride.resumed`
- `ride.completed`
- `battery.assigned`
- `battery.statusChanged`
- `queue.added`
- `queue.removed`

Each outbox record should include `opId`, `deviceId`, `entityId`, `type`, `payload`, `createdAt`, and `syncStatus`. Firebase acknowledges each op idempotently. This prevents duplicate writes when connectivity drops during sync.

## Conflict rules
- Active ride timing: use immutable `startedAt`, `endsAt`, pause/extension events.
- Completed rides: never silently overwrite; use event history.
- Owner settings: last-write-wins is acceptable initially, but record `updatedAt` and `updatedBy`.
- Battery assignment: resolve on server with the newest valid assignment and audit the conflict.
- Operator permissions: cloud is authoritative when connected; last known local permissions remain usable offline until next sync.

## Connectivity status
The header now shows a small status indicator:
- green: local/synced
- amber: offline or pending
- blue pulse: syncing
- red: sync error

On mobile it collapses to a dot so it does not consume header space.

## Important
Do not use a Firebase listener that directly calls the global `render()` on every snapshot. That is exactly what can close a mobile keyboard or reset an in-progress form. Buffer remote updates and apply them only at safe checkpoints.
