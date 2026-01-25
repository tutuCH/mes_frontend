# SPC Chart Aggregation API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce SPC chart payload size by returning only the numeric series and precomputed control metrics.

**Architecture:** Introduce a dedicated backend endpoint that aggregates SPC data per machine/field/time range and returns a compact series + stats object. The frontend charts use this endpoint for charting, while existing history endpoints remain for raw tables/export. Metrics are computed server-side to avoid repeating calculations on the client.

**Tech Stack:** Backend API (current service stack), InfluxDB (or existing data store), REST JSON, optional caching layer.

---

## Decision Summary
- Keep raw history endpoints (`getSPCHistory`, `getRealtimeHistory`) for tables/export.
- Add a new chart-optimized endpoint that returns:
  - `series`: time/value pairs (or value-only if timestamps are unnecessary)
  - `stats`: mean/stdDev/limits and any additional control metrics
  - `meta`: sampling + window info to support client rendering

---

## Endpoint Design

### Endpoint
`GET /api/spc/series`

### Query Parameters
- `machineId` (string, required): REST machine ID
- `field` (string, required): SPC metric key, e.g. `cycle_time`
- `window` (string, optional, default `last_1h`): time window preset
  - allowed: `last_15m`, `last_1h`, `last_6h`, `last_24h`, `custom`
- `start` (RFC3339 string, required if `window=custom`)
- `end` (RFC3339 string, required if `window=custom`)
- `limit` (int, optional, default `100`): maximum data points
- `order` (string, optional, default `asc`): `asc` or `desc`
- `includeStats` (boolean, optional, default `true`)
- `includeLimits` (boolean, optional, default `true`)
- `downsample` (string, optional, default `none`): `none`, `lttb`, `avg`, `minmax`
- `timezone` (string, optional): e.g. `Asia/Taipei` for label formatting

### Response Shape (v1)
```json
{
  "machineId": "machine-123",
  "field": "cycle_time",
  "unit": "seconds",
  "window": {
    "mode": "last_1h",
    "start": "2026-01-20T03:31:12.398Z",
    "end": "2026-01-20T04:31:12.398Z"
  },
  "sampling": {
    "limit": 100,
    "returned": 100,
    "downsample": "lttb",
    "intervalMs": 30000
  },
  "series": [
    { "ts": "2026-01-20T04:30:08.517Z", "value": 33.87 },
    { "ts": "2026-01-20T04:30:40.517Z", "value": 34.12 }
  ],
  "stats": {
    "count": 100,
    "mean": 33.95,
    "stdDev": 0.41,
    "min": 32.88,
    "max": 34.92,
    "median": 33.91,
    "p95": 34.60
  },
  "limits": {
    "ucl": 35.18,
    "lcl": 32.72,
    "mean": 33.95,
    "sigma": 0.41,
    "method": "xbar-3sigma"
  },
  "meta": {
    "source": "influxdb",
    "generatedAt": "2026-01-20T04:31:12.398Z"
  }
}
```

### Alternative Response (value-only series)
Use only if timestamps are not needed for the chart X-axis.
```json
{
  "series": [33.87, 34.12, 33.76],
  "stats": { "count": 3, "mean": 33.92, "stdDev": 0.18 },
  "limits": { "ucl": 34.46, "lcl": 33.38, "mean": 33.92 }
}
```

---

## Backend Logic (Detailed)

### Data Extraction
- Query the SPC measurement table for the requested `machineId` + `field`.
- Filter by time window.
- Order by timestamp ascending unless `order=desc`.
- Return only `_time` and the selected `field` from the DB.

### Data Cleaning
- Drop null/NaN values for the field.
- Enforce numeric parsing for string fields.
- If `order=desc`, reverse for calculation but keep return order consistent with request.

### Sampling/Downsampling
- If `limit` is exceeded, apply downsample strategy:
  - `lttb`: preserve shape for charts
  - `avg`: windowed average
  - `minmax`: min/max pairs per bucket
- Set `sampling.intervalMs` based on window length / limit.

### Stats Calculation
- `count`: number of points after filtering
- `mean`: arithmetic mean
- `stdDev`: sample standard deviation
- `min`, `max`, `median`, `p95`
- Optional: `cp`, `cpk` if spec limits available

### Control Limits (SPC)
- Default: `ucl = mean + 3*stdDev`, `lcl = mean - 3*stdDev`
- Clamp `lcl` to 0 for non-negative metrics if required
- Include `method` in response for traceability

### Caching
- Cache by key: `{machineId}:{field}:{window}:{limit}:{downsample}`
- TTL: 30–60 seconds (align with chart refresh)

---

## Task Breakdown

### Task 1: Confirm metric field mapping
**Files:**
- Review: backend SPC data model and Influx schema
- Review: `src/utils/fieldMapping.ts` for canonical field names

**Step 1: List allowed fields**
- Enumerate the SPC metric fields used in the UI (e.g. `cycle_time`, `cycle_number`, `injection_pressure_max`, etc.).

**Step 2: Validate backend field existence**
- Ensure all UI fields exist in the data store and are numeric.

**Step 3: Decide units map**
- Provide `unit` for each field (seconds, bar, celsius).

---

### Task 2: Add new SPC series endpoint
**Files:**
- Create: backend route/controller for `/api/spc/series`
- Create: service method to query DB and compute stats
- Update: API router registration

**Step 1: Define request validation**
- Validate `machineId`, `field`, `window` and time range.
- Ensure `limit` is bounded (e.g. 20–500).

**Step 2: Implement query**
- Select only `_time` + `field` columns.
- Apply time window filter.

**Step 3: Compute stats + limits**
- Compute mean/stdDev/min/max/median/p95.
- Compute UCL/LCL using 3-sigma.

**Step 4: Apply downsampling**
- If point count > limit, apply selected downsample strategy.

**Step 5: Assemble response**
- Include `window`, `sampling`, `stats`, `limits`, and `meta`.

---

### Task 3: Add unit + stats configuration
**Files:**
- Create: config for metric units
- Create: config for SPC limit rules (if variable)

**Step 1: Unit map**
- Add a canonical map for unit by field.

**Step 2: Limits config**
- Optionally define per-field overrides for sigma multiplier.

---

### Task 4: Update API documentation
**Files:**
- Update backend API docs (OpenAPI/README)

**Step 1: Document endpoint**
- Provide request params, response example, error cases.

---

## Errors & Edge Cases
- If no data is found: return `series: []`, `stats: null`, `limits: null`, and `sampling.returned: 0`.
- If `field` is unknown: return 400 with allowed fields list.
- If all data is non-numeric: return empty series with diagnostics in `meta`.

---

## Acceptance Criteria
- Payload does not include raw InfluxDB metadata fields.
- Payload includes only minimal series + stats/limits.
- Endpoint responds within target latency (e.g. <500ms for 1h window).
- Frontend can render SPC chart using returned series without any additional transformations.

---

## Notes for Backend Engineer
- This endpoint is chart-optimized. Do not remove existing history endpoints; they power tables/export.
- Use consistent field names with existing `normalizeSPCData` mapping.
- Keep response JSON stable to prevent frontend regression.
