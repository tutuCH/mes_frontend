# SPC Expand Chart Metrics Lines + Alerts Leader Lock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix missing SPC metrics lines on first chart expand in SIT and ensure a single-tab alerts SSE leader with cross-tab event relay.

**Architecture:** Diagnose why limits/stats lines are absent on first render (likely timing or missing API data). Add a deterministic dataset builder and a dataset-sync effect in `SPCChart` so control/stat lines are created whenever limits/stats become available. Verify/ensure the alerts stream leader lock uses localStorage for leadership and BroadcastChannel for event relay.

**Tech Stack:** React 19, TypeScript, Chart.js, Vite, SSE, Vitest.

---

### Task 1: Reproduce in SIT and capture evidence (Root Cause Phase)

**Files:**
- Modify: none

**Step 1: Run app against SIT API**

Run:
```bash
VITE_API_URL=https://api-dashboard.harrytu.cv VITE_DEBUG_SPC_TIMING=true npm run dev
```
Expected: Dev server running on http://localhost:5173.

**Step 2: Reproduce missing metrics lines**

Steps:
- Log in with SIT account.
- Navigate to `/spc`.
- Expand an SPC metric accordion and load the chart.
- Confirm data line renders but metrics lines (UCL/LCL/Mean/Median/P95/σ) are missing.

**Step 3: Capture network response**

Steps:
- Open DevTools → Network → `api/spc/series`.
- Export the response JSON for the first expand.
- Note whether `limits` and `stats` are `null` or missing.

**Step 4: Compare after time-range change**

Steps:
- Switch time range (24h → 1h → 24h).
- Capture the second response JSON.
- Compare `limits`/`stats` fields and `series` lengths.

**Step 5: Capture runtime state**

Steps:
- Check console logs tagged `[SPCChart]` (debug enabled).
- Note values for `limitsLoaded`, `dataLoaded`, `hasStats`, `hasLimits` during the first expand.

---

### Task 2: Decide root cause (Pattern + Hypothesis Phase)

**Files:**
- Modify: none

**Step 1: Compare response payloads**

Expected outcomes to classify:
- **If `limits`/`stats` are missing only on first response:** frontend is fine, backend caching/aggregation timing is likely root cause → coordinate backend fix or add frontend fallback when `limits` appear later.
- **If `limits`/`stats` are present but lines are missing:** frontend dataset creation/update is the root cause → implement dataset sync fix (Task 3/4).

**Step 2: Confirm timing mismatch**

Steps:
- Check if `dataBuffer` is ready before `limits`/`stats` (logs).
- If yes, proceed with dataset-sync fix.

---

### Task 3: Add dataset builder utility (TDD)

**Files:**
- Create: `src/utils/spcChartDatasets.ts`
- Create: `src/utils/__tests__/spcChartDatasets.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import type { SpcSeriesStats } from '@/types/api'
import { buildSpcDatasets } from '@/utils/spcChartDatasets'

const limits = { ucl: 10, lcl: 2, mean: 6, sigma: 3 }
const stats: SpcSeriesStats = {
  count: 100,
  mean: 6,
  stdDev: 1,
  min: 1,
  max: 11,
  median: 6,
  p95: 9.5,
  source: 'raw',
}

const data = [{ x: 1, y: 5 }]

describe('buildSpcDatasets', () => {
  it('returns only the data line when limits are missing', () => {
    const datasets = buildSpcDatasets({
      data,
      name: 'Cycle Time',
      unit: 's',
      limits: null,
      stats: null,
    })

    expect(datasets.map((d) => d.label)).toEqual(['Cycle Time (s)'])
  })

  it('includes control + stats lines in deterministic order', () => {
    const datasets = buildSpcDatasets({
      data,
      name: 'Cycle Time',
      unit: 's',
      limits,
      stats,
    })

    expect(datasets.map((d) => d.label)).toEqual([
      'Cycle Time (s)',
      'UCL',
      'LCL',
      'Mean',
      'P95',
      'Median',
      '+1σ',
      '-1σ',
      '+2σ',
      '-2σ',
      'Current',
    ])
  })
})
```

**Step 2: Run tests to verify failure**

Run:
```bash
npm run test -- spcChartDatasets
```
Expected: FAIL (module not found / function missing).

**Step 3: Implement minimal dataset builder**

