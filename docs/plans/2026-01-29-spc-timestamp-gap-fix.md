# SPC Timestamp Gap Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the visual gap between historical SPC series and live SSE points for 6h/24h/3d/7d windows by aligning downsampled timestamps to the query end and handling short data spans safely.

**Architecture:** Introduce a small transform layer that maps downsampled series points into chart points with a consistent, explicit timestamp policy. The transform uses `sampling.intervalMs` + a known `windowEndMs` to align the tail when appropriate, without masking true data staleness. Keep the live SSE pipeline unchanged but ensure the initial historical points reflect the same time semantics. No backend changes.

**Tech Stack:** React 19, TypeScript, Vite, Chart.js, SSE, Vitest.

---

## Brainstorm: Handling Long Windows When Data Span Is Short

**Problem:** For 6h/24h/3d/7d, downsampled buckets are time-aligned to a window longer than available data. The last bucket’s timestamp can lag the current time, producing a gap to live SSE points.

**Option A (Recommended): Align downsampled series to window end when “fresh”)**
- Use `sampling.intervalMs` and the query end time to align bucket timestamps.
- If `windowEndMs - lastTs <= intervalMs * 2`, treat series as “fresh” and snap the last point to `windowEndMs`.
- If it’s **stale**, keep bucket end (`ts + intervalMs`) so the gap reflects missing data.

**Option B: Client-side downsample of raw history**
- For long windows with short data span, re-fetch raw history (`spc-history` with start/end) and downsample in the frontend.
- Pros: exact control, accurate tail.
- Cons: heavy payload; more CPU; more code.

**Option C: Disable downsample for 6h+**
- Use `downsample=none` and a larger `limit`.
- Pros: simplest.
- Cons: payload may be large; still limited by `limit` and may truncate recent data depending on backend order.

**Plan picks Option A** with a small tweak: use downsample for 6h (so we have a known bucket interval) and apply the alignment rule.

---

## Task 1: Add series timestamp transform (TDD)

**Files:**
- Create: `src/utils/spcSeriesTransform.ts`
- Create: `src/utils/__tests__/spcSeriesTransform.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { mapSeriesToChartPoints } from '@/utils/spcSeriesTransform'

describe('mapSeriesToChartPoints', () => {
  it('aligns the last bucket to window end when gap <= 2 intervals', () => {
    const points = mapSeriesToChartPoints({
      series: [
        { ts: '2026-01-29T21:02:57.000Z', value: 51 },
        { ts: '2026-01-29T21:17:21.259Z', value: 60 },
      ],
      intervalMs: 864000,
      windowEndMs: Date.parse('2026-01-29T21:44:20.116Z'),
    })

    expect(points[points.length - 1].x).toBe(Date.parse('2026-01-29T21:44:20.116Z'))
  })

  it('keeps bucket end when data is stale', () => {
    const points = mapSeriesToChartPoints({
      series: [{ ts: '2026-01-29T18:00:00.000Z', value: 60 }],
      intervalMs: 864000,
      windowEndMs: Date.parse('2026-01-29T21:44:20.116Z'),
    })

    expect(points[0].x).toBe(Date.parse('2026-01-29T18:00:00.000Z') + 864000)
  })

  it('uses raw timestamp when intervalMs is missing', () => {
    const points = mapSeriesToChartPoints({
      series: [{ ts: '2026-01-29T21:45:43.388Z', value: 52 }],
      intervalMs: null,
      windowEndMs: Date.parse('2026-01-29T21:46:00.000Z'),
    })

    expect(points[0].x).toBe(Date.parse('2026-01-29T21:45:43.388Z'))
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- src/utils/__tests__/spcSeriesTransform.test.ts
```
Expected: FAIL (module not found / function missing).

**Step 3: Implement minimal transform**

```ts
import type { SpcSeriesPoint } from '@/types/api'
import type { DataPoint } from '@/hooks/useSPCStreamAggregator'

type TransformInput = {
  series: SpcSeriesPoint[]
  intervalMs: number | null
  windowEndMs: number
}

const STALE_INTERVAL_MULTIPLIER = 2

export function mapSeriesToChartPoints({ series, intervalMs, windowEndMs }: TransformInput): DataPoint[] {
  return series.map((point, index) => {
    const base = Date.parse(point.ts)
    if (!Number.isFinite(base)) return { x: base, y: point.value }

    if (!intervalMs) return { x: base, y: point.value }

    const bucketEnd = base + intervalMs
    const isLast = index === series.length - 1
    if (isLast) {
      const gap = windowEndMs - base
      if (gap <= intervalMs * STALE_INTERVAL_MULTIPLIER) {
        return { x: windowEndMs, y: point.value }
      }
    }

    return { x: bucketEnd, y: point.value }
  })
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- src/utils/__tests__/spcSeriesTransform.test.ts
```
Expected: PASS.

---

## Task 2: Wire transform into SPCChart

**Files:**
- Modify: `src/components/spc/SPCChart.tsx`

**Step 1: Add `windowEndMs` capture**

- At fetch start, record `const windowEndMs = Date.now()`.
- Prefer server `meta.generatedAt` if present: `windowEndMs = Date.parse(seriesRes.meta.generatedAt)` when valid.

**Step 2: Apply transform**

- Replace direct mapping `new Date(p.ts).getTime()` with `mapSeriesToChartPoints`.
- For long windows (>=6h), pass `intervalMs = seriesRes.sampling?.intervalMs ?? null`.
- For short windows, pass `intervalMs = null`.

**Step 3: Use downsample for 6h**

- Change `getDownsampleMethod` to include `last_6h` in the downsample list so the series uses stable bucket intervals.

**Step 4: Update debug timing logs**

- Log `windowEndMs`, `intervalMs`, last historical `x`, and gap to the first live point.

---

## Task 3: Add regression tests for the 6h/24h gap scenario

**Files:**
- Create: `src/utils/__tests__/spcSeriesGapRegression.test.ts`

**Test goal:** Ensure the transformed last historical point is within 1 interval of `windowEndMs` for downsampled windows when data is fresh.

```ts
import { describe, it, expect } from 'vitest'
import { mapSeriesToChartPoints } from '@/utils/spcSeriesTransform'

describe('spc series gap regression', () => {
  it('keeps last point within interval for downsampled windows', () => {
    const windowEndMs = Date.parse('2026-01-29T21:44:20.116Z')
    const intervalMs = 864000
    const points = mapSeriesToChartPoints({
      series: [{ ts: '2026-01-29T21:17:21.259Z', value: 60 }],
      intervalMs,
      windowEndMs,
    })

    expect(windowEndMs - points[0].x).toBeLessThanOrEqual(intervalMs)
  })
})
```

**Run:**
```bash
npm run test -- src/utils/__tests__/spcSeriesGapRegression.test.ts
```

---

## Task 4: Manual verification (no Playwright)

**Step 1: Run frontend**
```bash
VITE_DEBUG_SPC_TIMING=true npm run dev
```

**Step 2: Verify windows**
- `last_6h`, `last_24h`, `last_3d`, `last_7d` now show last historical point aligned near the live point.
- Confirm stale devices still show gaps.

---

## Notes
- E2E (Playwright) is skipped per your request.
- This plan makes no backend changes.
