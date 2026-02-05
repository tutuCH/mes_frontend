# Backend API Contracts (Frontend‑Only Assumptions)

This document defines **assumed REST API contracts** to support three new product domains using **existing telemetry only** (Realtime/SPC/Tech). These contracts are intended for **frontend scaffolding and mock integration** until a backend is implemented.

**Scope**
- Raw Material & Inventory Management
- Production Orders & Job Scheduling
- Downtime Tracking & OEE

**Non‑Goals**
- No new telemetry fields beyond current Realtime/SPC/Tech streams.
- No new WebSocket/SSE events; REST‑only updates.

---

## 0) API Conventions

### 0.1 Base URL & Auth
- Base URL: `https://<api-host>`
- Auth header: `Authorization: Bearer <jwt>`
- All endpoints require JWT unless marked `Public`.

### 0.2 Time & Timestamps
- All timestamps are **ISO 8601 UTC** (e.g., `2026-02-05T10:00:00.000Z`).
- Time range options:
  - `start` + `end` (ISO)
  - or `timeRange` (e.g., `-24h`, `-7d`)

### 0.3 Pagination
List endpoints accept:
- `limit` (default `50`, max `1000`)
- `offset` (default `0`)

Response shape:
```json
{
  "data": [/* items */],
  "pagination": {
    "total": 1250,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### 0.4 Sorting & Filtering
- Sorting: `sort=field:asc|desc`
- Filtering: `filter[field]=value`

### 0.5 Errors
Standard error shape (aligned with current backend guide):
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Bad Request"
}
```

### 0.6 Idempotency (Optional)
- For write endpoints, client may send `Idempotency-Key` header.

### 0.7 Warnings
Endpoints may return `warnings` for partial data:
```json
{
  "data": { /* ... */ },
  "warnings": ["missing_shot_weight", "missing_cavities"]
}
```

---

## 1) Domain Entities

### 1.1 Inventory

#### Material
```json
{
  "materialId": "mat_001",
  "name": "ABS",
  "materialType": "virgin",
  "densityKgPerM3": 1040,
  "defaultCostPerKg": 2.4,
  "createdAt": "2026-02-05T10:00:00.000Z",
  "updatedAt": "2026-02-05T10:00:00.000Z"
}
```

#### InventoryLot
```json
{
  "lotId": "lot_001",
  "materialId": "mat_001",
  "supplier": "ACME Resins",
  "batchNumber": "B2026-01",
  "quantityKg": 1200,
  "receivedAt": "2026-02-01T10:00:00.000Z",
  "expiresAt": "2026-08-01T10:00:00.000Z",
  "factoryId": 1,
  "location": "Warehouse A",
  "status": "available"
}
```

#### MaterialAssignment
```json
{
  "assignmentId": "ma_001",
  "machineId": 12,
  "materialId": "mat_001",
  "activeLotId": "lot_001",
  "shotWeightG": 85,
  "scrapPercent": 0.02,
  "cavities": 2,
  "effectiveAt": "2026-02-05T10:00:00.000Z",
  "effectiveUntil": null
}
```

#### MaterialConsumptionLedger
```json
{
  "ledgerId": "mc_001",
  "materialId": "mat_001",
  "lotId": "lot_001",
  "machineId": 12,
  "orderId": "ord_001",
  "cycleCountDelta": 120,
  "consumedKg": 20.4,
  "timestamp": "2026-02-05T10:30:00.000Z",
  "source": "derived"
}
```

### 1.2 Orders

#### ProductionOrder
```json
{
  "orderId": "ord_001",
  "customer": "Contoso",
  "partNumber": "PN-1001",
  "quantityRequired": 5000,
  "quantityProduced": 1200,
  "quantityScrap": 25,
  "priority": "high",
  "dueDate": "2026-02-10T10:00:00.000Z",
  "status": "running",
  "factoryId": 1,
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-05T10:00:00.000Z"
}
```

#### JobAssignment
```json
{
  "assignmentId": "ja_001",
  "orderId": "ord_001",
  "machineId": 12,
  "plannedStart": "2026-02-05T09:00:00.000Z",
  "plannedEnd": "2026-02-05T18:00:00.000Z",
  "plannedCycleTimeSec": 42.5,
  "cavities": 2,
  "scrapPercent": 0.02,
  "status": "active"
}
```

#### OrderProgress
```json
{
  "orderId": "ord_001",
  "machineId": 12,
  "producedQty": 1200,
  "scrapQty": 25,
  "goodQty": 1175,
  "percentComplete": 23.5,
  "eta": "2026-02-05T17:20:00.000Z",
  "lastCycleAt": "2026-02-05T10:00:00.000Z"
}
```

