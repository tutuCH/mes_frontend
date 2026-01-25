# Backend API v2.0 - SPC Endpoints Specification

## Overview

This document provides a complete technical specification for implementing the SPC (Statistical Process Control) API v2.0 endpoints. These endpoints are required by the frontend `uPlotSPCChart` component and related services (`SPCLimitsService`, `SPCDataService`).

**Status**: Required for frontend functionality
**API Version**: v2.0
**Last Updated**: January 19, 2026

---

## Architecture Overview

### Data Storage

All SPC data is stored in **InfluxDB** with the following structure:

```
Measurement: spc
Tags:
  - deviceId: string (e.g., "M1", "M2")
Fields:
  - cycle_time: float
  - injection_velocity_max: float
  - injection_pressure_max: float
  - switch_pack_time: float
  - temp_1: float
  - temp_2: float
  - temp_3: float
  - oil_temp: float
  - (and other SPC metrics)
Timestamp: _time (RFC3339 format)
```

### Frontend Services

The frontend uses two services that call these endpoints:

1. **SPCLimitsService** (`src/services/spcLimitsService.ts`)
   - Calls `/api/machines/{deviceId}/spc/limits`
   - Implements client-side caching with early refresh (5 min before expiry)

2. **SPCDataService** (`src/services/spcDataService.ts`)
   - Calls `/api/machines/{deviceId}/spc-history`
   - Calls `/api/machines/{deviceId}/spc/latest`
   - Calls `/api/machines/{deviceId}/spc/metadata`

---

## WebSocket Real-time Data Updates

### Current WebSocket Payload Structure (ACTUAL - DEPRECATED)

**Issue**: The current implementation wraps MQTT data in a metadata object, creating a triple-nested structure that requires special handling.

```json
{
  "deviceId": "postgres machine 1",
  "timestamp": "2026-01-19T19:53:22.670Z",
  "data": {
    "devId": "postgres machine 1",
    "topic": "spc/postgres machine 1",
    "sendTime": "2026-01-19T19:53:22.670Z",
    "sendStamp": 1737317202670,
    "time": "2026-01-19T19:53:22.670Z",
    "timestamp": "2026-01-19T19:53:22.670Z",
    "Data": {
      "CYCN": "5637",
      "ECYCT": "65.4",
      "EIVM": "85.2",
      "EIPM": "1250",
      "ESIPT": "2.1",
      "ET1": "185.5",
      "ET2": "190.2",
      "ET3": "195.8"
    }
  }
}
```

**Problems with current structure**:
1. **Triple nesting**: `wsData.data.Data` requires special handling in frontend
2. **Metadata mixing**: Device metadata mixed with actual SPC data
3. **Field codes**: Uses MQTT field codes (ECYCT, ET1) instead of human-readable names
4. **String values**: All values are strings, require parseFloat() conversion

### Expected WebSocket Payload Structure (OPTIMIZED)

**Best Practice**: Send data directly in InfluxDB format with human-readable field names and proper types.

```json
{
  "deviceId": "postgres machine 1",
  "timestamp": "2026-01-19T19:53:22.670Z",
  "data": {
    "cycle_number": 5637,
    "cycle_time": 65.4,
    "injection_velocity_max": 85.2,
    "injection_pressure_max": 1250,
    "switch_pack_time": 2.1,
    "temp_1": 185.5,
    "temp_2": 190.2,
    "temp_3": 195.8
  }
}
```

**Benefits of optimized structure**:
1. **Single nesting**: `wsData.data` directly contains SPC fields
2. **Clean separation**: No metadata pollution
3. **Human-readable names**: `cycle_time` instead of `ECYCT`
4. **Proper types**: Numbers instead of strings
5. **Consistent with REST API**: Matches historical data response format

### WebSocket Event Types

The frontend expects two types of WebSocket events:

#### 1. SPC Update Event

```typescript
interface SPCUpdateEvent {
  deviceId: string;
  timestamp: string;  // ISO 8601 format
  data: {
    // Required fields
    cycle_number: number;
    cycle_time: number;
    injection_velocity_max: number;
    injection_pressure_max: number;
    switch_pack_time: number;
    temp_1: number;
    temp_2: number;
    temp_3: number;

    // Optional fields
    switch_pack_pressure?: number;
    switch_pack_position?: number;
    injection_time?: number;
    plasticizing_time?: number;
    plasticizing_pressure_max?: number;
    temp_4?: number;
    temp_5?: number;
    temp_6?: number;
    temp_7?: number;
    temp_8?: number;
    temp_9?: number;
    temp_10?: number;
  };
}
```

#### 2. Realtime Update Event

```typescript
interface RealtimeUpdateEvent {
  deviceId: string;
  timestamp: string;  // ISO 8601 format
  data: {
    oil_temp: number;
    temp_1: number;
    temp_2: number;
    temp_3: number;
    pressure: number;
    cycle_time: number;
    status: string;
    operate_mode: string;
  };
}
```

