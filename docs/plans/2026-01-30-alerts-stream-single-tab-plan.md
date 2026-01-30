# Alerts Stream Single-Tab Coordination Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure only one browser tab opens the alerts SSE stream while other tabs receive alerts via BroadcastChannel, with takeover only on user interaction.

**Architecture:** Add an alerts stream coordinator that uses a localStorage lock + heartbeat for leader election and BroadcastChannel for relaying alerts events. Gate `sseService` so alerts stream can be enabled/disabled and allow externally injected alert events to flow through existing listeners/toasts.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, BroadcastChannel, localStorage.

---

### Task 1: Add alerts stream gating + external event injection in SSE service

**Files:**
- Modify: `src/services/sse.ts`
- Test: `src/services/__tests__/sse.alerts-control.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sseService } from '@/services/sse'

type EventListener = (event: Event) => void

class MockEventSource {
  static instances: MockEventSource[] = []
  readyState = 0
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  private listeners = new Map<string, EventListener[]>()

  constructor(public url: string) {
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: EventListener) {
    const list = this.listeners.get(type) ?? []
    list.push(listener)
    this.listeners.set(type, list)
  }

  close() {
    this.readyState = 2
  }
}

describe('sseService alerts control', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    sseService.disconnect()
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ ticket: 'test-ticket', expiresInSeconds: 300 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
  })

  it('does not open alerts stream when alerts are disabled', async () => {
    sseService.setAlertsEnabled(false)
    sseService.connect()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const alertStreams = MockEventSource.instances.filter((instance) =>
      instance.url.includes('/sse/alerts')
    )
    expect(alertStreams.length).toBe(0)
  })

  it('emits externally received alerts events to listeners', () => {
    const handler = vi.fn()
    sseService.on('machine-alert', handler)

    sseService.receiveExternalEvent('machine-alert', {
      deviceId: 'C02',
      alertType: 'critical',
      message: 'Overheat',
      timestamp: new Date().toISOString()
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- sse.alerts-control.test.ts`
Expected: FAIL with "setAlertsEnabled is not a function" and "receiveExternalEvent is not a function".

**Step 3: Write minimal implementation**

```ts
// src/services/sse.ts
const ALERTS_EVENTS: SSEEventKey[] = ['system', 'machine-alert', 'alarm-update']

class SSEService {
  private alertsEnabled = true

  setAlertsEnabled(enabled: boolean) {
    if (this.alertsEnabled === enabled) return
    this.alertsEnabled = enabled
    if (!enabled) {
      this.closeAlertsStream()
      return
    }
    if (this.isEnabled) {
      this.openAlertsStream({ silent: true })
    }
  }

  receiveExternalEvent(eventName: SSEEventKey, payload: SSEEventMap[SSEEventKey]) {
    this.processEvent(eventName, payload)
  }

  onAlertsEvent(callback: (eventName: SSEEventKey, payload: SSEEventMap[SSEEventKey]) => void) {
    const handlers = ALERTS_EVENTS.map((eventName) => {
      const handler = (payload: SSEEventMap[SSEEventKey]) => callback(eventName, payload)
      this.on(eventName, handler)
      return () => this.off(eventName, handler)
    })
    return () => handlers.forEach((off) => off())
  }

  connect() {
    if (this.isEnabled) return
    this.isEnabled = true
    if (this.alertsEnabled) {
      this.openAlertsStream()
    }
    this.openDataStream()
  }

  private handleEvent(eventName: SSEEventKey, event: MessageEvent) {
    if (!event.data) return
    try {
      const payload = JSON.parse(event.data)
      this.processEvent(eventName, payload as SSEEventMap[SSEEventKey])
    } catch (error) {
      logger.error('Failed to parse SSE event', { eventName, error })
    }
  }

  private processEvent(eventName: SSEEventKey, payload: SSEEventMap[SSEEventKey]) {
    this.emit(eventName, payload)

    if (eventName === 'machine-alert') {
      this.handleMachineAlert(payload as MachineAlertEvent)
    }

    if (eventName === 'alarm-update') {
      this.handleAlarmUpdate(payload as AlarmUpdateEvent)
    }
  }

  private async openAlertsStream(options: { force?: boolean; silent?: boolean; reopenDelayMs?: number } = {}) {
    if (!this.isEnabled || !this.alertsEnabled) return
    // existing implementation...
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- sse.alerts-control.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/sse.ts src/services/__tests__/sse.alerts-control.test.ts
git commit -m "feat: gate alerts stream and allow external alerts events"
```

