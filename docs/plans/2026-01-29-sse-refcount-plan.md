# SSE Refcounting & Leak Prevention Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure one shared SSE connection per device/topic with ref-counted subscriptions, reliable cleanup, and regression tests.

**Architecture:** Extend existing `sseService` singleton to track per-device ref counts and only close streams when the last subscriber unsubscribes. Keep existing ticket refresh + dual stream logic; add instrumentation and backend counters/logging.

**Tech Stack:** React 19 + TypeScript + Vite + Vitest (frontend), NestJS (backend), EventSource SSE.

---

### Task 1: Baseline connection map (frontend)

**Files:**
- Review: `src/services/sse.ts`
- Review: `src/hooks/useRealtimeData.ts`
- Review: `src/hooks/useSPCStreamAggregator.ts`
- Review: `src/pages/quality/SPCAnalysis.tsx`
- Review: `src/pages/iot/IoTData.tsx`
- Review: `src/hooks/useMachineAlerts.ts`
- Review: `src/hooks/useAlarms.ts`

**Step 1: List all EventSource creation sites**
- Command: `rg -n "new EventSource|sseService" src`
- Expected: only `src/services/sse.ts` creates EventSource

**Step 2: Build connection creation map**
- Output: note which hooks/components call `subscribeToMachine` and `connect()`

---

### Task 2: Add Vitest + test scripts (frontend)

**Files:**
- Modify: `package.json`
- Modify: `AGENTS.md`
- Create: `vitest.config.ts`
- Create: `src/services/__tests__/sse.refcount.test.ts`

**Step 1: Write failing test (refcounting)**
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sseService } from '@/services/sse'

class MockEventSource {
  static instances: MockEventSource[] = []
  readyState = 0
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) {
    MockEventSource.instances.push(this)
  }
  addEventListener() {}
  close() {
    this.readyState = 2
  }
}

(globalThis as any).EventSource = MockEventSource

describe('sseService refcount', () => {
  beforeEach(() => {
    MockEventSource.instances = []
  })

  it('creates one EventSource for two subscribers to same device', () => {
    const unsub1 = sseService.subscribeToMachine('C02')
    const unsub2 = sseService.subscribeToMachine('C02')
    expect(MockEventSource.instances.length).toBe(1)
    unsub1()
    expect(MockEventSource.instances.length).toBe(1)
    unsub2()
    expect(MockEventSource.instances[0].readyState).toBe(2)
  })
})
```

**Step 2: Run test to verify it fails**
- Run: `npm run test`
- Expected: FAIL (no test script yet)

**Step 3: Add test scripts + Vitest config**
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [],
    globals: true,
  },
})
```

**Step 4: Run tests to verify it still fails for logic**
- Run: `npm run test`
- Expected: FAIL (refcount not implemented)

**Step 5: Commit**
```bash
git add package.json AGENTS.md vitest.config.ts src/services/__tests__/sse.refcount.test.ts
git commit -m "test: add vitest harness and SSE refcount test"
```

---

### Task 3: Implement refcounting in `sseService`

**Files:**
- Modify: `src/services/sse.ts`

**Step 1: Write failing test for unsubscribe behavior**
```ts
it('keeps stream open until last unsubscribe', () => {
  const unsub1 = sseService.subscribeToMachine('C02')
  const unsub2 = sseService.subscribeToMachine('C02')
  unsub1()
  // stream should still be open
  expect(MockEventSource.instances[0].readyState).toBe(0)
  unsub2()
  expect(MockEventSource.instances[0].readyState).toBe(2)
})
```

**Step 2: Run tests to confirm fail**
- Run: `npm run test`
- Expected: FAIL

**Step 3: Implement refcount logic**
```ts
private deviceRefCounts = new Map<string, number>()

subscribeToMachine(deviceId: string): () => void {
  const nextCount = (this.deviceRefCounts.get(deviceId) ?? 0) + 1
  this.deviceRefCounts.set(deviceId, nextCount)
  if (nextCount === 1) {
    this.subscribedMachines.add(deviceId)
    if (!this.isEnabled) this.connect()
    else this.scheduleDataRefresh()
  }
  return () => this.unsubscribeFromMachine(deviceId)
}

unsubscribeFromMachine(deviceId: string) {
  const current = this.deviceRefCounts.get(deviceId)
  if (!current) return
  const nextCount = current - 1
  if (nextCount <= 0) {
    this.deviceRefCounts.delete(deviceId)
    this.subscribedMachines.delete(deviceId)
    if (this.subscribedMachines.size === 0) {
      this.clearDataRefresh()
      this.closeDataStream()
      this.setConnectionStatus('disconnected')
    } else {
      this.scheduleDataRefresh()
    }
  } else {
    this.deviceRefCounts.set(deviceId, nextCount)
  }
}
```

**Step 4: Run tests**
- Run: `npm run test`
- Expected: PASS

**Step 5: Commit**
```bash
git add src/services/sse.ts src/services/__tests__/sse.refcount.test.ts
git commit -m "fix: refcount SSE device subscriptions"
```

---

### Task 4: Update hooks/components to use unsubscribe closures