### Field Name Mapping

#### MQTT Field Codes (Current) → InfluxDB Field Names (Expected)

| MQTT Code | InfluxDB Field | Description |
|-----------|----------------|-------------|
| CYCN | cycle_number | Cycle Number |
| ECYCT | cycle_time | Cycle Time (seconds) |
| EIVM | injection_velocity_max | Injection Velocity Max (mm/s) |
| EIPM | injection_pressure_max | Injection Pressure Max (bar) |
| ESIPT | switch_pack_time | Switch Pack Time (seconds) |
| EIPT | injection_time | Injection Time (seconds) |
| EPLST | plasticizing_time | Plasticizing Time (seconds) |
| EPLSPM | plasticizing_pressure_max | Plasticizing Pressure Max (bar) |
| ESIPP | switch_pack_pressure | Switch Pack Pressure (bar) |
| ESIPS | switch_pack_position | Switch Pack Position (mm) |
| ET1-ET10 | temp_1-temp_10 | Temperature Zones 1-10 (°C) |
| OT | oil_temp | Oil Temperature (°C) |

---

## Endpoints

### 1. Get SPC Control Limits

**Endpoint**: `GET /api/machines/:deviceId/spc/limits`

**Purpose**: Return precomputed SPC control limits (UCL, LCL, Mean, Standard Deviation) for specified fields. Offloads CPU-intensive calculations from frontend to backend.

#### Request Parameters

| Parameter | Type   | Required | Default | Description                                    | Example                     |
|-----------|--------|----------|---------|------------------------------------------------|-----------------------------|
| `fields`  | string | Yes      | -       | Comma-separated list of metric fields          | `cycle_time,injection_velocity_max` |
| `lookback` | string | No       | `24h`   | Time range for calculation (InfluxDB duration) | `1h`, `6h`, `24h`, `7d`     |
| `sigma`   | number | No       | `3`     | Number of standard deviations for control limits | `2`, `3`, `4`             |

#### Request Example

```http
GET /api/machines/M1/spc/limits?fields=cycle_time&lookback=24h&sigma=3 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200 OK)

```json
{
  "limits": {
    "cycle_time": {
      "mean": 12.34,
      "stdDev": 0.82,
      "ucl": 14.8,
      "lcl": 9.88,
      "n": 1440,
      "calculatedAt": "2026-01-19T10:00:00Z",
      "expiresAt": "2026-01-19T10:30:00Z",
      "isCached": false
    }
  },
  "metadata": {
    "deviceId": "M1",
    "calculationTime": "2026-01-19T10:00:00Z",
    "cacheKey": "M1:cycle_time:24h:3"
  }
}
```

#### TypeScript Interfaces

```typescript
interface SPCLimit {
  mean: number;        // Average value
  stdDev: number;      // Standard deviation
  ucl: number;         // Upper Control Limit (mean + sigma * stdDev)
  lcl: number;         // Lower Control Limit (mean - sigma * stdDev)
  n: number;           // Sample size (number of data points)
  calculatedAt: string; // ISO 8601 timestamp
  expiresAt: string;   // ISO 8601 timestamp (calculatedAt + 30 minutes)
  isCached: boolean;   // Whether this was from cache
}

interface SPCLimitsResponse {
  limits: Record<string, SPCLimit>;
  metadata: {
    deviceId: string;
    calculationTime: string;
    cacheKey: string;
  };
}
```

#### InfluxDB Query

```flux
// For each field requested
from(bucket: "mes")
  |> range(start: -24h)  // lookback parameter
  |> filter(fn: (r) => r["_measurement"] == "spc")
  |> filter(fn: (r) => r["deviceId"] == "M1")  // deviceId parameter
  |> filter(fn: (r) => r["_field"] == "cycle_time")  // iterate through fields
  |> map(fn: (r) => ({ r with _value: float(v: r._value) }))
  |> aggregateWindow(every: inf, fn: mean, createEmpty: false)
  |> yield(name: "mean")

// Calculate statistics
mean = mean(column: "_value")
stdDev = stddev(column: "_value")
ucl = mean + (sigma * stdDev)  // sigma parameter (default 3)
lcl = mean - (sigma * stdDev)
n = count(column: "_value")
```

#### Caching Strategy

- **Cache Duration**: 30 minutes
- **Cache Key Format**: `{deviceId}:{field}:{lookback}:{sigma}`
- **Early Refresh**: Frontend refreshes 5 minutes before `expiresAt`
- **Storage**: Redis or in-memory cache

```javascript
// Cache key example
const cacheKey = `spc:limits:${deviceId}:${fields.join(',')}:${lookback}:sigma${sigma}`;

