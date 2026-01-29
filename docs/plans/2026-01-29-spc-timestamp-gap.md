# SPC Timestamp Gap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the visual gap between REST history and SSE live points by standardizing timestamp parsing to epoch-ms and validating field mapping, with instrumentation and tests.

**Architecture:** Introduce a canonical chart point transform (`{ x: epochMs, y: number }`) for both REST and SSE paths. Add explicit timestamp field selection and UTC parsing for SSE. Instrument both frontend and backend to log the exact timestamps used and their deltas. Ensure Chart.js time scale consumes epoch-ms with `parsing: false` and that merged arrays are monotonic.

**Tech Stack:** React 19 + TS + Chart.js, Vitest, Playwright; NestJS backend (separate repo).

---

### Task 1: Add frontend debug instrumentation (Phase A1)

**Files:**
- Modify: `src/components/spc/SPCChart.tsx`
- Modify: `src/hooks/useSPCStreamAggregator.ts`
- Modify: `src/pages/quality/SPCAnalysis.tsx` (for SPCAnalysis chart path if used)

**Step 1: Write the failing test**
- Add a new unit test that asserts that the timestamp selection helper logs the chosen field and delta when debug is enabled.
- Example (target API in Task 2):

```ts
import { describe, expect, it, vi } from 'vitest'
import { selectEventTimestamp } from '@/utils/streamTimestamps'

describe('selectEventTimestamp', () => {
  it('logs chosen field and delta when debug enabled', () => {
    const logger = { debug: vi.fn() }
    const event = { timestamp: '2026-01-29T20:29:08.577Z', data: { timestamp: 1769718548425 } }

    const result = selectEventTimestamp(event, {
      debug: true,
      logger,
      sourceHint: 'spc-update'
    })

    expect(result).toBe(1769718548425)
    expect(logger.debug).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/utils/__tests__/streamTimestamps.test.ts`
Expected: FAIL because `selectEventTimestamp` doesn’t exist yet.

**Step 3: Write minimal implementation**
- Implement a helper function in `src/utils/streamTimestamps.ts`:

```ts
export function selectEventTimestamp(
  event: unknown,
  options: { debug?: boolean; logger?: { debug: (...args: unknown[]) => void }; sourceHint: string }
): number {
  // select numeric ms timestamp if present and plausible
  // fallback to ISO timestamp
  // parse "YYYY-MM-DD HH:mm:ss" as UTC (convert to ISO + Z)
}
```

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/utils/__tests__/streamTimestamps.test.ts`
Expected: PASS.

**Step 5: Wire instrumentation**
- In `SPCChart.tsx`, log:
  - last historic timestamp (raw, epoch)
  - first live timestamp (raw fields, epoch)
  - delta (ms, minutes)
  - actual `{ x, y }` pushed
- In `useSPCStreamAggregator.ts`, log the chosen field from SSE and whether `x` is NaN or out-of-order.
- Use a debug flag (e.g., `VITE_DEBUG_SPC_TIMING`) to gate logs.

**Step 6: Commit**
Skip unless requested.

---

### Task 2: Add canonical timestamp transform (Phase C1)

**Files:**
- Create: `src/utils/streamTimestamps.ts`
- Modify: `src/hooks/useSPCStreamAggregator.ts`
- Modify: `src/components/spc/SPCChart.tsx`

**Step 1: Write failing tests**
Create `src/utils/__tests__/streamTimestamps.test.ts` with cases:
- ISO `2026-01-29T20:15:33.166Z` → epoch ms
- numeric timestamp `1769718546425` treated as ms
- string `"2026-01-29 20:29:06"` parsed as UTC
- reject seconds value (10-digit) or convert if explicitly configured

**Step 2: Run tests (fail)**
Run: `npm run test -- src/utils/__tests__/streamTimestamps.test.ts`
Expected: FAIL (helper missing)

**Step 3: Implement minimal helper**
- `selectEventTimestamp` (priority order):
  - `event.data.timestamp` (number, epoch ms)
  - `event.timestamp` ISO
  - `event.data.time` / `event.data._time` (ISO)
  - `event.data.time` in `YYYY-MM-DD HH:mm:ss` → convert to ISO UTC
- Return `number` epoch ms or `NaN` if invalid.

**Step 4: Update useSPCStreamAggregator to use helper**
Replace:
```ts
x: new Date(event.timestamp).getTime()
```
with:
```ts
const x = selectEventTimestamp(event, { debug: DEBUG, logger, sourceHint: 'spc-update' })
```
Use same for realtime updates. Reject NaN and log.

**Step 5: Run tests (pass)**
Run: `npm run test -- src/utils/__tests__/streamTimestamps.test.ts`
Expected: PASS.

---

### Task 3: Chart.js configuration validation (Phase C2)

**Files:**
- Modify: `src/lib/chartConfig.ts`
- Modify: `src/components/spc/SPCChart.tsx`

**Step 1: Write failing test**
Add a unit test asserting `defaultChartOptions.scales.x.type === 'time'` and that datasets are passed with `parsing: false` when using `{x,y}`.

**Step 2: Run test (fail)**
Run: `npm run test -- src/lib/__tests__/chartConfig.test.ts`
Expected: FAIL if not already enforced.

**Step 3: Implement minimal changes**
- Ensure `defaultChartOptions.scales.x.type = 'time'`
- Ensure main dataset is created with `parsing: false`

**Step 4: Run tests (pass)**

---

### Task 4: Merge ordering & gap guard (Phase C3)

**Files:**
- Modify: `src/hooks/useSPCStreamAggregator.ts`

**Step 1: Write failing test**
Test that when a live point is within 15m of last historic point, it’s appended; if it’s hours apart, a warning log is emitted.

**Step 2: Run test (fail)**

**Step 3: Implement guard**
- Maintain `lastHistoricX` in aggregator or pass from chart init
- If `x - lastHistoricX > thresholdMs`, log a warning with raw fields

**Step 4: Run tests (pass)**

---

### Task 5: Backend instrumentation (Phase A2)

**Files (backend repo):**
- Modify: `/Users/harrytu/Documents/my-projects/opcua-dashboard/backend/opcua-backend/...` (SSE emitter and REST endpoint)

**Step 1: Add logs**
- SSE: log `deviceId`, chosen timestamp (raw + epoch), chosen field for `y`
- REST: log query range, timezone, sorting direction, and sample first/last timestamps

**Step 2: Run backend tests / manual check**
- Ensure logs show UTC and ascending sorting

---

### Task 6: Frontend integration test (Phase D2)

**Files:**
- Create: `tests/spc-timestamp-gap.spec.ts`

**Steps:**
- Stub REST response with last historic point
- Emit SSE event with live timestamp 10-15 minutes later
- Assert chart dataset last two points delta within expected range

---

### Task 7: Backend tests (Phase D3)

**Files (backend repo):**
- Add unit tests for REST timestamp UTC and SSE timestamp ms

---

### Task 8: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Change:** Add backend repo path: `/Users/harrytu/Documents/my-projects/opcua-dashboard/backend/opcua-backend`

---

### Task 9: Verification

**Run:**
- `npm run test -- src/utils/__tests__/streamTimestamps.test.ts`
- `npm run test -- src/lib/__tests__/chartConfig.test.ts`
- `npm run test -- src/hooks/__tests__/useSPCStreamAggregator.test.ts`
- `npm run test:e2e -- tests/spc-timestamp-gap.spec.ts` (if backend running)

**Manual:**
- Open `/spc`, confirm last historic point connects smoothly to live point
- Confirm debug logs show delta in minutes (not hours)