#### OrderEvent
```json
{
  "eventId": "oe_001",
  "orderId": "ord_001",
  "type": "status_change",
  "message": "Order moved to Running",
  "timestamp": "2026-02-05T09:00:00.000Z"
}
```

### 1.3 Downtime & OEE

#### DowntimeEvent
```json
{
  "eventId": "dt_001",
  "machineId": 12,
  "orderId": "ord_001",
  "startAt": "2026-02-05T12:05:00.000Z",
  "endAt": "2026-02-05T12:40:00.000Z",
  "reasonCode": "material_shortage",
  "reasonLabel": "Material shortage",
  "source": "auto",
  "costImpact": 150.0,
  "notes": "Auto detected by no cycles"
}
```

#### DowntimeReason
```json
{
  "reasonCode": "material_shortage",
  "label": "Material shortage",
  "category": "supply"
}
```

#### OeeInputConfig
```json
{
  "machineId": 12,
  "idealCycleTimeSec": 42.5,
  "plannedTimeMinutes": 480,
  "costPerHour": 50,
  "qualityTarget": 0.98
}
```

#### OeeSummary
```json
{
  "machineId": 12,
  "timeRange": "-24h",
  "availability": 0.82,
  "performance": 0.91,
  "quality": 0.97,
  "oee": 0.72,
  "downtimeMinutes": 85,
  "runMinutes": 395,
  "lostRevenue": 75.0
}
```

#### OeeTrendPoint
```json
{
  "timestamp": "2026-02-05T10:00:00.000Z",
  "oee": 0.71,
  "availability": 0.8,
  "performance": 0.9,
  "quality": 0.98
}
```

---

## 2) Inventory Endpoints

### 2.1 Materials
**GET /materials**
- Query: `limit`, `offset`, `sort`, `filter[name]`
- Response: paginated `Material[]`

**POST /materials**
Request:
```json
{ "name": "ABS", "materialType": "virgin", "densityKgPerM3": 1040, "defaultCostPerKg": 2.4 }
```
Response: `Material`

**PATCH /materials/:id**
Request: partial fields
Response: `Material`

**DELETE /materials/:id**
Response:
```json
{ "status": "success" }
```

### 2.2 Inventory Lots
**GET /inventory/lots**
- Query: `materialId`, `factoryId`, `status`, `limit`, `offset`

**POST /inventory/lots**
Request:
```json
{
  "materialId": "mat_001",
  "supplier": "ACME",
  "batchNumber": "B2026-01",
  "quantityKg": 1200,
  "receivedAt": "2026-02-01T10:00:00.000Z",
  "expiresAt": "2026-08-01T10:00:00.000Z",
  "factoryId": 1,
  "location": "Warehouse A"
}
```

**PATCH /inventory/lots/:id**
- Update status, quantity, location, expiry.

**DELETE /inventory/lots/:id**
- Soft delete preferred.

### 2.3 Lot Adjustments
**POST /inventory/lots/:id/adjust**
Request:
```json
{ "deltaKg": -50, "reason": "manual_correction" }
```
Response: updated `InventoryLot` + ledger entry.

### 2.4 Inventory Summary
**GET /inventory/summary**
Response:
```json
{
  "data": [
    {
      "materialId": "mat_001",
      "name": "ABS",
      "availableKg": 820,
      "reservedKg": 200,
      "estHoursRemaining": 6.5,
      "status": "warning"
    }
  ]
}
```

### 2.5 Material Consumption
**GET /materials/:id/consumption**
- Query: `start`, `end`, `groupBy=hour|day`
- Response: time series of consumed kg.

### 2.6 Material‑Machine / Material‑Order Links
**GET /materials/:id/machines**
**GET /materials/:id/orders**
- Returns list of machines/orders consuming material.

---

## 3) Production Orders & Scheduling Endpoints

### 3.1 Orders
**GET /orders**
- Query: `status`, `priority`, `factoryId`, `limit`, `offset`

**POST /orders**
Request:
```json
{
  "customer": "Contoso",
  "partNumber": "PN-1001",
  "quantityRequired": 5000,
  "dueDate": "2026-02-10T10:00:00.000Z",
  "priority": "high",
  "factoryId": 1
}
```

**PATCH /orders/:id**
- Update status, priority, due date, required qty.

**DELETE /orders/:id**

### 3.2 Order Detail
**GET /orders/:id**
- Returns `ProductionOrder` + active assignment.