// Cache entry structure
{
  mean: 12.34,
  stdDev: 0.82,
  ucl: 14.8,
  lcl: 9.88,
  n: 1440,
  calculatedAt: "2026-01-19T10:00:00Z",
  expiresAt: "2026-01-19T10:30:00Z"
}
```

#### Error Responses

| Status | Description | Response Body |
|--------|-------------|---------------|
| `400` | Invalid parameters | `{"error": "Invalid field name: invalid_field"}` |
| `401` | Unauthorized | `{"error": "Missing or invalid authorization token"}` |
| `404` | Machine not found | `{"error": "Machine M1 not found"}` |
| `422` | Insufficient data | `{"error": "Insufficient data for calculation (n < 2)"}` |

---

### 2. Get SPC History

**Endpoint**: `GET /api/machines/:deviceId/spc-history`

**Purpose**: Fetch historical SPC data. Returns raw data from InfluxDB which frontend transforms to chart format.

#### Request Parameters

| Parameter | Type   | Required | Default | Description                              | Example                     |
|-----------|--------|----------|---------|------------------------------------------|-----------------------------|
| `limit`   | number | No       | `50`    | Maximum number of records to return      | `50`, `100`, `200`          |
| `offset`  | number | No       | `0`     | Offset for pagination                      | `0`, `50`, `100`           |
| `start`   | string | No       | -       | Start timestamp (ISO 8601)               | `2026-01-19T09:00:00Z`      |
| `end`     | string | No       | -       | End timestamp (ISO 8601)                 | `2026-01-19T10:00:00Z`      |
| `aggregate` | string | No       | -       | Aggregation window (e.g., "1m", "5m")   | `1m`, `5m`, `15m`            |

#### Request Example

```http
GET /api/machines/M1/spc-history?limit=50 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200 OK)

```json
[
  {
    "_time": "2026-01-19T09:00:00Z",
    "cycle_time": 65.4,
    "cycle_number": 5637,
    "injection_velocity_max": 85.2,
    "temp_1": 185.5
  },
  {
    "_time": "2026-01-19T09:12:00Z",
    "cycle_time": 66.1,
    "cycle_number": 5638,
    "injection_velocity_max": 86.0,
    "temp_1": 186.2
  },
  {
    "_time": "2026-01-19T09:24:00Z",
    "cycle_time": 64.8,
    "cycle_number": 5639,
    "injection_velocity_max": 84.5,
    "temp_1": 184.9
  }
]
```

**Important Notes**:
- Response format is **Array of objects** (not wrapped)
- Each object has `_time` field (InfluxDB timestamp)
- All other fields are **already in InfluxDB format** (human-readable names)
- Values are **numbers** (not strings)

#### InfluxDB Query

```flux
from(bucket: "mes")
  |> range(start: -1h)  // Default time range if not specified
  |> filter(fn: (r) => r["_measurement"] == "spc")
  |> filter(fn: (r) => r["deviceId"] == "M1")
  |> limit(n: 50)  // limit parameter
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
```

---

### 3. Get Latest SPC Data (Optional)

**Endpoint**: `GET /api/machines/:deviceId/spc/latest`

**Purpose**: Fetch the most recent N data points for real-time chart updates. Optimized for high-frequency polling.

#### Request Parameters

| Parameter | Type   | Required | Default | Description                              | Example     |
|-----------|--------|----------|---------|------------------------------------------|-------------|
| `count`   | number | No       | `10`    | Number of latest points to return        | `5`, `10`   |
| `fields`  | string | No       | All     | Comma-separated list of fields to return | `cycle_time` |

#### Request Example

```http
GET /api/machines/M1/spc/latest?count=5&fields=cycle_time HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200 OK)

```json
{
  "deviceId": "M1",
  "data": [
    {
      "_time": "2026-01-19T10:46:00Z",
      "cycle_time": 66.1
    },
    {
      "_time": "2026-01-19T10:47:00Z",
      "cycle_time": 65.8
    },
    {
      "_time": "2026-01-19T10:48:00Z",
      "cycle_time": 66.4
    },
    {
      "_time": "2026-01-19T10:49:00Z",
      "cycle_time": 65.9
    },
    {
      "_time": "2026-01-19T10:50:00Z",
      "cycle_time": 66.2
    }
  ],
  "metadata": {
    "count": 5,
    "cachedAt": "2026-01-19T10:50:01Z"
  }
}
```

#### InfluxDB Query

```flux
from(bucket: "mes")
  |> range(start: -5m)  // Last 5 minutes for latest data
  |> filter(fn: (r) => r["_measurement"] == "spc")
  |> filter(fn: (r) => r["deviceId"] == "M1")
  |> limit(n: 5)  // count parameter
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
```

---

## WebSocket Implementation Guidelines

### Backend WebSocket Payload Format

When sending SPC data via WebSocket, use the following optimized format:

```javascript
// OPTIMIZED FORMAT (Recommended)
const socketEvent = {
  event: 'spc-update',
  deviceId: 'M1',
  timestamp: new Date().toISOString(),
  data: {
    // Use InfluxDB field names (not MQTT codes)
    cycle_number: 5637,
    cycle_time: 65.4,
    injection_velocity_max: 85.2,
    injection_pressure_max: 1250,
    switch_pack_time: 2.1,
    temp_1: 185.5,
    temp_2: 190.2,
    temp_3: 195.8
    // All values should be numbers, not strings
  }
};

