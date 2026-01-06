// Backend API Response Types
// Based on MES Dashboard Backend Integration Guide

// ============ Auth Types ============
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface SignUpResponse {
  message: string;
  user: User;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// ============ User Types ============
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Operator' | 'Maintenance' | 'Quality' | 'Viewer';
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

// ============ Factory Types ============
export interface Factory {
  factoryId: number;
  factoryName: string;
  factoryIndex: string;
  width: string;
  height: string;
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
  factoryIndex?: string;
  width?: string;
  height?: string;
}

// ============ Machine Types ============
export interface Machine {
  machineId: number;
  machineName: string;
  machineIpAddress: string;
  machineIndex: string;
  status: string;
  createdAt: string;
  factoryId?: number;
}

export interface CreateMachineRequest {
  machineName: string;
  machineIpAddress: string;
  machineIndex: string;
  factoryId: number;
}

export interface UpdateMachineRequest {
  machineName?: string;
  machineIpAddress?: string;
  machineIndex?: string;
  status?: string;
}

export interface MachineStatus {
  machineId: number;
  status: string;
  lastUpdate: string;
  data?: Record<string, unknown>;
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
  pressure?: number;
  cycle_time?: number;
  status?: string;
  op_mode?: string;
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
  time: string;
  cycle_time?: number;
  shot_weight?: number;
  pack_pressure?: number;
  cooling_time?: number;
  melt_temp?: number;
  mold_temp?: number;
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
  Data: {
    OT?: number;   // Oil Temperature
    T1?: number;   // Temperature Zone 1
    T2?: number;   // Temperature Zone 2
    T3?: number;   // Temperature Zone 3
    T4?: number;   // Temperature Zone 4
    T5?: number;   // Temperature Zone 5
    T6?: number;   // Temperature Zone 6
    PR?: number;   // Pressure
    STS?: string;  // Status
    OPM?: string;  // Operation Mode
    ECYCT?: number; // Cycle Time
  };
}

export interface SPCUpdateEvent {
  deviceId: string;
  timestamp: string;
  Data: {
    ECYCT?: number;  // Cycle Time
    SW?: number;     // Shot Weight
    PP?: number;     // Pack Pressure
    CT?: number;     // Cooling Time
    MT?: number;     // Melt Temperature
    MDT?: number;    // Mold Temperature
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
