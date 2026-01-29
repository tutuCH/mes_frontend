# SSE Backend Update Spec (alerts + data split)

This document describes the backend changes needed to support two SSE streams:
1) A low-volume, always-on alerts stream.
2) A scoped data stream used only when charts are active.

The goal is to reduce bandwidth and avoid hitting the per-IP connection limit
while preserving realtime alerts across the app.

## Goals
- Keep a single always-on SSE stream for alerts/alarms.
- Open a separate SSE stream for chart data only when needed.
- Support up to 50 devices without streaming all data by default.
- Work with cookie-based auth in browsers and Bearer auth for non-browser clients.
- Provide clear CORS behavior for EventSource with credentials.

## Endpoints

### 1) Stream ticket
Endpoint
- POST /sse/stream-ticket

Auth
- Requires JWT (global guard).
- Accepts either:
  - HTTP-only access_token cookie (browser, preferred), or
  - Authorization: Bearer <token> (non-browser clients).

Request body
```json
{
  "ttlSeconds": 300,
  "purpose": "alerts" | "data" // optional, for logging/analytics
}
```
Rules
- ttlSeconds default 300, min 60, max 3600.

Response
```json
{
  "ticket": "<stream-ticket>",
  "expiresInSeconds": 300
}
```

### 2) Alerts stream (always-on)
Endpoint
- GET /sse/alerts?ticket=<ticket>

Behavior
- Emits alert-related events only.
- No deviceId filters required.

Events
- event: machine-alert
- event: alarm-update
- event: system (heartbeat)

### 3) Data stream (scoped)
Endpoint
- GET /sse/stream?ticket=<ticket>&deviceId=<id>
- GET /sse/stream?ticket=<ticket>&deviceIds=<id1,id2,...>

Behavior
- Emits data events for the provided device(s) only.
- If deviceIds is provided, it takes precedence over deviceId.

Events
- event: machine-status
- event: realtime-update
- event: spc-update
- event: spc-series-update (optional)
- event: system (heartbeat)

## Event payloads (shape)
Keep payloads aligned with frontend types in `src/types/api.ts`.

Example: machine-status
```json
{
  "deviceId": "C02",
  "data": { "devId": "C02", "Data": { "OT": 57, "STS": 2 } },
  "source": "cache",
  "timestamp": "2026-01-28T21:23:33.370Z"
}
```

Example: realtime-update
```json
{
  "deviceId": "C02",
  "data": { "devId": "C02", "Data": { "T1": 220, "OT": 57 } },
  "timestamp": "2026-01-28T21:23:33.372Z"
}
```

Example: spc-update
```json
{
  "deviceId": "C02",
  "data": { "devId": "C02", "Data": { "CYCN": 8810, "ECYCT": 36.61 } },
  "timestamp": "2026-01-28T21:23:33.477Z"
}
```

Example: machine-alert
```json
{
  "deviceId": "C02",
  "alertType": "warning",
  "message": "Oil temperature high",
  "timestamp": "2026-01-28T21:23:33.477Z"
}
```

Example: alarm-update
```json
{
  "deviceId": "C02",
  "alarm": { "code": "A101", "message": "Overheat" },
  "timestamp": "2026-01-28T21:23:33.477Z"
}
```

## CORS requirements (EventSource + credentials)
When `withCredentials: true` is used on the frontend:
- Access-Control-Allow-Origin must be the exact origin (e.g. http://localhost:5173)
- Access-Control-Allow-Credentials must be true
- Do not use wildcard origin for SSE with credentials

## Connection limits
- Enforce per-IP or per-user limits, but reserve capacity for 2 streams:
  - 1 alerts stream
  - 1 data stream
- If rejecting connections, return 429 with a clear JSON body.

## Heartbeats
- Emit a `system` event every 15-30 seconds to prevent idle timeouts:
```
event: system
data: { "kind": "heartbeat", "ts": "2026-01-28T21:23:30.211Z" }
```
- Consider `retry: 3000` lines to guide client reconnects.

## Ticket validation logic
Pseudo-flow for stream endpoints:
1) Validate ticket exists and is not expired.
2) Check ticket purpose if provided (alerts vs data).
3) If data stream: validate deviceId(s) format and access permissions.
4) Start stream, register connection in a per-user registry.
5) On disconnect, clean up registry entry.

## Ticket storage (DB / cache)
Recommended: store tickets in Redis (fast TTL).

Suggested schema (Redis key):
- key: sse:ticket:<ticket>
- value: JSON payload
```json
{
  "userId": 1,
  "purpose": "alerts",
  "issuedAt": "2026-01-28T21:23:30.211Z",
  "expiresAt": "2026-01-28T21:28:30.211Z"
}
```

If persistent DB is required, table example:
- table: sse_tickets
  - id (uuid / string, PK)
  - user_id (int, FK)
  - purpose (varchar)
  - issued_at (timestamp)
  - expires_at (timestamp)
  - metadata (jsonb, optional)

## Error behavior
- 401 if auth missing/invalid.
- 403 if user cannot access requested device(s).
- 404 if endpoint missing (do not respond 200).
- 429 if connection limit exceeded.

Note: EventSource treats non-200 as a network error; ensure errors are
intentional and logged. Prefer 401/403/429 to reveal exact cause.

## Frontend expectations
- Alerts stream is opened once after login and stays active globally.
- Data stream is opened only when charts are active and scoped to selected machine(s).
- The data stream may reconnect with a fresh ticket when deviceIds change.
