# SPC Realtime Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce CPU and heap churn on `/spc` by throttling ingestion, bounding queues, and recomputing charts only when visible.

**Architecture:** Introduce a bounded, rate-limited ingestion layer for realtime/SPC events in `SPCAnalysis` that drops or aggregates excess updates, and decouple chart computation from raw event arrival. Use visibility-driven recompute for chart data (only expanded metric sections) and reduce per-message allocations by using fixed-size buffers. Keep WebSocket global behavior intact.

**Tech Stack:** React 19, TypeScript, Vite, Recharts, Redux, socket.io.

---

### Task 1: Capture baseline and define perf guardrails

**Files:**
- Modify: `src/pages/quality/SPCAnalysis.tsx`

**Step 1: Add temporary counters (no logic changes)**

Add local refs for queue lengths and update rates (e.g., `eventsPerSecond`, `queueMaxSize`) that can be logged only when `import.meta.env.DEV` and a `debugPerf` flag is set.

**Step 2: Run the app and verify counters**

Run: `npm run dev`
Expected: In `/spc`, console shows events/sec and queue size without changing behavior.

**Step 3: Remove counters after measurements**

Delete the temporary instrumentation after confirming rate and queue growth.

**Step 4: Commit**

```bash
git add src/pages/quality/SPCAnalysis.tsx
git commit -m "chore: add temporary spc perf counters"
```

---

### Task 2: Add bounded queues for realtime and SPC updates

**Files:**
- Modify: `src/pages/quality/SPCAnalysis.tsx`

**Step 1: Write a small fixed-size ring buffer utility (local)**

Add a small helper inside the file:

```ts
function pushBounded<T>(buffer: T[], item: T, max: number) {
  if (buffer.length >= max) buffer.shift()
  buffer.push(item)
}
```

**Step 2: Apply bounded queues to updateQueueRef**

Replace direct `push` with `pushBounded` and define per-queue caps (e.g., 100–300 events). Keep caps constant and small.

**Step 3: Verify behavior**

Run: `npm run dev`
Expected: Heap no longer spikes when updates are high-rate; queue length is capped.

**Step 4: Commit**

```bash
git add src/pages/quality/SPCAnalysis.tsx
git commit -m "perf: cap spc realtime update queues"
```

---

### Task 3: Throttle ingestion to reduce per-message allocations

**Files:**
- Modify: `src/pages/quality/SPCAnalysis.tsx`

**Step 1: Add ingestion throttle**

Use a timestamp guard in the WS handlers to only enqueue updates at a fixed interval (e.g., every 250–500ms). Keep the latest payload and drop intermediate ones.

**Step 2: Verify event rate drops**

Run: `npm run dev`
Expected: event counters show reduced enqueue rate; UI remains responsive.

**Step 3: Commit**

```bash
git add src/pages/quality/SPCAnalysis.tsx
git commit -m "perf: throttle spc realtime ingestion"
```

---

### Task 4: Recompute chart data only for visible metric sections

**Files:**
- Modify: `src/components/spc/MetricCategorySection.tsx`
- Modify: `src/pages/quality/SPCAnalysis.tsx`

**Step 1: Expose open state to parent**

Lift the `isOpen` state from `MetricCategorySection` to `SPCAnalysis` so the parent knows which categories are visible.

**Step 2: Compute chartDataByField only for visible categories**

Change `chartDataByField` to iterate only through metrics in currently open sections. Use a memo keyed by `openCategories`, `chartSpcHistory`, and `chartRealtimeHistory`.

**Step 3: Verify charts still render when expanded**

Run: `npm run dev`
Expected: collapsed sections do not trigger chart recompute; expanded sections render correctly.

**Step 4: Commit**

```bash
git add src/pages/quality/SPCAnalysis.tsx src/components/spc/MetricCategorySection.tsx
git commit -m "perf: compute spc charts only for visible sections"
```

---

### Task 5: Reduce chart redraw cost per flush

**Files:**
- Modify: `src/components/spc/SPCControlChart.tsx`

**Step 1: Skip out-of-control calculation when limits unchanged**

Memoize out-of-control points with a stable dependency on `data` reference and computed limits. Avoid re-sorting if data is already in order (keep data ordered upstream).

**Step 2: Verify no visual regression**

Run: `npm run dev`
Expected: charts render same as before; CPU drops during realtime updates.

**Step 3: Commit**

```bash
git add src/components/spc/SPCControlChart.tsx
git commit -m "perf: reduce spc chart recomputation"
```

---

### Task 6: Reduce noisy logging in dev for realtime stream

**Files:**
- Modify: `src/hooks/useRealtimeData.ts`
- Modify: `src/services/socket.ts`

**Step 1: Gate debug logs behind a flag**

Wrap per-message logging with a `const debugWs = false` (or env flag) to avoid console retention overhead by default.

**Step 2: Verify logs disabled**

Run: `npm run dev`
Expected: no per-message logs unless explicitly enabled.

**Step 3: Commit**

```bash
git add src/hooks/useRealtimeData.ts src/services/socket.ts
git commit -m "perf: gate websocket debug logging"
```

---

### Task 7: Prevent auto-unmount/re-mount from subscription polling

**Files:**
- Modify: `src/components/auth/ProtectedRoute.tsx`
- Modify: `src/contexts/SubscriptionContext.tsx`

**Step 1: Avoid returning null during subscription refresh**

Change `ProtectedRoute` to avoid unmounting when `isSubscriptionLoading` flips to true during periodic refresh (render children with a non-blocking overlay if needed).

**Step 2: Verify no "refresh" effect**

Run: `npm run dev`
Expected: no UI reset every 1–3 minutes; route stays mounted.

**Step 3: Commit**

```bash
git add src/components/auth/ProtectedRoute.tsx src/contexts/SubscriptionContext.tsx
git commit -m "fix: avoid route unmount during subscription polling"
```

---

### Task 8: Validate performance improvements

**Files:**
- No code changes

**Step 1: Run and measure**

Run: `npm run dev`
Expected: JS heap remains stable (<100–150MB with DevTools open), CPU significantly below 99% during realtime updates.

**Step 2: Optional prod build measurement**

Run: `npm run build && npm run preview`
Expected: even lower CPU and heap in production mode.

**Step 3: Commit (optional)**

No commit needed unless measurement requires code changes.

---

Plan complete and saved to `docs/plans/2026-01-17-spc-realtime-performance.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