### 3.3 Assignment & Lifecycle
**POST /orders/:id/assign**
Request:
```json
{
  "machineId": 12,
  "plannedStart": "2026-02-05T09:00:00.000Z",
  "plannedEnd": "2026-02-05T18:00:00.000Z",
  "plannedCycleTimeSec": 42.5,
  "cavities": 2,
  "scrapPercent": 0.02
}
```

**POST /orders/:id/pause**
**POST /orders/:id/resume**
**POST /orders/:id/complete**

### 3.4 Overview & Schedule
**GET /orders/overview**
Response:
```json
{ "onTrack": 12, "atRisk": 3, "late": 1 }
```

**GET /schedule/machines**
Response:
```json
{
  "data": [
    {
      "machineId": 12,
      "blocks": [
        { "orderId": "ord_001", "start": "2026-02-05T09:00:00Z", "end": "2026-02-05T18:00:00Z", "status": "running" }
      ]
    }
  ]
}
```

### 3.5 Progress & Telemetry Links
**GET /orders/:id/progress**
Response: `OrderProgress`

**GET /orders/:id/alarms**
- Proxy to existing machine alarms for the assigned machine (frontend link).

**GET /orders/:id/spc**
- Proxy to existing machine SPC history (frontend link).

**Progress Calculation**
- `produced_qty = (cycle_count_delta × cavities) - scrap_qty`
- `cycle_count_delta` derived from SPC `cycle_number` deltas.

---

## 4) Downtime & OEE Endpoints

### 4.1 Downtime Events
**GET /downtime/events**
- Query: `machineId`, `orderId`, `start`, `end`, `limit`, `offset`

**POST /downtime/events**
Request:
```json
{
  "machineId": 12,
  "orderId": "ord_001",
  "startAt": "2026-02-05T12:05:00.000Z",
  "reasonCode": "material_shortage",
  "source": "manual"
}
```

**PATCH /downtime/events/:id**
- Update reason, notes.

**POST /downtime/events/:id/close**
Request:
```json
{ "endAt": "2026-02-05T12:40:00.000Z" }
```

### 4.2 Downtime Reasons
**GET /downtime/reasons**
Response:
```json
{
  "data": [
    { "reasonCode": "material_shortage", "label": "Material shortage", "category": "supply" },
    { "reasonCode": "mold_change", "label": "Mold change", "category": "setup" }
  ]
}
```

### 4.3 OEE Summary & Trends
**GET /oee/summary**
- Query: `machineId`, `factoryId`, `start`, `end`

**GET /oee/trends**
- Query: `machineId`, `start`, `end`, `interval=hour|day`

### 4.4 OEE Config
**GET /oee/config**
**PATCH /oee/config**
Request:
```json
{
  "machineId": 12,
  "idealCycleTimeSec": 42.5,
  "plannedTimeMinutes": 480,
  "costPerHour": 50,
  "qualityTarget": 0.98
}
```

**OEE Formulas**
- Availability = Run Time / Planned Time
- Performance = Ideal Cycle Time × Total Cycles / Run Time
- Quality = Good Parts / Total Parts

---

## 5) Required Inputs (No New Telemetry)

### Per Machine
- `idealCycleTimeSec` (for OEE performance)
- `plannedTimeMinutes` (for availability)
- `costPerHour` (downtime cost)
- `defaultShotWeightG` (optional, fallback)
- `defaultCavities` (optional, fallback)

### Per Order / Assignment
- `cavities`
- `scrapPercent`
- `plannedCycleTimeSec` (if overriding machine default)

### Per Material
- `densityKgPerM3`
- `defaultCostPerKg`

### Per Assignment (Material ↔ Machine)
- `shotWeightG`
- `scrapPercent`
- `activeLotId`

**Defaulting / Fallbacks**
- If `shotWeightG` is missing, consumption endpoints return `warnings` and `consumedKg = null`.
- If `cavities` missing, order progress returns `percentComplete = null` and warning.
- If OEE config missing, return `oee = null` with warning.

---

## 6) Example Error Cases

### Missing Required Inputs (400)
```json
{
  "statusCode": 400,
  "message": "Missing cavities for order progress calculation",
  "error": "Bad Request"
}
```

### Partial Results (200 + warnings)
```json
{
  "data": {
    "orderId": "ord_001",
    "percentComplete": null
  },
  "warnings": ["missing_cavities"]
}
```

---

## 7) Feasibility Notes
- All contracts are **frontend‑only assumptions**; no backend exists yet for these domains.
- Computation depends on **existing telemetry**:
  - `cycle_number` (SPC) for cycle deltas
  - `machine-alert` and `alarm-update` for downtime triggers
- No new machine data is required, but **manual configuration inputs are mandatory**.

