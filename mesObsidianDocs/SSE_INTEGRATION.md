# SSE Integration (mes_frontend)

This doc describes how to integrate SSE in the current mes_frontend codebase
(React + TypeScript, api client, bearer token auth). It replaces the legacy
WebSocket flow.

## Review comments (alignment to codebase)
- Auth: frontend stores access tokens in localStorage as `auth_token` and
  `src/services/api.ts` injects `Authorization: Bearer <token>`. Cookie-based
  auth and `credentials: 'include'` are not used today.
- Realtime: SSE is handled by `src/services/sse.ts` (`sseService`) and
  `GlobalSSEManager`, with `useRealtimeData` coordinating subscriptions.
- Base URL: use `VITE_API_URL` for REST and SSE.

## Endpoints (backend)
- POST /auth/login
- POST /sse/stream-ticket
- GET /sse/stream?deviceId=<deviceId>&ticket=<ticket>
- Optional: POST /auth/logout (if the backend invalidates tokens)

## Frontend flow (aligned to repo patterns)

### 0) Config
- `const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'`
- Always send `Authorization: Bearer <token>` for REST calls and stream-ticket
  requests.

### 1) Login (bearer token)
Use the `api` client so the token is stored consistently.

```ts
const response = await api.login({ email, password })
api.setToken(response.access_token)
await api.getProfile()
```

### 2) REST calls (bearer token)
All REST calls should go through `src/services/api.ts`. It injects
`Authorization` and handles 401/403 errors.

### 3) Request SSE stream ticket
`EventSource` cannot send custom headers, so the stream uses a short-lived
ticket. Request the ticket via a normal fetch (or add a helper in `api`).

```ts
async function requestStreamTicket(ttlSeconds = 300) {
  const token = api.getToken()
  const res = await fetch(`${API_BASE}/sse/stream-ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ ttlSeconds }),
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ ticket: string; expiresInSeconds: number }>
}
```

### 4) Open SSE stream
Use the backend `deviceId` (stored as `machine.deviceId` in Redux; typically
the backend machineName). For multiple devices, pass a comma-separated
`deviceIds` list.

```ts
function openStream(deviceIds: string[], ticket: string) {
  const params = new URLSearchParams()
  if (deviceIds.length === 1) {
    params.set('deviceId', deviceIds[0])
  } else {
    params.set('deviceIds', deviceIds.join(','))
  }
  params.set('ticket', ticket)

  const url = `${API_BASE}/sse/stream?${params.toString()}`
  return new EventSource(url, { withCredentials: true })
}
```

### 5) Listen for SSE events
Event names and payload shapes align with `src/types/api.ts`. Use
`normalizeRealtimeData` and `normalizeSPCData` from
`src/utils/fieldMapping.ts`.

Common event names:
- machine-status
- realtime-update
- spc-update
- spc-series-update (if used)
- machine-alert
- alarm-update

```ts
stream.addEventListener('realtime-update', (event) => {
  const payload = JSON.parse(event.data) as RealtimeUpdateEvent
  const normalized = normalizeRealtimeData(payload)
  // dispatch(updateMachineStatus(...))
})
```

### 6) Reconnect strategy (ticket refresh)
`EventSource` auto-reconnects only while the URL is valid. If the ticket
expires, close and refresh the ticket with backoff.

```ts
function useMachineStream(deviceId: string | null) {
  const streamRef = useRef<EventSource | null>(null)
  const retryRef = useRef(0)

  useEffect(() => {
    if (!deviceId) return
    let cancelled = false

    const connect = async () => {
      try {
        const { ticket } = await requestStreamTicket()
        if (cancelled) return
        const stream = openStream(deviceId, ticket)
        streamRef.current = stream

        attachListeners(stream)

        stream.onerror = () => {
          stream.close()
          retryRef.current += 1
          const delay = Math.min(10000, 1000 * 2 ** retryRef.current)
          setTimeout(connect, delay)
        }
      } catch {
        retryRef.current += 1
        const delay = Math.min(10000, 1000 * 2 ** retryRef.current)
        setTimeout(connect, delay)
      }
    }

    connect()
    return () => {
      cancelled = true
      streamRef.current?.close()
    }
  }, [deviceId])
}
```

### 7) Logout
Close SSE streams before clearing auth. Current frontend logout is local only
(`api.setToken(null)` in `AuthContext`). Add a backend logout call only if the
server supports token invalidation.

```ts
function logout(stream: EventSource | null) {
  stream?.close()
  api.setToken(null)
}
```

## Best practice review
- OK: stream tickets avoid putting bearer tokens in the SSE URL.
- OK: normalization functions in `src/utils/fieldMapping.ts` should still be
  used with SSE payloads.
- OK: realtime plumbing is unified under `sseService` + `GlobalSSEManager`.
- OK: `VITE_WS_URL` is removed from env config and UI is labeled as realtime.
- Recommended: server should emit heartbeat events and/or `retry:` hints so the
  client can recover from silent disconnects.
- Recommended: if many machines are shown, avoid one EventSource per machine;
  prefer a multiplexed stream (server supports multiple deviceIds or `all`).
