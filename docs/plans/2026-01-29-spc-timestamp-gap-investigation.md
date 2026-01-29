# SPC Timestamp Gap Investigation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Collect definitive backend + frontend timing evidence for the SPC chart gap and instrument the chart so the timestamp source and delta are unambiguous.

**Architecture:** Keep the existing data flow (REST series + SSE stream) but add a small, testable debug summarizer that logs the raw series window, last historical timestamp, live timestamp source, and delta. No behavior changes yet—investigation only.

**Tech Stack:** React 19, TypeScript, Vite, Chart.js, SSE, Vitest.

### Task 1: Backend evidence capture (no code changes)

**Files:**
- None (commands only)

**Step 1: Capture last_24h series window**

Run:
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"tuchenhsien@gmail.com","password":"abc123"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/spc/series?machineId=9&field=cycle_time&window=last_24h&limit=100&downsample=avg&includeStats=true&includeLimits=true" \
  | python -c "import sys,json;data=json.load(sys.stdin);series=data.get('series') or [];print('count',len(series));print('first',series[0] if series else None);print('last',series[-1] if series else None);print('sampling',data.get('sampling'))"
```
Expected: series length reported; last ts logged.

**Step 2: Capture last_1h series window**

Run:
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/spc/series?machineId=9&field=cycle_time&window=last_1h&limit=100&downsample=none&includeStats=true&includeLimits=true" \
  | python -c "import sys,json;data=json.load(sys.stdin);series=data.get('series') or [];print('count',len(series));print('last',series[-1] if series else None);print('sampling',data.get('sampling'))"
```
Expected: last ts near current time if data is fresh.

**Step 3: Capture one SSE event (optional)**

Run:
```bash
TICKET=$(curl -s -X POST http://localhost:3000/sse/stream-ticket \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"ttlSeconds":300,"purpose":"data"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['ticket'])")

curl -N --max-time 15 \
  "http://localhost:3000/sse/stream?deviceId=C02&ticket=$TICKET" | head -n 40
```
Expected: at least one `spc-update` event with timestamp fields.

### Task 2: Add minimal debug summarizers (TDD)

**Files:**
- Create: `src/utils/spcTimingDebug.ts`
- Create: `src/utils/__tests__/spcTimingDebug.test.ts`
- Modify: `src/components/spc/SPCChart.tsx`
- Modify: `src/hooks/useSPCStreamAggregator.ts`

**Step 1: Write failing tests for debug summarizers**

Create `src/utils/__tests__/spcTimingDebug.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { summarizeSeriesTiming, summarizeLiveTiming } from '@/utils/spcTimingDebug'

describe('spcTimingDebug', () => {
  it('summarizes series timing window and last point', () => {
    const summary = summarizeSeriesTiming({
      window: 'last_24h',
      sampling: { intervalMs: 864000, downsample: 'avg' },
      series: [{ ts: '2026-01-29T20:15:33.166Z', value: 55 }],
    })

    expect(summary.window).toBe('last_24h')
    expect(summary.lastRaw).toBe('2026-01-29T20:15:33.166Z')
    expect(summary.lastEpochMs).toBe(Date.parse('2026-01-29T20:15:33.166Z'))
  })

  it('summarizes live timing with source and delta', () => {
    const summary = summarizeLiveTiming({
      lastHistoricX: 1769717733166,
      liveX: 1769718548577,
      source: 'outer.timestamp',
      raw: '2026-01-29T20:29:08.577Z',
    })

    expect(summary.source).toBe('outer.timestamp')
    expect(summary.deltaMs).toBe(1769718548577 - 1769717733166)
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm run test -- src/utils/__tests__/spcTimingDebug.test.ts
```
Expected: FAIL (module not found / functions missing).

**Step 3: Implement minimal summarizers**