---

### Task 2: Add alerts stream coordinator (localStorage lock + BroadcastChannel relay)

**Files:**
- Create: `src/services/alertsStreamCoordinator.ts`
- Test: `src/services/__tests__/alertsStreamCoordinator.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AlertsStreamCoordinator } from '@/services/alertsStreamCoordinator'

class MockBroadcastChannel {
  static channels: Record<string, MockBroadcastChannel[]> = {}
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(public name: string) {
    MockBroadcastChannel.channels[name] = MockBroadcastChannel.channels[name] ?? []
    MockBroadcastChannel.channels[name].push(this)
  }

  postMessage(data: unknown) {
    for (const channel of MockBroadcastChannel.channels[this.name]) {
      if (channel !== this && channel.onmessage) {
        channel.onmessage({ data } as MessageEvent)
      }
    }
  }

  close() {
    MockBroadcastChannel.channels[this.name] = MockBroadcastChannel.channels[this.name]
      .filter((channel) => channel !== this)
  }
}

describe('AlertsStreamCoordinator', () => {
  beforeEach(() => {
    localStorage.clear()
    MockBroadcastChannel.channels = {}
    globalThis.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel
  })

  it('claims leadership immediately when no lock exists', () => {
    const setAlertsEnabled = vi.fn()
    const receiveExternalEvent = vi.fn()
    const onAlertsEvent = vi.fn(() => () => undefined)

    const coordinator = new AlertsStreamCoordinator({
      setAlertsEnabled,
      onAlertsEvent,
      receiveExternalEvent,
    })

    coordinator.start()

    expect(setAlertsEnabled).toHaveBeenCalledWith(true)
  })

  it('does not take over stale lock until user interaction', () => {
    const setAlertsEnabled = vi.fn()
    const receiveExternalEvent = vi.fn()
    const onAlertsEvent = vi.fn(() => () => undefined)

    const stale = { tabId: 'leader', expiresAt: Date.now() - 1000 }
    localStorage.setItem('mes_alerts_leader', JSON.stringify(stale))

    const coordinator = new AlertsStreamCoordinator({
      setAlertsEnabled,
      onAlertsEvent,
      receiveExternalEvent,
    })

    coordinator.start()
    expect(setAlertsEnabled).toHaveBeenCalledWith(false)

    coordinator.notifyUserInteraction()
    expect(setAlertsEnabled).toHaveBeenCalledWith(true)
  })

  it('relays alert events from leader to followers', () => {
    const leader = new AlertsStreamCoordinator({
      setAlertsEnabled: vi.fn(),
      onAlertsEvent: (callback) => {
        callback('machine-alert', { deviceId: 'C02', alertType: 'warning', message: 'Test' })
        return () => undefined
      },
      receiveExternalEvent: vi.fn()
    })

    const followerReceive = vi.fn()
    const follower = new AlertsStreamCoordinator({
      setAlertsEnabled: vi.fn(),
      onAlertsEvent: vi.fn(() => () => undefined),
      receiveExternalEvent: followerReceive
    })

    leader.start()
    follower.start()

    expect(followerReceive).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- alertsStreamCoordinator.test.ts`
Expected: FAIL with "AlertsStreamCoordinator is not a constructor".

**Step 3: Write minimal implementation**

