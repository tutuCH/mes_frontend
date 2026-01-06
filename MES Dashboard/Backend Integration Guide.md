# Frontend Integration Guide

This guide documents how a frontend app should integrate with the OPC UA Dashboard backend. It is written for a new frontend engineer with no prior context.

## Architecture Overview

The backend is a NestJS + TypeScript app that exposes:

- REST APIs for authentication, CRUD, billing, and historical data.
- Socket.IO WebSocket for live machine updates (realtime + SPC + alerts).
- MQTT ingestion -> Redis queues -> InfluxDB storage -> WebSocket broadcast.

High-level data flow:

1. MQTT devices publish telemetry (realtime, spc, tech).
2. Backend validates messages, queues in Redis, writes to InfluxDB, updates Redis cache.
3. Redis pub/sub notifies the WebSocket gateway.
4. Frontend subscribes to a machine (by `deviceId` = machine name) and receives live updates.
5. Frontend uses REST for historical data, CRUD, and billing.

Quick sequence diagram (REST + WebSocket):
```
Frontend                  Backend (REST)              Backend (WS)            Redis/Influx
   |                            |                          |                        |
   | POST /auth/login           |                          |                        |
   |--------------------------->|                          |                        |
   | 200 {access_token}         |                          |                        |
   |<---------------------------|                          |                        |
   | GET /machines/factories... |                          |                        |
   |--------------------------->|                          |                        |
   | 200 {factories, machines}  |                          |                        |
   |<---------------------------|                          |                        |
   | io.connect()               |                          |                        |
   |------------------------------------------------------>|                        |
   | 'connection' event         |                          |                        |
   |<------------------------------------------------------|                        |
   | emit subscribe-machine     |                          |                        |
   |------------------------------------------------------>|                        |
   |<------------------------- Redis pub/sub ------------->|                        |
   | 'realtime-update'          |                          |                        |
   |<------------------------------------------------------|                        |
   | GET /machines/:id/history  |                          |                        |
   |--------------------------->|--------------------------|-------> InfluxDB       |
   | 200 {data...}              |                          |                        |
   |<---------------------------|                          |                        |
```

## Base URLs and Environment Setup

REST and WebSocket are served from the same host/port.

- REST base URL (dev): `http://localhost:3000`
- REST base URL (prod): `https://<your-domain>`
- WebSocket URL: `ws://<host>:<port>/socket.io/` (Socket.IO, not raw WS)

Recommended frontend env vars:

```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

CORS is configured in `src/main.ts`. Allowed origins include:

- `http://localhost:3030`
- `http://localhost:3031`
- `http://localhost:5173`
- `http://localhost:3000`
- `https://opcua-frontend.vercel.app`
- plus `FRONTEND_URL` from env
- plus additional localhost origins in development

If your frontend runs on a new domain, add it to the CORS list.

## Authentication and Authorization

- JWT-based auth.
- No refresh token flow.
- Every non-`@Public()` endpoint requires `Authorization: Bearer <token>`.
- JWT payload includes `sub` (userId) and `username`.

### Auth Endpoints

#### POST /auth/login
Authenticate with email/password.

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "access_token": "<jwt>",
  "userId": "1"
}
```

Common errors:
- `401 Unauthorized` if credentials are invalid.

#### POST /auth/sign-up
Start signup by creating a verification token. The response includes a verification link (email sending is currently disabled).

Request:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "jdoe"
}
```

Response:
```json
{
  "status": "success",
  "message": "Please verify your email by clicking the link: <frontend-url>/signup?token=..."
}
```

Common errors:
- `409 Conflict` if username is missing or email already exists.

#### GET /auth/verify-email
Complete signup and create the user.

Query params:
- `token` (string, required)

Response (success):
```json
{
  "access_token": "<jwt>",
  "userId": "1",
  "status": "success",
  "message": "Account verified successfully."
}
```

Response (failure):
```json
{
  "status": "error",
  "message": "Invalid or expired verification token."
}
```

#### GET /auth/profile
Returns the JWT payload (no DB lookup).

Response:
```json
{
  "userId": 1,
  "username": "jdoe"
}
```

Common errors:
- `401 Unauthorized` if missing/invalid token.

#### POST /auth/forget-password
Sends a reset link by email.

Request:
```json
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "status": "success",
  "message": "Password reset link sent."
}
```

#### POST /auth/reset-password/:token
Reset password using token.

Request:
```json
{
  "password": "newpassword123"
}
```

Response (success):
```json
{
  "access_token": "<jwt>",
  "userId": "1",
  "status": "success",
  "message": "Password reset successfully."
}
```

Response (failure):
```json
{
  "status": "error",
  "message": "Error resetting password."
}
```

## REST API Reference

All endpoints below require JWT unless marked as Public.