Create `src/utils/spcTimingDebug.ts`:
```ts
import type { SpcSeriesResponse } from '@/types/api'

type SeriesTimingInput = {
  window: string
  sampling?: SpcSeriesResponse['sampling']
  series: Array<{ ts: string; value: number }>
}

export function summarizeSeriesTiming(input: SeriesTimingInput) {
  const last = input.series[input.series.length - 1]
  const lastRaw = last?.ts ?? null
  const lastEpochMs = lastRaw ? Date.parse(lastRaw) : null

  return {
    window: input.window,
    sampling: input.sampling,
    lastRaw,
    lastEpochMs,
    count: input.series.length,
  }
}

type LiveTimingInput = {
  lastHistoricX: number | null
  liveX: number
  source: string
  raw: unknown
}

export function summarizeLiveTiming(input: LiveTimingInput) {
  const deltaMs = input.lastHistoricX === null ? null : input.liveX - input.lastHistoricX
  const deltaMinutes = deltaMs === null ? null : Math.round((deltaMs / 60000) * 100) / 100

  return {
    source: input.source,
    raw: input.raw,
    liveX: input.liveX,
    lastHistoricX: input.lastHistoricX,
    deltaMs,
    deltaMinutes,
  }
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm run test -- src/utils/__tests__/spcTimingDebug.test.ts
```
Expected: PASS.

**Step 5: Wire debug logs into SPCChart and useSPCStreamAggregator**

- Remove existing debug logs in these files.
- Add new logs under `VITE_DEBUG_SPC_TIMING` using the summarizers.
- Log: series sampling + last point; first live point raw payload and delta vs last historic.

**Step 6: Manual verification**

Run frontend with `VITE_DEBUG_SPC_TIMING=true` and capture the debug log excerpt.

### Task 3: Root cause write-up + next fix plan (no code changes yet)

**Files:**
- Modify: `docs/plans/2026-01-29-spc-timestamp-gap-investigation.md`

**Step 1: Add a short “Findings” section**

Summarize:
- Backend series last point vs now for last_24h and last_1h
- Live event timestamp source and delta
- Preliminary root cause hypothesis (e.g., bucket start vs end, selection of SSE timestamp field)

**Step 2: Propose fix options**

List 2-3 fix approaches and trade-offs, but do not implement until confirmed.

**Step 3: Commit**

SKIP — per agent instructions, do not commit unless explicitly requested.

## Findings (2026-01-29)

- `last_24h` (`downsample=avg`, `limit=100`) returns `sampling.intervalMs=864000` and last point at `2026-01-29T21:17:21.259Z` while current time is ~`21:44Z` → historical tail can be ~27 minutes behind “now”.
- `last_1h` (`downsample=none`, `limit=100`) returns last point at `2026-01-29T21:45:43.388Z` with `sampling.intervalMs=36000` → near-current.
- SSE sample not captured in latest curl run (no events within 8s). Previous evidence shows SSE payload includes outer ISO timestamp and inner `data.timestamp` epoch ms.

## Hypothesis

For long windows, the downsampled series returns the *bucket start* timestamp and the last bucket can lag current time by up to one interval. This creates a large gap between the last historical point and first live point even when timestamps are “close” in raw data. The frontend uses this downsampled timestamp as `x`, so the visual gap is an artifact of bucket labeling rather than SSE timestamp mismatch.

## Fix Options (Do Not Implement Yet)

1. **Frontend adjust bucket timestamp**: when `downsample=avg`, shift each series point to bucket midpoint or end (e.g., `ts + intervalMs` or `ts + intervalMs/2`). Pro: quick frontend-only. Con: requires clear semantics; may still be wrong if backend already returns correct bucket time.
2. **Backend return bucket end timestamp**: update downsampling to emit end-of-window timestamps so “last” point aligns with now. Pro: canonical fix. Con: backend change (not allowed in this round).
3. **Disable downsample for chart**: use `downsample=none` for long windows (maybe increase limit). Pro: simplest. Con: heavier payload, possible performance hit.