// Send via WebSocket
io.emit('spc-update', socketEvent);
```

### Data Transformation Pipeline

```
InfluxDB Storage → REST API Response → WebSocket Event → Frontend
     (cycle_time)      (cycle_time)         (cycle_time)      (cycle_time)
        ↓                  ↓                    ↓                  ↓
    float             float                number             number
```

**Key Principle**: Keep data format consistent across all channels

---

## Implementation Requirements

### Authentication

All endpoints require Bearer token authentication:

```javascript
function authenticateRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return 401;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: decoded.userId, ...decoded };
  } catch (error) {
    return 401;
  }
}
```

### Field Validation

Implement a whitelist of allowed SPC fields:

```javascript
const ALLOWED_SPC_FIELDS = [
  'cycle_number',
  'cycle_time',
  'injection_velocity_max',
  'injection_pressure_max',
  'injection_time',
  'switch_pack_time',
  'switch_pack_pressure',
  'switch_pack_position',
  'plasticizing_time',
  'plasticizing_pressure_max',
  'temp_1',
  'temp_2',
  'temp_3',
  'temp_4',
  'temp_5',
  'temp_6',
  'temp_7',
  'temp_8',
  'temp_9',
  'temp_10',
  'oil_temp',
];

function validateFields(fields) {
  const invalidFields = fields.filter(f => !ALLOWED_SPC_FIELDS.includes(f));
  if (invalidFields.length > 0) {
    throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
  }
  return fields;
}
```

### InfluxDB Connection Setup

```javascript
const { InfluxDB } = require('@influxdata/influxdb-client');

const influxDB = new InfluxDB({
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN,
});

const queryApi = influxDB.getQueryApi(process.env.INFLUXDB_ORG);
```

### SPC Limits Calculation

```javascript
async function calculateSPCLimits(deviceId, field, lookback, sigma) {
  const query = `
    from(bucket: "${process.env.INFLUXDB_BUCKET}")
      |> range(start: -${lookback})
      |> filter(fn: (r) => r["_measurement"] == "spc")
      |> filter(fn: (r) => r["deviceId"] == "${deviceId}")
      |> filter(fn: (r) => r["_field"] == "${field}")
      |> map(fn: (r) => ({ r with _value: float(v: r._value) }))
      |> aggregateWindow(every: inf, fn: mean, createEmpty: false)
  `;

  const result = await queryApi.collectRows(query);

  if (result.length < 2) {
    throw new Error('Insufficient data for calculation');
  }

  const values = result.map(r => r._value);
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);

  return {
    mean,
    stdDev,
    ucl: mean + (sigma * stdDev),
    lcl: mean - (sigma * stdDev),
    n: values.length,
  };
}

function calculateMean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStdDev(values, mean) {
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}
```

---

## Testing

### Test Endpoints Directly

```bash
# Test limits endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/machines/M1/spc/limits?fields=cycle_time"

# Test history endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/machines/M1/spc-history?limit=50"

# Test latest endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/machines/M1/spc/latest?count=5"
```

---

## Performance Targets

| Metric                        | Target | Notes                          |
|-------------------------------|--------|--------------------------------|
| Limits calculation (cached)   | < 20ms | From Redis cache               |
| Limits calculation (uncached) | < 100ms | Full InfluxDB query + calc     |
| History query                 | < 200ms | With downsampling              |
| Latest data query (cached)    | < 20ms | From Redis cache               |
| Latest data query (uncached)  | < 50ms | Simple InfluxDB query          |
| WebSocket payload size         | < 1KB   | Per update                     |

---

## Related Documentation

- `SPC_API_UPDATE_20260118.md` - Frontend-facing API documentation
- `BACKEND_API_REQUIREMENTS.md` - Original API requirements
- `SPC_CHARTS_RENDERING_PLAN.md` - Frontend rendering implementation
- Frontend services:
  - `src/services/spcLimitsService.ts`
  - `src/services/api.ts`
  - `src/components/spc/SPCChart.tsx`
  - `src/utils/fieldMapping.ts`

---

**Status**: Ready for Backend Implementation
**Priority**: Critical (blocks SPC page functionality)
**Implementation Estimate**: 4-6 hours