```ts
// src/services/alertsStreamCoordinator.ts
const CHANNEL_NAME = 'mes-alerts-stream'
const LOCK_KEY = 'mes_alerts_leader'
const HEARTBEAT_MS = 5000
const LOCK_TTL_MS = 15000

type AlertsEventKey = 'system' | 'machine-alert' | 'alarm-update'

type CoordinatorDeps = {
  setAlertsEnabled: (enabled: boolean) => void
  onAlertsEvent: (callback: (eventName: AlertsEventKey, payload: unknown) => void) => () => void
  receiveExternalEvent: (eventName: AlertsEventKey, payload: unknown) => void
}

type LockPayload = {
  tabId: string
  expiresAt: number
}

export class AlertsStreamCoordinator {
  private tabId = crypto.randomUUID()
  private channel: BroadcastChannel | null = null
  private isLeader = false
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private offAlerts: (() => void) | null = null

  constructor(private deps: CoordinatorDeps) {}

  start() {
    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.onmessage = (event) => {
      const message = event.data as { type: string; eventName?: AlertsEventKey; payload?: unknown; sourceTabId?: string }
      if (message.type === 'alerts-event' && message.sourceTabId !== this.tabId) {
        if (message.eventName) {
          this.deps.receiveExternalEvent(message.eventName, message.payload)
        }
      }
    }

    if (this.canClaimLeadership(true)) {
      this.becomeLeader()
    } else {
      this.deps.setAlertsEnabled(false)
    }
  }

  stop() {
    this.resignLeader()
    this.channel?.close()
    this.channel = null
  }

  notifyUserInteraction() {
    if (this.isLeader) return
    if (!this.canClaimLeadership(false)) return
    this.becomeLeader()
  }

  private canClaimLeadership(isInitialCheck: boolean) {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return true

    try {
      const lock = JSON.parse(raw) as LockPayload
      const isExpired = lock.expiresAt <= Date.now()
      if (!isExpired) return false
      return isInitialCheck ? true : true
    } catch {
      return true
    }
  }

  private writeLock() {
    const payload: LockPayload = {
      tabId: this.tabId,
      expiresAt: Date.now() + LOCK_TTL_MS,
    }
    localStorage.setItem(LOCK_KEY, JSON.stringify(payload))
  }

  private becomeLeader() {
    this.isLeader = true
    this.deps.setAlertsEnabled(true)
    this.writeLock()
    this.heartbeatTimer = setInterval(() => this.writeLock(), HEARTBEAT_MS)

    this.offAlerts = this.deps.onAlertsEvent((eventName, payload) => {
      this.channel?.postMessage({
        type: 'alerts-event',
        eventName,
        payload,
        sourceTabId: this.tabId,
      })
    })
  }

  private resignLeader() {
    if (!this.isLeader) return
    this.isLeader = false
    this.offAlerts?.()
    this.offAlerts = null
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    const raw = localStorage.getItem(LOCK_KEY)
    if (raw) {
      try {
        const lock = JSON.parse(raw) as LockPayload
        if (lock.tabId === this.tabId) {
          localStorage.removeItem(LOCK_KEY)
        }
      } catch {
        // ignore
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- alertsStreamCoordinator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/alertsStreamCoordinator.ts src/services/__tests__/alertsStreamCoordinator.test.ts
git commit -m "feat: coordinate alerts stream leadership across tabs"
```

---

### Task 3: Wire coordinator into app lifecycle + user interaction takeover

**Files:**
- Create: `src/hooks/useAlertsStreamCoordinator.ts`
- Modify: `src/components/GlobalSSEManager.tsx`
- Modify (if needed): `src/services/sse.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAlertsStreamCoordinator } from '@/hooks/useAlertsStreamCoordinator'
import { sseService } from '@/services/sse'

vi.mock('@/services/sse', () => ({
  sseService: {
    setAlertsEnabled: vi.fn(),
    onAlertsEvent: vi.fn(() => () => undefined),
    receiveExternalEvent: vi.fn(),
  }
}))

vi.mock('@/services/alertsStreamCoordinator', () => {
  return {
    AlertsStreamCoordinator: class {
      start = vi.fn()
      stop = vi.fn()
      notifyUserInteraction = vi.fn()
    }
  }
})

describe('useAlertsStreamCoordinator', () => {
  it('initializes the coordinator and wires user interaction', () => {
    renderHook(() => useAlertsStreamCoordinator())
    expect(sseService.setAlertsEnabled).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- useAlertsStreamCoordinator.test.ts`
Expected: FAIL with "Cannot find module '@/hooks/useAlertsStreamCoordinator'".

**Step 3: Write minimal implementation**