**Files:**
- Modify: `src/hooks/useRealtimeData.ts`
- Modify: `src/hooks/useSPCStreamAggregator.ts`
- Modify: `src/pages/quality/SPCAnalysis.tsx`
- Modify: `src/pages/iot/IoTData.tsx`
- Modify: `src/hooks/useMachineAlerts.ts` (if needed)

**Step 1: Write a failing test for stable subscriptions (optional)**
- Extend `sse.refcount.test.ts` with a rerender-style test (if hook test infra exists)

**Step 2: Update call sites**
```ts
useEffect(() => {
  const unsubscribe = sseService.subscribeToMachine(deviceId)
  return () => unsubscribe()
}, [deviceId])
```
- Ensure cleanup in all hooks uses returned unsubscribe.

**Step 3: Run tests**
- Run: `npm run test`
- Expected: PASS

**Step 4: Commit**
```bash
git add src/hooks/useRealtimeData.ts src/hooks/useSPCStreamAggregator.ts src/pages/quality/SPCAnalysis.tsx src/pages/iot/IoTData.tsx
git commit -m "refactor: use SSE unsubscribe closures"
```

---

### Task 5: Add frontend SSE instrumentation (gated)

**Files:**
- Modify: `src/services/sse.ts`
- Modify: `src/hooks/useRealtimeData.ts` (optional minimal logs)
- Modify: `.env.example` (optional)

**Step 1: Add debug flag + logs**
```ts
const DEBUG_SSE = import.meta.env.VITE_DEBUG_SSE === 'true'
if (DEBUG_SSE) logger.debug('SSE subscribe', { deviceId, count: nextCount })
```

**Step 2: Run tests**
- Run: `npm run test`
- Expected: PASS

**Step 3: Commit**
```bash
git add src/services/sse.ts .env.example
git commit -m "chore: add gated SSE instrumentation"
```

---

### Task 6: Backend logging + guardrails

**Repo:** `/Users/harrytu/Documents/my-projects/opcua-dashboard/backend/opcua-backend`

**Files:**
- Modify: `src/realtime-stream/realtime-stream.service.ts`
- Modify: `src/realtime-stream/realtime-stream.controller.ts`

**Step 1: Add counters + logs**
```ts
private readonly activeConnectionsByDeviceId = new Map<string, number>()
private readonly activeConnectionsByUserDevice = new Map<string, number>()
```
- Increment/decrement in `registerConnection`/`unregisterConnection`.
- Ensure logs exclude ticket values.

**Step 2: Add structured 429 response**
- Include per-user counts and device counts in response body.

**Step 3: Run backend tests (if any)**
- Run: `npm test` or existing test script
- Expected: PASS or document missing test script

**Step 4: Commit**
```bash
git add src/realtime-stream/realtime-stream.service.ts src/realtime-stream/realtime-stream.controller.ts
git commit -m "chore: add SSE connection counters and logs"
```

---

### Task 7: Backend verification script

**Repo:** `/Users/harrytu/Documents/my-projects/opcua-dashboard/backend/opcua-backend`

**Files:**
- Create: `scripts/sse-connection-burst.ts`

**Step 1: Implement script**
```ts
// Opens N EventSource connections and closes them after delay
```

**Step 2: Run script**
- Run: `ts-node scripts/sse-connection-burst.ts --count 5 --deviceId C02`
- Expected: server logs show counter increments then decrements

**Step 3: Commit**
```bash
git add scripts/sse-connection-burst.ts
git commit -m "test: add SSE burst verification script"
```

---

### Task 8: Integration test (Playwright)

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `tests/sse-connection.spec.ts`

**Step 1: Write failing test**
```ts
import { test, expect } from '@playwright/test'

test('single SSE connection per device', async ({ page }) => {
  await page.goto('http://localhost:5173/spc')
  const connections = page.context().request
  // Assert only one /sse/stream connection visible (or use mock)
})
```

**Step 2: Run to confirm fail**
- Run: `npx playwright test`
- Expected: FAIL until app running and logic in place

**Step 3: Update test to assert 1 connection**
- Use `page.route` or `page.on('request')` to count SSE URL hits

**Step 4: Commit**
```bash
git add tests/sse-connection.spec.ts playwright.config.ts package.json
git commit -m "test: add Playwright SSE connection guard"
```

---

### Task 9: Manual verification + writeup

**Files:**
- Create: `docs/plans/2026-01-29-sse-refcount-writeup.md`

**Step 1: Manual test**
- Open dashboard with 4 charts → confirm single data stream in logs
- Navigate away/back → confirm close/open only when last subscriber leaves
- Change deviceId → confirm old stream closed, new stream opened once

**Step 2: Writeup**
- What was broken
- What changed
- How to verify

**Step 3: Commit**
```bash
git add docs/plans/2026-01-29-sse-refcount-writeup.md
git commit -m "docs: add SSE refcount writeup"
```

---

## Notes
- Update `AGENTS.md` with test commands if new scripts are added.
- Ensure no tickets or secrets are logged in frontend or backend logs.
- Keep EventSource creation centralized in `sseService`.
