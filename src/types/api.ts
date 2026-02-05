// Backend API Response Types
// Based on MES Dashboard Backend Integration Guide

// ============ SPC Series Types (Chart Optimization) ============
export interface SpcSeriesPoint {
  ts: string
  value: number
}

export interface SpcSeriesWindow {
  mode: string  // 'last_15m', 'last_1h', 'last_6h', 'last_24h', 'last_3d', 'last_7d', 'custom'
  start: string
  end: string
}

export interface SpcSeriesSampling {
  limit: number
  returned: number
  downsample: string  // 'none', 'lttb', 'avg', 'minmax'
  intervalMs: number
}

export interface SpcSeriesStats {
  count: number
  mean: number
  stdDev: number
  min: number
  max: number
  median: number
  p95: number
  source: string  // 'raw' or 'downsampled'
}

export interface SpcSeriesLimits {
  ucl: number
  lcl: number
  mean: number
  sigma: number
  method: string  // 'xbar-3sigma'
}

export interface SpcSeriesMeta {
  source: string
  generatedAt: string
}

export interface SpcSeriesResponse {
  machineId: number | null
  field: string | null
  unit: string
  window: SpcSeriesWindow
  sampling: SpcSeriesSampling
  series: SpcSeriesPoint[]
  stats: SpcSeriesStats | null
  limits: SpcSeriesLimits | null
  meta: SpcSeriesMeta
}

export interface SpcSeriesUpdatePoint {
  kind: string  // 'bucketed'
  ts: string
  value: number
}

export interface SpcSeriesUpdateEvent {
  deviceId: string
  field: string
  window: SpcSeriesWindow
  sampling: SpcSeriesSampling
  point: SpcSeriesUpdatePoint
  stats: SpcSeriesStats
  limits: SpcSeriesLimits
  timestamp: string
}

// ============ Auth Types ============
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: BackendUser;
}

export interface SignUpRequest {
  username: string;  // backend expects 'username'
  email: string;
  password: string;
  role?: string;
}

export interface SignUpResponse {
  status: string;
  message: string;  // includes verification link
}

export interface AuthResponse {
  access_token: string;
  user: BackendUser;
  status?: string;
  message?: string;
}

// ============ User Types ============
// Backend-native user response (from API)
export interface BackendUser {
  userId: number;
  username: string;
  email: string;
  accessLevel: 'admin' | 'operator' | 'maintenance' | 'quality' | 'viewer';
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
  stripeCustomerId?: string | null;
}

// Frontend user type (for internal use - maps backend fields to frontend conventions)
export interface User {
  id: number;       // mapped from userId
  name: string;     // mapped from username
  email: string;
  role: 'admin' | 'operator' | 'manager';  // mapped from accessLevel
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: string;
  status?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============ Factory Types ============
export interface Factory {
  factoryId: number;
  factoryName: string;
  factoryIndex: string;
  factoryWidth: number;
  factoryHeight: number;
  createdAt: string;
  machines?: Machine[];
}

export interface CreateFactoryRequest {
  factoryName: string;
  factoryIndex: string;
  width: string;
  height: string;
}

export interface UpdateFactoryRequest {
  factoryName?: string;
  factoryIndex?: number;
  width?: number;
  height?: number;
}

// ============ Machine Types ============
export interface Machine {
  machineId: number;
  machineName: string;
  machineIndex: string;
  status: string;
  createdAt: string;
  factoryId?: number;
}

export interface CreateMachineRequest {
  machineName: string;
  machineIndex: string;
  factoryId: number;
  factoryIndex: string;  // Required by backend DTO
}

export interface UpdateMachineRequest {
  machineName?: string;
  machineIndex?: string;
  status?: string;
}

// ============ Inventory Types ============
export type MaterialType = 'virgin' | 'regrind' | 'additive';

export interface Material {
  materialId: string;
  name: string;
  materialType: MaterialType;
  densityKgPerM3?: number;
  defaultCostPerKg?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type InventoryLotStatus = 'available' | 'reserved' | 'consumed';

export interface InventoryLot {
  lotId: string;
  materialId: string;
  supplier?: string;
  batchNumber?: string;
  quantityKg: number;
  receivedAt?: string;
  expiresAt?: string | null;
  factoryId?: number;
  location?: string;
  status: InventoryLotStatus;
}

export interface MaterialAssignment {
  assignmentId: string;
  machineId: number;
  materialId: string;
  activeLotId?: string | null;
  shotWeightG?: number | null;
  scrapPercent?: number | null;
  cavities?: number | null;
  effectiveAt?: string;
  effectiveUntil?: string | null;
}

export interface MaterialSummary {
  materialId: string;
  name: string;
  availableKg: number;
  reservedKg: number;
  remainingHours: number | null;
  status: 'ok' | 'warning' | 'critical';
}

export interface MaterialConsumptionPoint {
  timestamp: string;
  consumedKg: number;
}

export interface InventoryAlert {
  alertId: string;
  materialId: string;
  machineId?: number;
  severity: 'warning' | 'critical';
  message: string;
  remainingHours?: number | null;
  remainingKg?: number | null;
  createdAt: string;
}

// ============ Tech Configuration Types ============
// Tech configuration stored in Redis cache (TTL: 1 hour)
// Available via GET /machines/:id/status
export interface TechConfiguration {
  // Temperature Setpoints (TS1-TS10)
  TS1?: number;
  TS2?: number;
  TS3?: number;
  TS4?: number;
  TS5?: number;
  TS6?: number;
  TS7?: number;
  TS8?: number;
  TS9?: number;
  TS10?: number;

