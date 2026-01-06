// Field Mapping Utilities
// Maps between MQTT WebSocket format and InfluxDB REST format

import type { RealtimeUpdateEvent, SPCUpdateEvent, RealtimeDataPoint, SPCDataPoint } from '@/types/api';

// ============ Realtime Data Field Mapping ============
// MQTT (WebSocket) -> InfluxDB (REST)
export const REALTIME_FIELD_MAP: Record<string, string> = {
  'OT': 'oil_temp',
  'T1': 'temp_1',
  'T2': 'temp_2',
  'T3': 'temp_3',
  'T4': 'temp_4',
  'T5': 'temp_5',
  'T6': 'temp_6',
  'PR': 'pressure',
  'STS': 'status',
  'OPM': 'op_mode',
  'ECYCT': 'cycle_time',
};

// Reverse mapping: InfluxDB -> MQTT
export const REALTIME_FIELD_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(REALTIME_FIELD_MAP).map(([k, v]) => [v, k])
);

// ============ SPC Data Field Mapping ============
// MQTT (WebSocket) -> InfluxDB (REST)
export const SPC_FIELD_MAP: Record<string, string> = {
  'ECYCT': 'cycle_time',
  'SW': 'shot_weight',
  'PP': 'pack_pressure',
  'CT': 'cooling_time',
  'MT': 'melt_temp',
  'MDT': 'mold_temp',
};

// Reverse mapping: InfluxDB -> MQTT
export const SPC_FIELD_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SPC_FIELD_MAP).map(([k, v]) => [v, k])
);

// ============ Status Mapping ============
export const STATUS_MAP: Record<string, string> = {
  'RUN': 'running',
  'IDLE': 'idle',
  'STOP': 'stopped',
  'ERR': 'error',
  'MAINT': 'maintenance',
};

export const STATUS_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [v, k])
);

// ============ Normalization Functions ============

/**
 * Normalize WebSocket realtime data to standard format
 */
export function normalizeRealtimeData(wsData: RealtimeUpdateEvent): RealtimeDataPoint & { deviceId: string } {
  const { deviceId, timestamp, Data } = wsData;

  const normalized: RealtimeDataPoint & { deviceId: string } = {
    deviceId,
    time: timestamp,
  };

  // Map MQTT fields to normalized format
  if (Data.OT !== undefined) normalized.oil_temp = Data.OT;
  if (Data.T1 !== undefined) normalized.temp_1 = Data.T1;
  if (Data.T2 !== undefined) normalized.temp_2 = Data.T2;
  if (Data.T3 !== undefined) normalized.temp_3 = Data.T3;
  if (Data.T4 !== undefined) normalized.temp_4 = Data.T4;
  if (Data.T5 !== undefined) normalized.temp_5 = Data.T5;
  if (Data.T6 !== undefined) normalized.temp_6 = Data.T6;
  if (Data.PR !== undefined) normalized.pressure = Data.PR;
  if (Data.ECYCT !== undefined) normalized.cycle_time = Data.ECYCT;
  if (Data.STS !== undefined) normalized.status = STATUS_MAP[Data.STS] || Data.STS;
  if (Data.OPM !== undefined) normalized.op_mode = Data.OPM;

  return normalized;
}

/**
 * Normalize WebSocket SPC data to standard format
 */
export function normalizeSPCData(wsData: SPCUpdateEvent): SPCDataPoint & { deviceId: string } {
  const { deviceId, timestamp, Data } = wsData;

  const normalized: SPCDataPoint & { deviceId: string } = {
    deviceId,
    time: timestamp,
  };

  // Map MQTT fields to normalized format
  if (Data.ECYCT !== undefined) normalized.cycle_time = Data.ECYCT;
  if (Data.SW !== undefined) normalized.shot_weight = Data.SW;
  if (Data.PP !== undefined) normalized.pack_pressure = Data.PP;
  if (Data.CT !== undefined) normalized.cooling_time = Data.CT;
  if (Data.MT !== undefined) normalized.melt_temp = Data.MT;
  if (Data.MDT !== undefined) normalized.mold_temp = Data.MDT;

  return normalized;
}

/**
 * Normalize REST API history data (already in InfluxDB format, just ensure consistency)
 */
export function normalizeHistoryData(data: RealtimeDataPoint[]): RealtimeDataPoint[] {
  return data.map(point => ({
    ...point,
    status: point.status ? (STATUS_MAP[point.status] || point.status) : undefined,
  }));
}

/**
 * Get display label for a field
 */
export function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    oil_temp: 'Oil Temperature',
    temp_1: 'Zone 1 Temp',
    temp_2: 'Zone 2 Temp',
    temp_3: 'Zone 3 Temp',
    temp_4: 'Zone 4 Temp',
    temp_5: 'Zone 5 Temp',
    temp_6: 'Zone 6 Temp',
    pressure: 'Pressure',
    cycle_time: 'Cycle Time',
    status: 'Status',
    op_mode: 'Operation Mode',
    shot_weight: 'Shot Weight',
    pack_pressure: 'Pack Pressure',
    cooling_time: 'Cooling Time',
    melt_temp: 'Melt Temperature',
    mold_temp: 'Mold Temperature',
  };
  return labels[field] || field;
}

/**
 * Get unit for a field
 */
export function getFieldUnit(field: string): string {
  const units: Record<string, string> = {
    oil_temp: '°C',
    temp_1: '°C',
    temp_2: '°C',
    temp_3: '°C',
    temp_4: '°C',
    temp_5: '°C',
    temp_6: '°C',
    pressure: 'bar',
    cycle_time: 's',
    shot_weight: 'g',
    pack_pressure: 'bar',
    cooling_time: 's',
    melt_temp: '°C',
    mold_temp: '°C',
  };
  return units[field] || '';
}

// ============ Type-Safe Status Mapping ============
type MachineStatus = 'running' | 'idle' | 'alarm' | 'offline';
type OpMode = 'manual' | 'semi-auto' | 'auto';

/**
 * Map backend status to frontend MachineState status type
 */
export function mapToMachineStatus(status: string | undefined): MachineStatus {
  if (!status) return 'offline';

  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'running':
    case 'run':
    case 'active':
      return 'running';
    case 'idle':
    case 'standby':
      return 'idle';
    case 'alarm':
    case 'error':
    case 'err':
    case 'fault':
    case 'stopped':
    case 'stop':
      return 'alarm';
    case 'offline':
    case 'disconnected':
    case 'maintenance':
    case 'maint':
      return 'offline';
    default:
      return 'idle';
  }
}

/**
 * Map backend opMode to frontend MachineState opMode type
 */
export function mapToOpMode(opMode: string | undefined): OpMode {
  if (!opMode) return 'manual';

  const normalized = opMode.toLowerCase();
  switch (normalized) {
    case 'auto':
    case 'automatic':
      return 'auto';
    case 'semi-auto':
    case 'semiauto':
    case 'semi':
      return 'semi-auto';
    case 'manual':
    default:
      return 'manual';
  }
}