### Factories

#### GET /factories
Returns all factories for the authenticated user, including machines.

Response (example):
```json
[
  {
    "factoryId": 1,
    "factoryName": "Line A",
    "factoryIndex": "1",
    "width": "100",
    "height": "50",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "machines": [
      {
        "machineId": 1,
        "machineName": "Machine 1",
        "machineIpAddress": "192.168.1.100",
        "machineIndex": "1",
        "status": "running",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  }
]
```

Common errors:
- `401 Unauthorized` if token missing/invalid.

#### GET /factories/:id
Returns a single factory (includes `user` and `machines`).

Response (example):
```json
{
  "factoryId": 1,
  "factoryName": "Line A",
  "factoryIndex": "1",
  "width": "100",
  "height": "50",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "user": {
    "userId": 1,
    "username": "jdoe",
    "email": "user@example.com",
    "password": "<hashed>",
    "accessLevel": "",
    "stripeCustomerId": null,
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "machines": []
}
```

Common errors:
- `404 Not Found` if factory does not exist.
- `401/403` if user does not own the factory.

#### GET /factories/user/factories
Lightweight list of factories for the user.

Response (example):
```json
[
  {
    "factoryId": 1,
    "factoryName": "Line A",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

#### POST /factories
Create a new factory.

Request:
```json
{
  "factoryName": "Line B",
  "factoryIndex": 2,
  "width": 120,
  "height": 60
}
```

Response (example):
```json
{
  "factoryId": 2,
  "factoryName": "Line B",
  "factoryIndex": "2",
  "width": "120",
  "height": "60",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

Common errors:
- `404 Not Found` if the user ID in the JWT is missing in DB.

#### PATCH /factories/:factoryId
Update a factory. Include all numeric fields to avoid backend `undefined.toString()` errors.

Request:
```json
{
  "factoryName": "Line B Updated",
  "factoryIndex": 2,
  "width": 120,
  "height": 60
}
```

Response: same shape as POST.

Common errors:
- `404 Not Found` if factory does not exist.
- `401/403` if user does not own the factory.

#### DELETE /factories/:id
Deletes a factory.

Response: empty (204/200 with no body).

Common errors:
- `404 Not Found` if factory does not exist.
- `401/403` if user does not own the factory.

### Machines

#### GET /machines/factories-machines
Returns factories and machines for layout building (note `factoryWidth/Height` names).

Response (example):
```json
[
  {
    "factoryId": 1,
    "factoryName": "Line A",
    "factoryWidth": "100",
    "factoryHeight": "50",
    "machines": [
      {
        "machineId": 1,
        "machineName": "Machine 1",
        "machineIpAddress": "192.168.1.100",
        "machineIndex": 1
      }
    ]
  }
]
```

#### POST /machines
Create a new machine.

Request (factoryIndex is required by DTO even though it is not used):
```json
{
  "machineName": "Machine 2",
  "machineIpAddress": "192.168.1.101",
  "machineIndex": "2",
  "factoryId": 1,
  "factoryIndex": 1,
  "status": "offline"
}
```

Response (example):
```json
{
  "machineId": 2,
  "machineName": "Machine 2",
  "machineIpAddress": "192.168.1.101",
  "machineIndex": "2",
  "status": "offline",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

Common errors:
- `404 Not Found` if factory does not exist.
- `401/403` if user does not own the factory.
- `409 Conflict` if machine IP address conflicts (DB constraint may vary by environment).

#### GET /machines/:id
Returns a machine with `user` and `factory` relations.

Response (example):
```json
{
  "machineId": 1,
  "machineName": "Machine 1",
  "machineIpAddress": "192.168.1.100",
  "machineIndex": "1",
  "status": "running",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "factory": {
    "factoryId": 1,
    "factoryName": "Line A",
    "factoryIndex": "1",
    "width": "100",
    "height": "50",
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "user": {
    "userId": 1,
    "username": "jdoe",
    "email": "user@example.com",
    "password": "<hashed>",
    "accessLevel": ""
  }
}
```

Common errors:
- `404 Not Found` if machine does not exist.
- `401/403` if user does not own the machine.

#### PATCH /machines/:id
Update machine properties.

Request:
```json
{
  "machineName": "Machine 1A",
  "machineIpAddress": "192.168.1.110",
  "machineIndex": "1",
  "factoryId": 1,
  "factoryIndex": 1,
  "status": "maintenance"
}
```

Response: updated machine entity.

Common errors:
- `404 Not Found` if machine does not exist.
- `401/403` if user does not own the machine.

#### POST /machines/update-index
Update a machine index within a factory (used for ordering).

Request:
```json
{
  "machineId": 1,
  "machineIndex": 3,
  "factoryId": 1
}
```

Response:
```json
{
  "message": "Machine with ID 1 successfully updated. New machineIndex: 3",
  "status": "success",
  "machineId": 1,
  "machineIndex": 3
}
```

Common errors:
- `404 Not Found` if machine or factory does not exist.
- `401/403` if user does not own the factory or machine.

#### DELETE /machines/:id
Deletes a machine.

Response (string):
```json
"Machine with ID 1 successfully removed."
```

Common errors:
- `404 Not Found` if machine does not exist.
- `401/403` if user does not own the machine.

### Machine History and Status

All endpoints verify machine ownership via the JWT.

#### GET /machines/:id/realtime-history
Returns raw InfluxDB realtime data for the machine. Query params are accepted but not fully enforced.

Query params:
- `timeRange` (default `-1h`)
- `limit`, `offset` (accepted but not applied to the Influx query)
- `aggregate` (accepted but not applied)

Response (example):
```json
{
  "data": [
    {
      "_time": "2025-01-15T10:00:00.000Z",
      "device_id": "Machine 1",
      "topic": "realtime",
      "oil_temp": 52.3,
      "auto_start": 0,
      "operate_mode": 2,
      "status": 2,
      "temp_1": 221.5,
      "temp_2": 220.8,
      "temp_3": 222.1
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 1000,
    "offset": 0
  },
  "metadata": {
    "deviceId": "Machine 1",
    "timeRange": "-1h",
    "aggregate": "none"
  }
}
```

Common errors:
- `404 Not Found` if machine does not exist.
- `401/403` if user does not own the machine.

#### GET /machines/:id/spc-history
Returns raw InfluxDB SPC data for the machine.

Query params:
- `timeRange` (default `-1h`)
- `limit`, `offset` (accepted but not applied)
- `aggregate` (accepted but not applied)

Response (example):
```json
{
  "data": [
    {
      "_time": "2025-01-15T10:00:00.000Z",
      "device_id": "Machine 1",
      "topic": "spc",
      "cycle_number": 6026,
      "cycle_time": 45.2,
      "injection_velocity_max": 152.3,
      "injection_pressure_max": 78.5,
      "switch_pack_time": 2.5,
      "temp_1": 221.5,
      "temp_2": 220.8,
      "temp_3": 222.1
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 1000,
    "offset": 0
  },
  "metadata": {
    "deviceId": "Machine 1",
    "timeRange": "-1h",
    "aggregate": "none"
  }
}
```

#### GET /machines/:id/status
Returns the latest cached status from Redis (or a "No status" message).

Response (example):
```json
{
  "deviceId": "Machine 1",
  "status": {
    "devId": "Machine 1",
    "topic": "realtime",
    "timestamp": 1726238466000,
    "Data": {
      "OT": 52.3,
      "ASTS": 0,
      "OPM": 2,
      "STS": 2,
      "T1": 221.5
    },
    "lastUpdated": "2025-01-15T10:00:01.000Z"
  },
  "lastUpdated": "2025-01-15T10:00:01.000Z"
}
```

#### GET /machines/:id/history/stream
Returns combined realtime/SPC datasets. Headers are chunked but the response is a single JSON payload.

Query params:
- `timeRange` (default `-1h`)
- `dataType` (`realtime`, `spc`, or omit for both)

Response (example):
```json
{
  "deviceId": "Machine 1",
  "timeRange": "-1h",
  "data": {
    "realtime": ["..."],
    "spc": ["..."]
  },
  "totalRecords": 123
}
```

### User Management (Admin/Internal)

These endpoints are protected by JWT but do not enforce admin roles. Responses include the `password` field.

#### POST /user
Create a user directly (password is not hashed here).

Request:
```json
{
  "username": "jdoe",
  "email": "user@example.com",
  "password": "password123",
  "accessLevel": "admin"
}
```

Response: user entity.

#### GET /user
Returns all users (includes password).

#### GET /user/:email
Returns a single user (includes password).

#### PATCH /user/:id
Update a user by ID.

#### DELETE /user/:email
Delete a user by email.

Common errors:
- `404 Not Found` if user does not exist (PATCH/DELETE).

### Subscription & Billing

All endpoints are prefixed with `/api/subscription` and require JWT.

#### POST /api/subscription/create-checkout-session
Create a Stripe checkout session.

Request:
```json
{
  "lookupKey": "basic_monthly",
  "successUrl": "https://yourapp.com/billing/success",
  "cancelUrl": "https://yourapp.com/billing/cancel"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "sessionId": "cs_test_..."
  }
}
```

Common errors:
- `400 Bad Request` if Stripe is not configured or unhealthy.

#### POST /api/subscription/create-portal-session
Create a Stripe billing portal session.

Request:
```json
{
  "returnUrl": "https://yourapp.com/account"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "url": "https://billing.stripe.com/p/session/..."
  }
}
```

#### GET /api/subscription/current
Returns the current subscription (or `null` if none / demo mode).

Response:
```json
{
  "subscription": {
    "id": "sub_...",
    "status": "active",
    "plan": {
      "id": "basic_monthly",
      "name": "Basic",
      "price": 9.99,
      "currency": "USD",
      "interval": "month"
    },
    "currentPeriodStart": 1736240000,
    "currentPeriodEnd": 1738918400,
    "cancelAtPeriodEnd": false
  }
}
```

#### GET /api/subscription/plans
Returns subscription plans (Stripe plans or demo fallback).

Response:
```json
{
  "plans": [
    {
      "id": "basic_monthly",
      "name": "Basic",
      "description": "Perfect for small projects",
      "price": 9.99,
      "currency": "USD",
      "interval": "month",
      "features": ["Up to 5 machines"],
      "popular": false
    }
  ]
}
```

#### GET /api/subscription/payment-methods
Returns stored payment methods.

Response:
```json
{
  "status": "success",
  "data": {
    "payment_methods": [
      {
        "id": "pm_...",
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2026,
        "is_default": false
      }
    ]
  }
}
```

#### DELETE /api/subscription/:subscriptionId
Cancel a subscription at period end.

Response:
```json
{
  "status": "success",
  "data": {
    "subscription": {
      "id": "sub_...",
      "status": "active",
      "cancel_at_period_end": true,
      "current_period_end": 1738918400
    }
  }
}
```

### Stripe Webhooks (Public)

#### POST /api/webhooks/stripe
Stripe webhook endpoint. Requires raw body and `stripe-signature` header. Do not call from frontend.

### MQTT Connection

#### POST /connections
Creates a new AWS IoT connection. The `brokerUrl` field is required by DTO but is currently ignored by the backend.

Request:
```json
{
  "brokerUrl": "mqtt://localhost:1883",
  "username": "optional",
  "password": "optional"
}
```

Response:
```json
{
  "message": "Connected successfully",
  "clientId": "<uuid>"
}
```

#### DELETE /connections/:clientId
Deletes the AWS IoT thing and disconnects the client.

Response:
```json
{
  "message": "Connection removed and machine deleted successfully"
}
```

### Machine Timestream (Internal)

#### POST /machine-timestream
Loads demo CSV data into AWS Timestream.

Response:
```json
{
  "success": true,
  "recordsLoaded": 1234
}
```

### Health (Public)

#### GET /health
System-wide health status.

Response (example):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "services": {
    "database": { "status": "ok", "responseTime": 5 },
    "influxdb": { "status": "ok", "responseTime": 8 },
    "redis": { "status": "ok", "responseTime": 2 },
    "mqtt": { "status": "ok" },
    "websocket": { "status": "ok" },
    "mockData": { "status": "ok" }
  },
  "overallResponseTime": 22
}
```

#### GET /health/database | /health/influxdb | /health/redis | /health/mqtt | /health/websocket
Service-specific health checks. Each returns:

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "responseTime": 3,
  "details": {
    "connected": true
  }
}
```

#### GET /health/demo
Demo system status (includes integration summary and machine count).

#### GET /health/config
Exposes current configuration snapshot (safe values only).

Response example (`/health/config`):
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "environment": "development",
  "demoEnabled": true,
  "services": {
    "postgres": { "host": "localhost", "port": 5432, "database": "opcua_dashboard" },
    "influxdb": { "url": "http://localhost:8086", "org": "opcua-org", "bucket": "machine-data" },
    "redis": { "host": "localhost", "port": 6379 },
    "mqtt": { "brokerUrl": "mqtt://localhost:1883" }
  }
}
```

### Demo APIs (Public)

These endpoints are used for demo environments and local testing.

#### GET /demo/status
Returns demo status, service health summary, machine count.

Response example:
```json
{
  "status": "active",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "environment": "demo",
  "machineCount": 3,
  "mockDataRunning": true,
  "systemHealth": "healthy",
  "services": {
    "postgresql": "ok",
    "influxdb": "ok",
    "redis": "ok",
    "mqtt": "ok",
    "websocket": "ok"
  },
  "integration": "demoMqttServer"
}
```

#### GET /demo/machines
Returns machine list with online/offline info.

Response example:
```json
{
  "machines": [
    {
      "id": 1,
      "name": "Machine 1",
      "ipAddress": "192.168.1.100",
      "index": "1",
      "status": "running",
      "factory": "Line A",
      "lastDataReceived": "2025-01-15T10:00:01.000Z",
      "isOnline": true
    }
  ],
  "total": 1,
  "online": 1,
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### GET /demo/machines/:deviceId/status
Returns cached status + tech configuration for a specific device.

Response example:
```json
{
  "machine": {
    "id": 1,
    "name": "Machine 1",
    "ipAddress": "192.168.1.100",
    "factory": "Line A"
  },
  "status": { "devId": "Machine 1", "Data": { "OT": 52.3 } },
  "techConfiguration": { "tempSetpoints": [220, 221, 222] },
  "lastUpdated": "2025-01-15T10:00:01.000Z",
  "isOnline": true,
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### GET /demo/machines/:deviceId/realtime
Returns realtime history from InfluxDB for a device.

Response example:
```json
{
  "deviceId": "Machine 1",
  "timeRange": "-1h",
  "data": [{ "_time": "2025-01-15T10:00:00.000Z", "oil_temp": 52.3 }],
  "dataPoints": 120,
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### GET /demo/machines/:deviceId/spc
Returns SPC history from InfluxDB for a device.

Response example:
```json
{
  "deviceId": "Machine 1",
  "timeRange": "-1h",
  "data": [{ "_time": "2025-01-15T10:00:00.000Z", "cycle_number": 6026 }],
  "cycles": 45,
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### GET /demo/queue/status
Returns Redis queue lengths and processor status.

Response example:
```json
{
  "status": "active",
  "queues": {
    "realtime": { "length": 0, "name": "mqtt:realtime" },
    "spc": { "length": 1, "name": "mqtt:spc" },
    "tech": { "length": 0, "name": "mqtt:tech" }
  },
  "totalMessages": 1,
  "processor": { "connected": true, "processing": true },
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### GET /demo/websocket/status
Returns websocket connection/subscription counts.

Response example:
```json
{
  "status": "active",
  "connectedClients": 2,
  "subscriptions": { "Machine 1": 1 },
  "totalSubscriptions": 1,
  "activeRooms": ["machine-Machine 1"],
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### POST /demo/mock-data/start
Start mock data generation.

Response example:
```json
{
  "status": "started",
  "message": "Mock data generation started",
  "isRunning": true,
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### POST /demo/mock-data/stop
Stop mock data generation.

Response example:
```json
{
  "status": "stopped",
  "message": "Mock data generation stopped",
  "isRunning": false,
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### GET /demo/mock-data/status
Return mock data generator stats.

Response example:
```json
{
  "isGenerating": true,
  "status": "running",
  "generatedCount": 120,
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### POST /demo/influxdb/flush
Flush InfluxDB buffer.

Response example:
```json
{
  "status": "flushed",
  "message": "InfluxDB write buffer flushed",
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### DELETE /demo/cache/clear
Clear all machine caches.

Response example:
```json
{
  "status": "cleared",
  "message": "All machine caches cleared",
  "machinesCleared": 3,
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### DELETE /demo/cache/clear/:deviceId
Clear cache for one machine.

Response example:
```json
{
  "status": "cleared",
  "message": "Cache cleared for machine Machine 1",
  "deviceId": "Machine 1",
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### GET /demo/metrics
System metrics summary (health, machines, queues, websocket, mock data).

Response example:
```json
{
  "system": { "health": "healthy", "responseTime": 20, "uptime": 3600 },
  "machines": { "total": 3, "online": 2, "offline": 1 },
  "queues": { "totalMessages": 0, "processingRate": "N/A" },
  "websocket": { "connectedClients": 1, "totalSubscriptions": 1 },
  "mockData": { "enabled": true, "stats": { "generatedCount": 120 } },
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

#### GET /demo/logs/recent
Returns a placeholder message (log retrieval is not implemented).

Response example:
```json
{
  "message": "Log retrieval not implemented in this demo",
  "suggestion": "Use \"npm run demo:logs\" to view Docker Compose logs",
  "lines": 100,
  "timestamp": "2025-01-15T10:00:02.000Z"
}
```

### Debug APIs (Public, Development Only)

Use for debugging only. Do not call from production frontend.

#### GET /debug/redis/queue-lengths
```json
{
  "success": true,
  "mqtt:realtime": 0,
  "mqtt:spc": 1,
  "mqtt:tech": 0,
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

#### GET /debug/redis/peek-message/:queue
```json
{ "message": { "topic": "device/realtime", "payload": {} }, "queue": "mqtt:realtime" }
```

#### GET /debug/process/single-realtime
```json
{ "success": true, "processedMessage": { "payload": {} }, "remainingInQueue": 0 }
```

#### GET /debug/process/single-spc
```json
{ "success": true, "processedMessage": { "payload": {} }, "remainingInQueue": 0 }
```

#### GET /debug/influxdb/test-connection
```json
{ "success": true, "testData": { "devId": "test-device", "topic": "test" } }
```

#### GET /debug/processor/status
```json
{ "isConnected": true, "processingStats": { "connected": true, "queueLengths": {} } }
```

#### GET /debug/process/flush-all
```json
{ "success": true, "processedCount": 2, "remainingQueues": { "mqtt:realtime": 0 } }
```

#### GET /debug/simple-machine-check
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:00:00.000Z",
  "machineCount": 1,
  "machines": [{ "id": 1, "name": "Machine 1", "ip": "192.168.1.100", "status": "running" }],
  "targetMachineExists": false
}
```

#### GET /debug/comprehensive-diagnostic
```json
{
  "timestamp": "2025-01-15T10:00:00.000Z",
  "services": { "mqttProcessor": { "connected": true, "stats": {} } },
  "machines": { "count": 1, "machines": [] },
  "queues": { "mqtt:realtime": 0, "mqtt:spc": 0, "mqtt:tech": 0 },
  "errors": []
}
```

#### GET /debug/subscription/user/:userId
```json
{ "timestamp": "2025-01-15T10:00:00.000Z", "userId": 1, "database": {}, "stripe": {} }
```

#### POST /debug/subscription/sync/:userId
```json
{ "timestamp": "2025-01-15T10:00:00.000Z", "userId": 1, "success": true }
```

#### GET /debug/subscription/database-state
```json
{ "timestamp": "2025-01-15T10:00:00.000Z", "totalSubscriptions": 0, "subscriptions": [] }
```

Common errors:
- `500 Internal Server Error` when dependencies (Redis/Stripe) are unavailable.

## WebSocket Integration (Socket.IO)

### Connection Lifecycle

1. Connect via Socket.IO.
2. Listen for the server `connection` event (separate from Socket.IO `connect`).
3. Subscribe to machines with `subscribe-machine` (use `deviceId` = machine name).
4. Receive realtime updates, SPC updates, and alerts.
5. On reconnect, re-subscribe to all machines.

Connection limits and timeouts:

- Max 5 concurrent connections per IP.
- Server disconnects idle clients after ~5 minutes of inactivity.
- Ping timeout 60s, ping interval 25s.

### Client -> Server Events

#### subscribe-machine
Payload:
```json
{ "deviceId": "Machine 1" }
```

#### unsubscribe-machine
Payload:
```json
{ "deviceId": "Machine 1" }
```

#### get-machine-status
Payload:
```json
{ "deviceId": "Machine 1" }
```

#### ping
No payload. Used to keep the connection alive.

### Server -> Client Events

#### connection
Emitted after handshake.

```json
{
  "message": "Connected to OPC UA Dashboard",
  "serverTime": "2025-01-15T10:00:00.000Z",
  "clientId": "<socket-id>",
  "connectionsFromIP": 1,
  "maxConnections": 5
}
```

#### subscription-confirmed | unsubscription-confirmed
```json
{ "deviceId": "Machine 1" }
```

#### realtime-update
```json
{
  "deviceId": "postgres machine 1",
  "data": {
    "devId": "postgres machine 1",
    "topic": "realtime",
    "timestamp": 1767734969931,
    "Data": {
      "OT": 53.5,
      "ASTS": 0,
      "OPM": 3,
      "STS": 2,
      "T1": 221.5,
      "T2": 220.8,
      "T3": 222.1,
      "T4": 221.9,
      "T5": 222.3,
      "T6": 221.7,
      "T7": 222.0
    }
  },
  "timestamp": "2026-01-06T21:29:29.092Z"
}
```

#### spc-update
```json
{
  "deviceId": "Machine 1",
  "data": {
    "devId": "Machine 1",
    "topic": "spc",
    "timestamp": 1736935200000,
    "Data": {
      "CYCN": "6026",
      "ECYCT": "45.2",
      "EIVM": "152.3",
      "EIPM": "78.5",
      "ET1": "221.5"
    }
  },
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

#### machine-status
```json
{
  "deviceId": "Machine 1",
  "data": { "devId": "Machine 1", "Data": { "OT": 52.3 } },
  "source": "cache"
}
```

#### machine-alert
Alerts are generated server-side based on realtime data.

```json
{
  "deviceId": "Machine 1",
  "alert": {
    "type": "high_oil_temperature",
    "severity": "warning",
    "message": "Oil temperature is high: 82C",
    "threshold": 80,
    "value": 82
  },
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

#### pong
```json
{ "timestamp": "2025-01-15T10:00:00.000Z" }
```

#### error
```json
{ "message": "Connection limit exceeded", "code": "CONNECTION_LIMIT_EXCEEDED" }
```

Notes:
- Only connection-limit errors include a `code`. Other errors include `message` only.
- The gateway does not currently require auth for WebSocket connections.

### DemoMqttServer Log Objects (Debugging)

These are log summaries you will see in backend output when demo data is flowing.
They are useful for debugging, but are not client-facing payloads.

#### Parsed MQTT message (debug)
```json
{
  "devId": "postgres machine 1",
  "topic": "realtime",
  "timestamp": 1767734969931,
  "dataKeys": ["OT", "ASTS", "OPM", "STS", "T1", "T2", "T3", "T4", "T5", "T6", "T7"]
}
```

#### Broadcast payload summary (debug)
```json
{
  "deviceId": "postgres machine 1",
  "dataType": "realtime",
  "timestamp": "2026-01-06T21:29:29.092Z",
  "subscribedClients": 0
}
```

## Frontend Data Flow and State Expectations

Key identifiers:

- REST uses `machineId` for most endpoints.
- WebSocket and MQTT use `deviceId` = `machine.machineName`.

Recommended frontend flow:

1. Login -> store `access_token`.
2. Fetch `/machines/factories-machines` or `/factories` for layout.
3. Build a lookup map of `machineId -> machineName`.
4. For realtime views:
   - Connect WebSocket.
   - Subscribe using `deviceId` = `machineName`.
   - Update per-machine state on `realtime-update` / `spc-update` / `machine-alert`.
5. For history views:
   - Call `/machines/:id/realtime-history` and `/machines/:id/spc-history`.
   - Note that history uses Influx field names (snake_case).
6. For status widgets:
   - Use `/machines/:id/status` for one-off status.
   - Or rely on WebSocket `machine-status` after subscription.

Field mapping tips (realtime updates vs. history data):

- WebSocket realtime uses raw MQTT tags like `Data.OT`, `Data.T1`, `Data.EIVM`, `Data.EIPM`.
- There are no camelCase aliases (e.g., `oilTemp`, `injectionVelocity`, `injectionPressure`) in live payloads.
- History uses Influx fields: `oil_temp`, `temp_1`, `operate_mode`, etc.
- Normalize these into one frontend shape to simplify UI.

## Field Mapping Appendix (MQTT vs InfluxDB)

Use this table to normalize telemetry between live WebSocket events and historical REST responses.

Realtime data:

| Meaning | MQTT (WebSocket payload) | InfluxDB (history payload) |
| --- | --- | --- |
| Device ID | `devId` | `device_id` |
| Oil temperature | `Data.OT` | `oil_temp` |
| Auto start | `Data.ASTS` | `auto_start` |
| Operate mode | `Data.OPM` | `operate_mode` |
| Status | `Data.STS` | `status` |
| Temperature zone 1 | `Data.T1` | `temp_1` |
| Temperature zone 2 | `Data.T2` | `temp_2` |
| Temperature zone 3 | `Data.T3` | `temp_3` |
| Temperature zone 4 | `Data.T4` | `temp_4` |
| Temperature zone 5 | `Data.T5` | `temp_5` |
| Temperature zone 6 | `Data.T6` | `temp_6` |
| Temperature zone 7 | `Data.T7` | `temp_7` |

SPC data:

| Meaning | MQTT (WebSocket payload) | InfluxDB (history payload) | Availability |
| --- | --- | --- | --- |
| Device ID | `devId` | `device_id` (tag) | Always |
| Cycle number | `Data.CYCN` | `cycle_number` | Always |
| Cycle time | `Data.ECYCT` | `cycle_time` | Always |
| Injection velocity max | `Data.EIVM` | `injection_velocity_max` | Always |
| Injection pressure max | `Data.EIPM` | `injection_pressure_max` | Always |
| Switch pack time | `Data.ESIPT` | `switch_pack_time` | Always |
| Switch pack pressure | `Data.ESIPP` | `switch_pack_pressure` | Optional |
| Switch pack position | `Data.ESIPS` | `switch_pack_position` | Optional |
| Injection time | `Data.EIPT` | `injection_time` | Optional |
| Plasticizing time | `Data.EPLST` | `plasticizing_time` | Optional |
| Plasticizing pressure max | `Data.EPLSPM` | `plasticizing_pressure_max` | Optional |
| Temperature zone 1 | `Data.ET1` | `temp_1` | Always |
| Temperature zone 2 | `Data.ET2` | `temp_2` | Always |
| Temperature zone 3 | `Data.ET3` | `temp_3` | Always |
| Temperature zone 4 | `Data.ET4` | `temp_4` | Optional |
| Temperature zone 5 | `Data.ET5` | `temp_5` | Optional |
| Temperature zone 6 | `Data.ET6` | `temp_6` | Optional |
| Temperature zone 7 | `Data.ET7` | `temp_7` | Optional |
| Temperature zone 8 | `Data.ET8` | `temp_8` | Optional |
| Temperature zone 9 | `Data.ET9` | `temp_9` | Optional |
| Temperature zone 10 | `Data.ET10` | `temp_10` | Optional |

**Additional SPC fields (WebSocket only, not stored in InfluxDB):**
- `Data.EIPSE` - End injection position speed
- `Data.EFCHT` - Fast cooling hold time
- `Data.EIPSMIN` - Injection speed minimum
- `Data.EOT` - Oil temperature (in SPC context)
- `Data.EMOS` - Motor speed
- `Data.EISS` - Injection speed

### Field Availability Notes

**Realtime Data:**
- All 11 fields (`OT`, `ASTS`, `OPM`, `STS`, `T1`-`T7`) are always present in WebSocket updates
- All 11 fields are stored in InfluxDB historical data
- Field values are transmitted as numbers (parsed from DynamoDB format)

**SPC Data:**
- **Required fields** (always present): `CYCN`, `ECYCT`, `EIVM`, `EIPM`, `ESIPT`, `ET1`, `ET2`, `ET3`
- **Optional InfluxDB fields** (may be present): `ESIPP`, `ESIPS`, `EIPT`, `EPLST`, `EPLSPM`, `ET4`-`ET10`
- **WebSocket-only fields** (not in InfluxDB): `EIPSE`, `EFCHT`, `EIPSMIN`, `EOT`, `EMOS`, `EISS`
- Frontend should handle missing optional fields gracefully
- All SPC field values are transmitted as strings in WebSocket payloads

**Tech Data:**
- Only available via Redis cache (accessed through `GET /machines/:id/status` which may include tech config)
- Not broadcast via WebSocket realtime updates
- Contains 50 fields organized as 5 arrays of 10 values each:
  - `TS1`-`TS10` (Temperature Setpoints)
  - `IP1`-`IP10` (Injection Pressure Steps)
  - `IV1`-`IV10` (Injection Velocity Steps)
  - `IS1`-`IS10` (Injection Stroke Steps)
  - `IT1`-`IT10` (Injection Time Steps)
- Tech configuration changes infrequently (typically only on job changes)
- TTL: 1 hour in Redis cache

## Error Handling

REST errors use standard NestJS shape:

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Bad Request"
}
```

Common error cases:

- `401 Unauthorized`: missing/invalid JWT.
- `403 Forbidden`: user does not own the resource.
- `404 Not Found`: resource does not exist.
- `409 Conflict`: duplicate user or machine IP (environment-dependent).
- `400 Bad Request`: Stripe not configured, invalid input, or webhook issues.

WebSocket errors should be handled via the `error` event. Always resubscribe after reconnect.

## Best Practices and Pitfalls

- Use `machineName` as `deviceId` for WebSocket subscriptions.
- Do not rely on pagination for `/machines/:id/*-history` (limit/offset are currently ignored).
- Avoid using `/user` endpoints in frontend; they expose `password` fields and lack role checks.
- WebSocket does not enforce auth; frontend should still enforce access by user.
- When updating factories, send all numeric fields to avoid backend `undefined` handling errors.
- Handle Stripe endpoints defensively (can return demo-mode errors in non-prod).
- Keep WebSocket connections under 5 per IP (tab explosion will disconnect).

## Example Frontend Snippets

### REST Client (Fetch)

```ts
export class ApiClient {
  constructor(private baseUrl: string, private token?: string) {}

  setToken(token: string) {
    this.token = token;
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async login(email: string, password: string) {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    this.setToken(data.access_token);
    return data;
  }

  async getFactoriesAndMachines() {
    const res = await fetch(`${this.baseUrl}/machines/factories-machines`, {
      headers: this.headers(),
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}
```

### WebSocket Setup (Socket.IO)

```ts
import { io, Socket } from 'socket.io-client';

export function createMachineSocket(url: string): Socket {
  const socket = io(url, {
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connection', (info) => {
    console.log('Server connection info:', info);
  });

  socket.on('error', (err) => {
    console.error('Socket error', err);
  });

  socket.on('disconnect', () => {
    // Re-subscribe after reconnect in your app logic
  });

  return socket;
}
```

### Subscription Flow Example

```ts
const socket = createMachineSocket(import.meta.env.VITE_WS_URL);
const deviceId = 'Machine 1'; // machineName

socket.emit('subscribe-machine', { deviceId });

socket.on('realtime-update', (payload) => {
  console.log('Realtime update', payload);
});
```

## Testing Tips

- REST: use Postman or `curl` with `Authorization: Bearer <token>`.
- WebSocket: use `socket.io-client` or `wscat` (Socket.IO protocol only).

Example wscat connect:

```
wscat -c "ws://localhost:3000/socket.io/?EIO=4&transport=websocket"
```

Example subscribe frame:

```
40
42["subscribe-machine",{"deviceId":"Machine 1"}]
```