  // Injection Pressure Steps (IP1-IP10)
  IP1?: number;
  IP2?: number;
  IP3?: number;
  IP4?: number;
  IP5?: number;
  IP6?: number;
  IP7?: number;
  IP8?: number;
  IP9?: number;
  IP10?: number;

  // Injection Velocity Steps (IV1-IV10)
  IV1?: number;
  IV2?: number;
  IV3?: number;
  IV4?: number;
  IV5?: number;
  IV6?: number;
  IV7?: number;
  IV8?: number;
  IV9?: number;
  IV10?: number;

  // Injection Stroke Steps (IS1-IS10)
  IS1?: number;
  IS2?: number;
  IS3?: number;
  IS4?: number;
  IS5?: number;
  IS6?: number;
  IS7?: number;
  IS8?: number;
  IS9?: number;
  IS10?: number;

  // Injection Time Steps (IT1-IT10)
  IT1?: number;
  IT2?: number;
  IT3?: number;
  IT4?: number;
  IT5?: number;
  IT6?: number;
  IT7?: number;
  IT8?: number;
  IT9?: number;
  IT10?: number;
}

export interface MachineStatus {
  machineId: number;
  status: string;
  lastUpdate: string;
  data?: Record<string, unknown>;
  techConfiguration?: TechConfiguration;  // Tech config from Redis cache
}

// ============ Realtime Data Types ============
export interface RealtimeDataPoint {
  time: string;
  oil_temp?: number;
  temp_1?: number;
  temp_2?: number;
  temp_3?: number;
  temp_4?: number;
  temp_5?: number;
  temp_6?: number;
  temp_7?: number;      // Temperature Zone 7
  temp_8?: number;      // Temperature Zone 8 (optional)
  temp_9?: number;      // Temperature Zone 9 (optional)
  temp_10?: number;     // Temperature Zone 10 (optional)
  pressure?: number;
  cycle_time?: number;
  auto_start?: number;  // Auto Start flag (0/1)
  status?: number | string;      // Status (numeric code or string)
  operate_mode?: number | string; // Operation Mode (numeric code or string)
}

export interface RealtimeHistoryResponse {
  data: RealtimeDataPoint[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  metadata: {
    deviceId: string;
    timeRange: string;
    aggregate: string;
  };
}

// ============ SPC Data Types ============
export interface SPCDataPoint {
  // Support both InfluxDB format (_time) and standard format (time)
  _time?: string;
  time?: string;

  // Required fields (always present in backend)
  cycle_number?: number;
  cycle_time?: number;
  injection_velocity_max?: number;
  injection_pressure_max?: number;
  switch_pack_time?: number;
  temp_1?: number;  // Temperature Zones 1-3 (always in SPC)
  temp_2?: number;
  temp_3?: number;