```ts
import type { DataPoint } from '@/hooks/useSPCStreamAggregator'
import type { SpcSeriesStats } from '@/types/api'
import {
  createControlLimitLine,
  createCurrentValueIndicator,
  createDataLine,
  createMedianLine,
  createP95Line,
  createStdDevLine,
} from '@/lib/chartConfig'

type ControlLimits = {
  ucl: number
  lcl: number
  mean: number
  sigma?: number
}

type BuildParams = {
  data: DataPoint[]
  name: string
  unit: string
  limits: ControlLimits | null
  stats: SpcSeriesStats | null
}

export function buildSpcDatasets({ data, name, unit, limits, stats }: BuildParams) {
  const datasets = [createDataLine(data, `${name} (${unit})`)]

  if (!limits) {
    return datasets
  }

  datasets.push(
    createControlLimitLine([], 'rgb(239, 68, 68)', 'UCL', [5, 5]),
    createControlLimitLine([], 'rgb(239, 68, 68)', 'LCL', [5, 5]),
    createControlLimitLine([], 'rgb(34, 197, 94)', 'Mean', [3, 3])
  )

  if (stats) {
    datasets.push(createP95Line([]), createMedianLine([]))

    if (stats.stdDev !== undefined) {
      datasets.push(
        createStdDevLine([], 'rgb(251, 191, 36)', '+1σ', [2, 4]),
        createStdDevLine([], 'rgb(251, 191, 36)', '-1σ', [2, 4]),
        createStdDevLine([], 'rgb(156, 163, 175)', '+2σ', [1, 3]),
        createStdDevLine([], 'rgb(156, 163, 175)', '-2σ', [1, 3])
      )
    }
  }

  if (data.length > 0) {
    const lastPoint = data[data.length - 1]
    datasets.push(createCurrentValueIndicator(lastPoint.y, limits.ucl, limits.lcl, lastPoint.x))
  }

  return datasets
}
```

**Step 4: Run tests to verify pass**

Run:
```bash
npm run test -- spcChartDatasets
```
Expected: PASS.

---

### Task 4: Rebuild SPCChart datasets when limits/stats load

**Files:**
- Modify: `src/components/spc/SPCChart.tsx`

**Step 1: Use dataset builder on chart init**

Replace dataset creation with:
```ts
const chartData: ChartData = {
  datasets: buildSpcDatasets({
    data: dataBuffer,
    name,
    unit,
    limits,
    stats,
  }),
}
```

**Step 2: Add a dataset-sync effect when limits/stats change**

```ts
useEffect(() => {
  if (!chartRef.current || !dataLoaded || !limitsLoaded) return

  chartRef.current.data.datasets = buildSpcDatasets({
    data: dataRef.current,
    name,
    unit,
    limits,
    stats,
  })

  chartRef.current.update('none')
}, [dataLoaded, limitsLoaded, limits, stats, name, unit])
```

**Step 3: Remove or simplify the existing “Update control limits” effect**

Replace that effect with the dataset-sync effect above to avoid duplicate dataset insertion.

**Step 4: Run chart-related tests**

Run:
```bash
npm run test -- spcChartDatasets
```
Expected: PASS.

---

### Task 5: Verify fix in SIT and local

**Files:**
- Modify: none

**Step 1: SIT validation**

Steps:
- Run with `VITE_API_URL=https://api-dashboard.harrytu.cv`.
- Open `/spc`, expand chart.
- Confirm metrics lines render immediately without changing time range.

**Step 2: Regression check**

Steps:
- Switch time range multiple times.
- Confirm lines persist and do not duplicate.

---

### Task 6: Ensure alerts stream leader lock is present and verified

**Files:**
- Audit: `src/services/alertsStreamCoordinator.ts`, `src/hooks/useAlertsStreamCoordinator.ts`, `src/components/GlobalSSEManager.tsx`
- Test: `src/services/__tests__/alertsStreamCoordinator.test.ts`

**Step 1: Confirm wiring**

Checklist:
- `GlobalSSEManager` calls `useAlertsStreamCoordinator()`.
- Coordinator uses localStorage lock and BroadcastChannel to relay events.
- `sseService.setAlertsEnabled(false)` is called for non-leader tabs.

**Step 2: Add a follower-lock test (if missing)**

```ts
it('disables alerts when an active leader lock exists', () => {
  const setAlertsEnabled = vi.fn()
  const coordinator = new AlertsStreamCoordinator({
    setAlertsEnabled,
    onAlertsEvent: vi.fn(() => () => undefined),
    receiveExternalEvent: vi.fn(),
  })

  localStorage.setItem('mes_alerts_leader', JSON.stringify({
    tabId: 'leader',
    expiresAt: Date.now() + 10_000,
  }))

  coordinator.start()
  expect(setAlertsEnabled).toHaveBeenCalledWith(false)
})
```

**Step 3: Run targeted tests**

Run:
```bash
npm run test -- alertsStreamCoordinator
```
Expected: PASS.

---

Plan complete and saved to `docs/plans/2026-01-30-spc-expand-chart-metrics-lines.md`.

Two execution options:
1) Subagent-Driven (this session) – I dispatch a fresh subagent per task, review between tasks
2) Parallel Session (separate) – Open a new session with executing-plans and batch execution

Which approach?
