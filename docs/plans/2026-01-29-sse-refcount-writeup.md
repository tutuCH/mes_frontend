# SSE Refcounting Fix Writeup

## What was broken
- `sseService.subscribeToMachine` used a Set without reference counting.
- Multiple charts subscribing to the same `deviceId` could cause early unsubscription when one chart unmounted.
- That triggered stream close/reopen churn and could create extra concurrent connections, leading to 429s under load.

## What changed
- Added per-device ref counts in `sseService`; `subscribeToMachine` now returns an `unsubscribe()` closure and only removes a device when the refcount hits 0.
- Updated hooks/pages to use the returned unsubscribe closure (instead of calling `unsubscribeFromMachine` directly).
- Added gated SSE instrumentation via `VITE_DEBUG_SSE`.
- Added Vitest unit tests for refcount behavior.
- Added Playwright e2e guard to assert only one data stream is created for the session.
- Backend: added connection counters by device and user-device, enhanced 429 bodies, and structured connect/disconnect logs including ticketId when present.
- Added a backend SSE burst script for manual verification.

## How to verify manually
Frontend:
1. Run backend: `npm run start:dev` (backend repo)
2. Run frontend: `npm run dev` (frontend repo)
3. Open `/spc` with multiple charts; confirm only one `/sse/stream` connection in backend logs.
4. Navigate away and back; confirm no leaked connections in `/sse/status`.
5. Change device selection; confirm old connection closes and a new one opens once.

Backend:
1. Get a token (login) and call `/sse/status` to view counters.
2. Run `ts-node scripts/sse-connection-burst.ts --count 5 --deviceId C02` and verify counters increment then decrement.

## Tests run
- Frontend unit tests: `npm run test`
- Frontend e2e: `npm run test:e2e`
- Backend unit test: `npm test -- realtime-stream/realtime-stream.service.spec.ts`