```ts
// src/hooks/useAlertsStreamCoordinator.ts
import { useEffect, useRef } from 'react'
import { AlertsStreamCoordinator } from '@/services/alertsStreamCoordinator'
import { sseService } from '@/services/sse'

export function useAlertsStreamCoordinator() {
  const coordinatorRef = useRef<AlertsStreamCoordinator | null>(null)

  useEffect(() => {
    const coordinator = new AlertsStreamCoordinator({
      setAlertsEnabled: (enabled) => sseService.setAlertsEnabled(enabled),
      onAlertsEvent: (callback) => sseService.onAlertsEvent(callback),
      receiveExternalEvent: (eventName, payload) => sseService.receiveExternalEvent(eventName, payload),
    })
    coordinatorRef.current = coordinator
    coordinator.start()

    const notify = () => coordinator.notifyUserInteraction()

    window.addEventListener('pointerdown', notify, { passive: true })
    window.addEventListener('keydown', notify)
    window.addEventListener('focus', notify)

    return () => {
      window.removeEventListener('pointerdown', notify)
      window.removeEventListener('keydown', notify)
      window.removeEventListener('focus', notify)
      coordinator.stop()
      coordinatorRef.current = null
    }
  }, [])
}
```

```tsx
// src/components/GlobalSSEManager.tsx
import { useAlertsStreamCoordinator } from '@/hooks/useAlertsStreamCoordinator'

export function GlobalSSEManager({ children }: { children: ReactNode }) {
  useAlertsStreamCoordinator()
  useRealtimeData()

  return <>{children}</>
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- useAlertsStreamCoordinator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useAlertsStreamCoordinator.ts src/components/GlobalSSEManager.tsx
# include if mocks or test file were added
# git add src/hooks/__tests__/useAlertsStreamCoordinator.test.tsx
git commit -m "feat: initialize alerts stream coordination"
```

---

### Task 4: Adjust coordination to enforce takeover-on-interaction semantics

**Files:**
- Modify: `src/services/alertsStreamCoordinator.ts`
- Test: `src/services/__tests__/alertsStreamCoordinator.test.ts`

**Step 1: Write the failing test**

```ts
it('does not take over stale lock until notifyUserInteraction is called', () => {
  const setAlertsEnabled = vi.fn()
  const receiveExternalEvent = vi.fn()
  const onAlertsEvent = vi.fn(() => () => undefined)

  const stale = { tabId: 'leader', expiresAt: Date.now() - 1000 }
  localStorage.setItem('mes_alerts_leader', JSON.stringify(stale))

  const coordinator = new AlertsStreamCoordinator({
    setAlertsEnabled,
    onAlertsEvent,
    receiveExternalEvent,
  })

  coordinator.start()
  expect(setAlertsEnabled).toHaveBeenCalledWith(false)

  coordinator.notifyUserInteraction()
  expect(setAlertsEnabled).toHaveBeenCalledWith(true)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- alertsStreamCoordinator.test.ts`
Expected: FAIL if `start()` auto-claims stale lock without interaction.

**Step 3: Write minimal implementation**

```ts
// src/services/alertsStreamCoordinator.ts
start() {
  this.channel = new BroadcastChannel(CHANNEL_NAME)
  this.channel.onmessage = /* existing */

  const canClaim = this.canClaimLeadership(true)
  if (canClaim) {
    // only claim on start if no lock exists
    const hasLock = Boolean(localStorage.getItem(LOCK_KEY))
    if (!hasLock) {
      this.becomeLeader()
      return
    }
  }

  this.deps.setAlertsEnabled(false)
}

notifyUserInteraction() {
  if (this.isLeader) return
  if (!this.canClaimLeadership(false)) return
  this.becomeLeader()
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- alertsStreamCoordinator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/alertsStreamCoordinator.ts src/services/__tests__/alertsStreamCoordinator.test.ts
git commit -m "feat: enforce alerts takeover only on interaction"
```

---

## Notes / Decisions
- Lock key: `mes_alerts_leader` in localStorage.
- Broadcast channel name: `mes-alerts-stream`.
- Leader heartbeat updates `expiresAt` every 5s; lock TTL 15s.
- First tab claims leadership immediately only if no lock exists; stale lock requires user interaction to take over.
- Alerts events relayed: `system`, `machine-alert`, `alarm-update`.

## Manual Verification
- Open two tabs to the app, trigger an alert (or mock): only one tab opens `/sse/alerts` (network tab).
- Close leader tab, then interact with follower tab (click/keypress): follower becomes leader and starts `/sse/alerts`.
- Ensure toast alerts still show in both tabs via relay.
