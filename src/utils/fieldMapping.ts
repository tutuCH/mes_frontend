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
  'T7': 'temp_7',      // Added: Temperature Zone 7
  'T8': 'temp_8',
  'T9': 'temp_9',
  'T10': 'temp_10',
  'PR': 'pressure',
  'ASTS': 'auto_start', // Added: Auto Start flag
  'STS': 'status',
  'OPM': 'operate_mode', // Fixed: was 'op_mode'
  'ECYCT': 'cycle_time',
};

// Status code mapping (backend sends numeric codes)
export const STATUS_CODE_MAP: Record<number, string> = {
  0: 'stopped',
  1: 'idle',
  2: 'running',
  3: 'error',
  4: 'maintenance',
};

// Operation mode code mapping (backend sends numeric codes)
export const OP_MODE_MAP: Record<number, string> = {
  1: 'manual',
  2: 'semi-auto',
  3: 'auto',
};

// Reverse mapping: InfluxDB -> MQTT
export const REALTIME_FIELD_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(REALTIME_FIELD_MAP).map(([k, v]) => [v, k])
);

// ============ SPC Data Field Mapping ============
// MQTT (WebSocket) -> InfluxDB (REST)
export const SPC_FIELD_MAP: Record<string, string> = {
  // Required fields (always present)
  'CYCN': 'cycle_number',
  'ECYCT': 'cycle_time',
  'EIVM': 'injection_velocity_max',
  'EIPM': 'injection_pressure_max',
  'ESIPT': 'switch_pack_time',
  'ET1': 'temp_1',
  'ET2': 'temp_2',
  'ET3': 'temp_3',

  // Optional InfluxDB fields
  'ESIPP': 'switch_pack_pressure',
  'ESIPS': 'switch_pack_position',
  'EIPT': 'injection_time',
  'EPLST': 'plasticizing_time',
  'EPLSPM': 'plasticizing_pressure_max',
  'ET4': 'temp_4',
  'ET5': 'temp_5',
  'ET6': 'temp_6',
  'ET7': 'temp_7',
  'ET8': 'temp_8',
  'ET9': 'temp_9',
  'ET10': 'temp_10',

  // WebSocket-only fields (not stored in InfluxDB)
  'EIPSE': 'end_injection_position_speed',
  'EFCHT': 'fast_cooling_hold_time',
  'EIPSMIN': 'injection_speed_min',
  'EOT': 'oil_temperature_spc',
  'EMOS': 'motor_speed',
  'EISS': 'injection_speed',
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
 * Handles both MQTT format (nested Data object) and InfluxDB format (flat structure)
 */
export function normalizeRealtimeData(wsData: RealtimeUpdateEvent): RealtimeDataPoint & { deviceId: string } {
  const { deviceId, timestamp } = wsData;
  const mqttData: NonNullable<RealtimeUpdateEvent['Data']> = wsData.Data ?? {};

  const normalized: RealtimeDataPoint & { deviceId: string } = {
    deviceId,
    time: timestamp,
  };

  // Check if data is in InfluxDB format (fields at root level, e.g., from wsData.data)
  // or MQTT format (nested in Data object)
  const influxData = (wsData as any).data;

  if (influxData) {
    // InfluxDB format - fields are already normalized (oil_temp, temp_1, etc.)
    if (influxData.oil_temp !== undefined) normalized.oil_temp = influxData.oil_temp;
    if (influxData.temp_1 !== undefined) normalized.temp_1 = influxData.temp_1;
    if (influxData.temp_2 !== undefined) normalized.temp_2 = influxData.temp_2;
    if (influxData.temp_3 !== undefined) normalized.temp_3 = influxData.temp_3;
    if (influxData.temp_4 !== undefined) normalized.temp_4 = influxData.temp_4;
    if (influxData.temp_5 !== undefined) normalized.temp_5 = influxData.temp_5;
    if (influxData.temp_6 !== undefined) normalized.temp_6 = influxData.temp_6;
    if (influxData.temp_7 !== undefined) normalized.temp_7 = influxData.temp_7;
    if (influxData.temp_8 !== undefined) normalized.temp_8 = influxData.temp_8;
    if (influxData.temp_9 !== undefined) normalized.temp_9 = influxData.temp_9;
    if (influxData.temp_10 !== undefined) normalized.temp_10 = influxData.temp_10;
    if (influxData.pressure !== undefined) normalized.pressure = influxData.pressure;
    if (influxData.cycle_time !== undefined) normalized.cycle_time = influxData.cycle_time;
    if (influxData.auto_start !== undefined) normalized.auto_start = influxData.auto_start;
    if (influxData.status !== undefined) normalized.status = influxData.status;
    if (influxData.operate_mode !== undefined) normalized.operate_mode = influxData.operate_mode;
  } else {
    // MQTT format - map MQTT field names to normalized format
    if (mqttData.OT !== undefined) normalized.oil_temp = mqttData.OT;
    if (mqttData.T1 !== undefined) normalized.temp_1 = mqttData.T1;
    if (mqttData.T2 !== undefined) normalized.temp_2 = mqttData.T2;
    if (mqttData.T3 !== undefined) normalized.temp_3 = mqttData.T3;
    if (mqttData.T4 !== undefined) normalized.temp_4 = mqttData.T4;
    if (mqttData.T5 !== undefined) normalized.temp_5 = mqttData.T5;
    if (mqttData.T6 !== undefined) normalized.temp_6 = mqttData.T6;
    if (mqttData.T7 !== undefined) normalized.temp_7 = mqttData.T7;
    if (mqttData.T8 !== undefined) normalized.temp_8 = mqttData.T8;
    if (mqttData.T9 !== undefined) normalized.temp_9 = mqttData.T9;
    if (mqttData.T10 !== undefined) normalized.temp_10 = mqttData.T10;
    if (mqttData.PR !== undefined) normalized.pressure = mqttData.PR;
    if (mqttData.ECYCT !== undefined) normalized.cycle_time = mqttData.ECYCT;
    if (mqttData.ASTS !== undefined) normalized.auto_start = mqttData.ASTS;
    if (mqttData.STS !== undefined) normalized.status = mqttData.STS;
    if (mqttData.OPM !== undefined) normalized.operate_mode = mqttData.OPM;
  }

  return normalized;
}

/**
 * Normalize WebSocket SPC data to standard format
 * NOTE: SPC data comes as strings in WebSocket, must be parsed to numbers
 * Handles both MQTT format (nested Data object) and InfluxDB format (flat structure)
 */
export function normalizeSPCData(wsData: SPCUpdateEvent): SPCDataPoint & { deviceId: string } {
  const { deviceId, timestamp } = wsData;
  const mqttData = wsData.Data;

  const normalized: SPCDataPoint & { deviceId: string } = {
    deviceId,
    time: timestamp,
  };

  // Check if data is in InfluxDB format (fields at root level)
  const influxData = (wsData as any).data;

  if (influxData) {
    // InfluxDB format - fields are already normalized (cycle_time, temp_1, etc.)
    // Parse and map required fields (already numbers in InfluxDB format)
    if (influxData.cycle_number !== undefined) normalized.cycle_number = influxData.cycle_number;
    if (influxData.cycle_time !== undefined) normalized.cycle_time = influxData.cycle_time;
    if (influxData.injection_velocity_max !== undefined) normalized.injection_velocity_max = influxData.injection_velocity_max;
    if (influxData.injection_pressure_max !== undefined) normalized.injection_pressure_max = influxData.injection_pressure_max;
    if (influxData.switch_pack_time !== undefined) normalized.switch_pack_time = influxData.switch_pack_time;
    if (influxData.temp_1 !== undefined) normalized.temp_1 = influxData.temp_1;
    if (influxData.temp_2 !== undefined) normalized.temp_2 = influxData.temp_2;
    if (influxData.temp_3 !== undefined) normalized.temp_3 = influxData.temp_3;

    // Parse and map optional InfluxDB fields
    if (influxData.switch_pack_pressure !== undefined) normalized.switch_pack_pressure = influxData.switch_pack_pressure;
    if (influxData.switch_pack_position !== undefined) normalized.switch_pack_position = influxData.switch_pack_position;
    if (influxData.injection_time !== undefined) normalized.injection_time = influxData.injection_time;
    if (influxData.plasticizing_time !== undefined) normalized.plasticizing_time = influxData.plasticizing_time;
    if (influxData.plasticizing_pressure_max !== undefined) normalized.plasticizing_pressure_max = influxData.plasticizing_pressure_max;
    if (influxData.temp_4 !== undefined) normalized.temp_4 = influxData.temp_4;
    if (influxData.temp_5 !== undefined) normalized.temp_5 = influxData.temp_5;
    if (influxData.temp_6 !== undefined) normalized.temp_6 = influxData.temp_6;
    if (influxData.temp_7 !== undefined) normalized.temp_7 = influxData.temp_7;
    if (influxData.temp_8 !== undefined) normalized.temp_8 = influxData.temp_8;
    if (influxData.temp_9 !== undefined) normalized.temp_9 = influxData.temp_9;
    if (influxData.temp_10 !== undefined) normalized.temp_10 = influxData.temp_10;
  } else if (mqttData) {
    // MQTT format - map MQTT field names and parse strings to numbers
    if (mqttData.CYCN !== undefined) normalized.cycle_number = parseFloat(mqttData.CYCN);
    if (mqttData.ECYCT !== undefined) normalized.cycle_time = parseFloat(mqttData.ECYCT);
    if (mqttData.EIVM !== undefined) normalized.injection_velocity_max = parseFloat(mqttData.EIVM);
    if (mqttData.EIPM !== undefined) normalized.injection_pressure_max = parseFloat(mqttData.EIPM);
    if (mqttData.ESIPT !== undefined) normalized.switch_pack_time = parseFloat(mqttData.ESIPT);
    if (mqttData.ET1 !== undefined) normalized.temp_1 = parseFloat(mqttData.ET1);
    if (mqttData.ET2 !== undefined) normalized.temp_2 = parseFloat(mqttData.ET2);
    if (mqttData.ET3 !== undefined) normalized.temp_3 = parseFloat(mqttData.ET3);

    // Parse and map optional InfluxDB fields
    if (mqttData.ESIPP !== undefined) normalized.switch_pack_pressure = parseFloat(mqttData.ESIPP);
    if (mqttData.ESIPS !== undefined) normalized.switch_pack_position = parseFloat(mqttData.ESIPS);
    if (mqttData.EIPT !== undefined) normalized.injection_time = parseFloat(mqttData.EIPT);
    if (mqttData.EPLST !== undefined) normalized.plasticizing_time = parseFloat(mqttData.EPLST);
    if (mqttData.EPLSPM !== undefined) normalized.plasticizing_pressure_max = parseFloat(mqttData.EPLSPM);
    if (mqttData.ET4 !== undefined) normalized.temp_4 = parseFloat(mqttData.ET4);
    if (mqttData.ET5 !== undefined) normalized.temp_5 = parseFloat(mqttData.ET5);
    if (mqttData.ET6 !== undefined) normalized.temp_6 = parseFloat(mqttData.ET6);
    if (mqttData.ET7 !== undefined) normalized.temp_7 = parseFloat(mqttData.ET7);
    if (mqttData.ET8 !== undefined) normalized.temp_8 = parseFloat(mqttData.ET8);
    if (mqttData.ET9 !== undefined) normalized.temp_9 = parseFloat(mqttData.ET9);
    if (mqttData.ET10 !== undefined) normalized.temp_10 = parseFloat(mqttData.ET10);
  }

  return normalized;
}

/**
 * Normalize REST API history data (already in InfluxDB format, just ensure consistency)
 */
export function normalizeHistoryData(data: RealtimeDataPoint[]): RealtimeDataPoint[] {
  return data.map(point => ({
    ...point,
    status: point.status !== undefined && point.status !== null
      ? (STATUS_MAP[String(point.status)] || point.status)
      : undefined,
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
    temp_7: 'Zone 7 Temp',
    pressure: 'Pressure',
    cycle_time: 'Cycle Time',
    status: 'Status',
    operate_mode: 'Operation Mode',
    auto_start: 'Auto Start',
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
    temp_7: '°C',
    pressure: 'bar',
    cycle_time: 's',
  };
  return units[field] || '';
}

/**
 * Get display label for SPC fields (all 50+ fields)
 */
export function getSPCFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    // Required fields
    cycle_number: 'Cycle Number',
    cycle_time: 'Cycle Time',
    injection_velocity_max: 'Injection Velocity Max',
    injection_pressure_max: 'Injection Pressure Max',
    switch_pack_time: 'Switch Pack Time',

    // Optional InfluxDB fields
    switch_pack_pressure: 'Switch Pack Pressure',
    switch_pack_position: 'Switch Pack Position',
    injection_time: 'Injection Time',
    plasticizing_time: 'Plasticizing Time',
    plasticizing_pressure_max: 'Plasticizing Pressure Max',

    // Temperature zones 1-10
    temp_1: 'Zone 1 Temp',
    temp_2: 'Zone 2 Temp',
    temp_3: 'Zone 3 Temp',
    temp_4: 'Zone 4 Temp',
    temp_5: 'Zone 5 Temp',
    temp_6: 'Zone 6 Temp',
    temp_7: 'Zone 7 Temp',
    temp_8: 'Zone 8 Temp',
    temp_9: 'Zone 9 Temp',
    temp_10: 'Zone 10 Temp',

    // WebSocket-only fields (if needed for display)
    end_injection_position_speed: 'End Injection Position Speed',
    fast_cooling_hold_time: 'Fast Cooling Hold Time',
    injection_speed_min: 'Injection Speed Min',
    oil_temperature_spc: 'Oil Temperature',
    motor_speed: 'Motor Speed',
    injection_speed: 'Injection Speed',
  };
  return labels[field] || field;
}

/**
 * Get unit for SPC fields (all 50+ fields)
 */
export function getSPCFieldUnit(field: string): string {
  const units: Record<string, string> = {
    // Counts (no unit)
    cycle_number: '',

    // Time fields (seconds)
    cycle_time: 's',
    switch_pack_time: 's',
    injection_time: 's',
    plasticizing_time: 's',
    fast_cooling_hold_time: 's',

    // Velocity fields (mm/s)
    injection_velocity_max: 'mm/s',
    injection_speed: 'mm/s',
    injection_speed_min: 'mm/s',
    end_injection_position_speed: 'mm/s',

    // Pressure fields (bar)
    injection_pressure_max: 'bar',
    switch_pack_pressure: 'bar',
    plasticizing_pressure_max: 'bar',

    // Position fields (mm)
    switch_pack_position: 'mm',

    // Temperature zones (°C)
    temp_1: '°C',
    temp_2: '°C',
    temp_3: '°C',
    temp_4: '°C',
    temp_5: '°C',
    temp_6: '°C',
    temp_7: '°C',
    temp_8: '°C',
    temp_9: '°C',
    temp_10: '°C',
    oil_temperature_spc: '°C',

    // Motor speed (RPM)
    motor_speed: 'RPM',
  };
  return units[field] || '';
}

// ============ Type-Safe Status Mapping ============
type MachineStatus = 'running' | 'idle' | 'alarm' | 'offline';
type OpMode = 'manual' | 'semi-auto' | 'auto';

/**
 * Map backend status to frontend MachineState status type
 * Accepts both numeric codes (from WebSocket) and string values
 */
export function mapToMachineStatus(status: string | number | undefined): MachineStatus {
  if (status === undefined || status === null) return 'offline';

  // Handle numeric status codes from backend (0-4)
  if (typeof status === 'number') {
    const mapped = STATUS_CODE_MAP[status];
    if (mapped === 'running') return 'running';
    if (mapped === 'idle') return 'idle';
    if (mapped === 'stopped' || mapped === 'error') return 'alarm';
    if (mapped === 'maintenance') return 'offline';
    return 'idle';  // Default for unknown numeric codes
  }

  // Handle string status values
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
 * Accepts both numeric codes (from WebSocket) and string values
 */
export function mapToOpMode(opMode: string | number | undefined): OpMode {
  if (opMode === undefined || opMode === null) return 'manual';

  // Handle numeric operation mode codes from backend (1-3)
  if (typeof opMode === 'number') {
    const mapped = OP_MODE_MAP[opMode];
    return (mapped as OpMode) || 'manual';  // Default for unknown numeric codes
  }

  // Handle string opMode values
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