  // Optional InfluxDB fields
  switch_pack_pressure?: number;
  switch_pack_position?: number;
  injection_time?: number;
  plasticizing_time?: number;
  plasticizing_pressure_max?: number;
  temp_4?: number;   // Temperature Zones 4-10 (optional)
  temp_5?: number;
  temp_6?: number;
  temp_7?: number;
  temp_8?: number;
  temp_9?: number;
  temp_10?: number;
}

export interface SPCHistoryResponse {
  data: SPCDataPoint[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  metadata: {
    deviceId: string;
    timeRange: string;
    aggregate: string;
  };
}

// ============ Subscription Types ============
export interface Subscription {
  subscriptionId: number;
  userEmail: string;
  machineId: number;
  createdAt: string;
}

export interface CreateSubscriptionRequest {
  machineId: number;
}

// ============ Health Types ============
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    influxdb: 'up' | 'down';
    mqtt: 'up' | 'down';
  };
}

// ============ WebSocket Event Types ============
export interface SubscribeMachinePayload {
  deviceId: string;
}

export interface RealtimeUpdateEvent {
  deviceId: string;
  timestamp: string;
  Data?: {
    OT?: number;    // Oil Temperature
    T1?: number;    // Temperature Zone 1
    T2?: number;    // Temperature Zone 2
    T3?: number;    // Temperature Zone 3
    T4?: number;    // Temperature Zone 4
    T5?: number;    // Temperature Zone 5
    T6?: number;    // Temperature Zone 6
    T7?: number;    // Temperature Zone 7
    T8?: number;    // Temperature Zone 8
    T9?: number;    // Temperature Zone 9
    T10?: number;   // Temperature Zone 10
    PR?: number;    // Pressure
    ASTS?: number;  // Auto Start (0/1)
    STS?: number;   // Status (numeric: 0=stopped, 1=idle, 2=running, 3=error, 4=maintenance)
    OPM?: number;   // Operation Mode (numeric: 1=manual, 2=semi-auto, 3=auto)
    ECYCT?: number; // Cycle Time
  };
  data?: RealtimeDataPoint & {
    device_id?: string;
    _time?: string;
    topic?: string;
    qos?: string | number;
    retain?: string | boolean;
  };
}

export interface SPCUpdateEvent {
  deviceId: string;
  timestamp: string;
  Data?: {
    // REQUIRED FIELDS (always present)
    CYCN: string;      // Cycle Number
    ECYCT: string;     // Cycle Time
    EIVM: string;      // Injection Velocity Max
    EIPM: string;      // Injection Pressure Max
    ESIPT: string;     // Switch Pack Time
    ET1: string;       // Temperature Zone 1
    ET2: string;       // Temperature Zone 2
    ET3: string;       // Temperature Zone 3

    // OPTIONAL INFLUXDB FIELDS (may be present)
    ESIPP?: string;    // Switch Pack Pressure
    ESIPS?: string;    // Switch Pack Position
    EIPT?: string;     // Injection Time
    EPLST?: string;    // Plasticizing Time
    EPLSPM?: string;   // Plasticizing Pressure Max
    ET4?: string;      // Temperature Zone 4
    ET5?: string;      // Temperature Zone 5
    ET6?: string;      // Temperature Zone 6
    ET7?: string;      // Temperature Zone 7
    ET8?: string;      // Temperature Zone 8
    ET9?: string;      // Temperature Zone 9
    ET10?: string;     // Temperature Zone 10

    // WEBSOCKET-ONLY FIELDS (not in InfluxDB)
    EIPSE?: string;    // End Injection Position Speed
    EFCHT?: string;    // Fast Cooling Hold Time
    EIPSMIN?: string;  // Injection Speed Minimum
    EOT?: string;      // Oil Temperature (SPC context)
    EMOS?: string;     // Motor Speed
    EISS?: string;     // Injection Speed
  };
  data?: SPCDataPoint & {
    device_id?: string;
    _time?: string;
    topic?: string;
    qos?: string | number;
    retain?: string | boolean;
  };
}

export interface MachineAlertEvent {
  deviceId: string;
  timestamp: string;
  alertType: 'warning' | 'critical' | 'info';
  message: string;
  data?: Record<string, unknown>;
}

export interface MachineStatusEvent {
  deviceId: string;
  status: 'running' | 'idle' | 'stopped' | 'error' | 'maintenance';
  timestamp: string;
  source?: string;
}

// ============ API Error Types ============
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ============ Pagination Types ============
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface HistoryQueryParams extends PaginationParams {
  start?: string;
  end?: string;
  aggregate?: 'none' | '1m' | '5m' | '15m' | '1h';
}

// ============ Alarm Types ============
export interface AlarmDataPoint {
  _time: string;
  device_id: string;
  topic: string;
  alarm_id: string;
  alarm_message: string;
}

export interface AlarmHistoryResponse {
  data: AlarmDataPoint[];
  metadata: {
    deviceId: string;
    timeRange: string;
  };
}

export interface AlarmUpdateEvent {
  deviceId: string;
  alarm: {
    id: string;
    message: string;
    timestamp: string;
  };
  timestamp: string;
}

// Normalized alarm for frontend use
export interface Alarm {
  id: string;
  timestamp: string;
  deviceId: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'acknowledged' | 'resolved';
}

// ============ Billing/Subscription Types ============
// NOTE: These types are for Stripe billing subscriptions,
// distinct from machine subscriptions (Subscription type above)

export interface BillingSubscription {
  subscriptionId: string;
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  planId: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  trialEnd?: string;
}

export interface BillingPlan {
  planId: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  maxMachines?: number;
  maxUsers?: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
  createdAt: string;
}

  export interface CheckoutSessionRequest {
    lookupKey: string;
    successUrl: string;
    cancelUrl: string;
  }

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PortalSessionRequest {
  returnUrl: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface BillingDemoInfo {
  isDemo: true;
  message: string;
  demoPlans: BillingPlan[];
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue: number;
  amountPaid: number;
  currency: string;
  dueDate?: string;
  periodStart: string;
  periodEnd: string;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  created: string;
}

export interface UsageMetrics {
  machines: {
    used: number;
    limit: number | null;
  };
  users: {
    used: number;
    limit: number | null;
  };
  periodStart: string;
  periodEnd: string;
}
