# SPC Expand Chart Metrics Lines (SIT vs Local) Investigation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Identify why SPC metric lines render on localhost but not in SIT, and determine whether the root cause is backend or frontend configuration/behavior. Replace current logging with targeted, minimal SIT diagnostics once the root cause hypothesis is clear.

**Architecture:** Compare SIT vs local data flow across API responses, computed limits/stats, dataset construction, and Chart.js rendering. Use controlled diagnostics to isolate the stage where metrics lines disappear. If backend data is consistent, focus on frontend timing, config, or build differences.

**Tech Stack:** React 19, TypeScript, Vite, Chart.js, SSE, Vitest.

---

### Task 1: Verify not backend issue (SIT vs local API parity)

**Files:**
- Modify: none

**Step 1: Capture SIT series response for known machine/field**

Run (using SIT auth token):
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api-dashboard.harrytu.cv/api/spc/series?machineId=<id>&field=<field>&window=last_24h&limit=100&downsample=avg&includeStats=true&includeLimits=true" \
  | jq '{seriesCount:(.series|length), stats:.stats, limits:.limits, window:.window, sampling:.sampling, meta:.meta}'
```
Expected: `stats` and `limits` present and non-null for the same field that fails in SIT UI.

**Step 2: Capture local series response for the same machine/field**

Run:
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/spc/series?machineId=<id>&field=<field>&window=last_24h&limit=100&downsample=avg&includeStats=true&includeLimits=true" \
  | jq '{seriesCount:(.series|length), stats:.stats, limits:.limits, window:.window, sampling:.sampling, meta:.meta}'
```
Expected: Same presence/shape of `stats` and `limits`.

**Step 3: Compare responses for null/undefined/NaN**

Checklist:
- `stats.stdDev`, `stats.median`, `stats.p95` are numbers (not null/undefined)
- `limits.ucl/lcl/mean` are numbers
- `series` has numeric values and timestamps parseable by Date

**Decision:**
- If SIT response lacks `stats/limits` while local has them, log backend issue with evidence.
- If both have `stats/limits`, proceed to frontend investigation.

---

### Task 2: Confirm SIT runtime state at each data flow stage

**Files:**
- Modify: none (read-only inspection)

**Step 1: Verify `SPCChart` inputs in SIT**

Steps:
- Open SIT in browser → DevTools
- Confirm the field and window values passed to `SPCChart` match expected UI selection

**Step 2: Verify network payloads for the first expand**

Steps:
- Network tab → find `/api/spc/series` request
- Verify `includeStats=true` and `includeLimits=true` are present
- Save response JSON for first expand and after time-range toggle

**Step 3: Confirm whether `limits` and `stats` arrive after initial chart init**

Use DevTools to inspect React state (or add temporary console diagnostics in Task 4 if needed).

---

### Task 3: Investigate frontend config/build differences (SIT vs local)

**Files:**
- Modify: none

**Step 1: Compare env flags**

Checklist:
- `VITE_API_URL`
- `VITE_DEBUG_SPC_TIMING`
- Any feature flags that influence chart rendering

**Step 2: Confirm build mode differences**

Checklist:
- Ensure SIT uses production build
- Verify sourcemaps or minification changes don’t remove logging or alter order of execution

**Step 3: Check Chart.js bundle and adapter presence**

Steps:
- Confirm `chartjs-adapter-date-fns` is loaded in SIT bundle
- Verify `time` scale parsing in SIT (inspect chart options in runtime)

---

### Task 4: Remove current logging and define targeted SIT diagnostics (no code yet)

**Files:**
- Plan-only changes (to be implemented later)

**Step 1: Identify current logs to remove**

Targets:
- `SPCChart` debug logs (`debugLog`, `[SPCChart]` timing logs)
- `useSPCStreamAggregator` timing logs

**Step 2: Propose new targeted logs (for SIT only)**

Add a single gated debug flag (e.g., `VITE_DEBUG_SPC_LINES=true`) and log exactly:
- After `getSPCSeries` resolves: `{ hasLimits, hasStats, statsKeys, limitsKeys, seriesCount }`
- Before chart init: `{ dataBufferCount, limitsLoaded, statsLoaded, datasetLabels }`
- After dataset sync effect runs: `{ datasetLabels, datasetCount }`
- On render loop first tick: `{ firstX, lastX, limits? }`
- When metrics lines are missing: assert dataset labels and log current datasets

These logs should be INFO-level and only when the new debug flag is true.

---

### Task 5: Root cause hypothesis and decision

**Files:**
- Modify: none

**Step 1: Build a single hypothesis**

Examples:
- **Timing issue:** limits/stats arrive after chart init and datasets aren’t rebuilt (frontend)
- **Data mismatch:** limits exist but contain NaN/undefined (backend)
- **Build/runtime issue:** Chart.js time scale parsing fails in SIT (frontend config/build)

**Step 2: Choose the minimal change to validate**

- If frontend timing: implement targeted logs and dataset rebuild triggers
- If backend data: open backend fix path with evidence
- If build issue: adjust bundler or runtime config

---

Plan complete and saved to `docs/plans/2026-01-30-spc-expand-chart-sit-investigation.md`.
