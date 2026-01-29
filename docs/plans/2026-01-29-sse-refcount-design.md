# SSE Refcounting + Leak Prevention Design

**Date:** 2026-01-29

## Problem Summary
- Production SSE endpoint returns HTTP 429 due to low concurrent connection limit.
- Frontend likely churns or leaks SSE connections because multiple charts subscribe to the same device without ref counting.
- Current frontend uses a singleton SSE service, but `subscribeToMachine` uses a Set; unsubscribing once can remove a device still in use.

## Goals
- One SSE connection per purpose (data, alerts) shared across charts.
- Per-device reference counting so multiple charts can subscribe safely.
- Reliable cleanup on unmount, route change, and device change.
- Instrumentation to prove open/close lifecycle.
- Tests to prevent regression.
- Backend guardrails and logging to observe connections.

## Current State (Key Findings)
- Frontend uses `src/services/sse.ts` with two EventSource instances (data, alerts).
- Hooks and pages subscribe to `sseService` events and to devices.
- `subscribeToMachine` uses a Set and no ref counting → first unsubscribe can drop a device while other listeners still need it.
- Backend limits connections per IP and does not expose per-user/device limits.

## Proposed Architecture (Frontend)
- Keep `sseService` as singleton transport.
- Add `deviceRefCounts: Map<string, number>` inside `sseService`.
- `subscribeToMachine(deviceId)` increments count and returns `unsubscribe()`.
- Only remove device from `subscribedMachines` when refcount reaches 0.
- Only close data stream when there are **no** subscribed devices.
- Keep idempotent `connect()` and preserve ticket refresh logic.
- Add `subscribeToMachine` logging (debug) and EventSource lifecycle logging gated by `VITE_DEBUG_SSE`.

## React Lifecycle Usage
- Hooks/components use `useEffect` to subscribe and always call returned unsubscribe.
- Use `useCallback` for handlers to keep stable references.
- No direct `EventSource` usage in components.

## Backend Guardrails + Logging
- Add counters:
  - `activeConnectionsTotal`
  - `activeConnectionsByDeviceId`
  - `activeConnectionsByUserDevice` (userId + deviceId)
- Log on connect/disconnect: timestamp, connectionId, userId, deviceIds, IP.
- Improve 429 response to include structured data (no tickets) to aid debugging.
- Optional policy: if a new connection arrives for same user+device, close older ones (evaluate).

## Instrumentation
- Frontend logs: subscribe/unsubscribe, refcount, stream open/close/error, URL.
- Backend logs: lifecycle, counters, per-user/device totals.
- Optional `/sse/status` enhancements to expose per-device and per-user stats.

## Testing Strategy
- Frontend unit tests (Vitest) for refcounting behavior and ticket refresh handling.
- Frontend integration test (Playwright) to assert one SSE connection per deviceId.
- Backend script to open N connections and confirm counters/cleanup.

## Risks
- Ticket refresh must close old stream before creating a new one.
- If device list churns frequently, avoid excessive reopen; add small debounce.
- Must ensure no secrets are logged.

## Success Criteria
- One data SSE connection per device set; one alerts SSE connection per session.
- Unmounting last subscriber closes data stream.
- No increase in connection count across navigation.
- 429 no longer triggered under normal UI usage.
