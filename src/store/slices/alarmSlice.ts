import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/services/api';
import type { Alarm, AlarmHistoryResponse, AlarmUpdateEvent } from '@/types/api';

interface AlarmsState {
  alarms: Alarm[];
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
}

const initialState: AlarmsState = {
  alarms: [],
  loading: false,
  error: null,
  lastUpdate: null,
};

/**
 * Infer alarm severity from message content
 * Uses keyword matching to determine severity level
 */
function inferSeverity(message: string): 'critical' | 'warning' | 'info' {
  const criticalKeywords = ['error', 'fault', 'failure', 'critical', 'emergency', '安全', '故障'];
  const warningKeywords = ['warning', 'caution', 'high', 'low', '警告'];

  const lowerMessage = message.toLowerCase();

  if (criticalKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'critical';
  }
  if (warningKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'warning';
  }
  return 'info';
}

/**
 * Normalize alarm data from API response to frontend Alarm interface
 */
function normalizeAlarmData(data: AlarmHistoryResponse): Alarm[] {
  return data.data.map(point => ({
    id: point.alarm_id,
    timestamp: point._time,
    deviceId: point.device_id,
    message: point.alarm_message,
    severity: inferSeverity(point.alarm_message),
    status: 'resolved' as const, // Historical alarms are considered resolved
  }));
}

/**
 * Async thunk to fetch alarms for a specific machine
 */
export const fetchAlarms = createAsyncThunk(
  'alarms/fetchAlarms',
  async ({ machineId, timeRange }: { machineId: string | number; timeRange?: string }) => {
    const response = await api.getMachineAlarms(machineId, timeRange);
    return normalizeAlarmData(response);
  }
);

const alarmSlice = createSlice({
  name: 'alarms',
  initialState,
  reducers: {
    /**
     * Add a new alarm from WebSocket update
     */
    addAlarm: (state, action: PayloadAction<AlarmUpdateEvent>) => {
      const newAlarm: Alarm = {
        id: action.payload.alarm.id,
        timestamp: action.payload.alarm.timestamp || action.payload.timestamp,
        deviceId: action.payload.deviceId,
        message: action.payload.alarm.message,
        severity: inferSeverity(action.payload.alarm.message),
        status: 'active',
      };

      // Add to beginning of array and limit to 100
      state.alarms.unshift(newAlarm);
      if (state.alarms.length > 100) {
        state.alarms = state.alarms.slice(0, 100);
      }
      state.lastUpdate = new Date().toISOString();
    },

    /**
     * Mark an alarm as acknowledged
     */
    acknowledgeAlarm: (state, action: PayloadAction<string>) => {
      const alarm = state.alarms.find(a => a.id === action.payload);
      if (alarm && alarm.status === 'active') {
        alarm.status = 'acknowledged';
      }
    },

    /**
     * Clear all alarms
     */
    clearAlarms: (state) => {
      state.alarms = [];
      state.lastUpdate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlarms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlarms.fulfilled, (state, action) => {
        state.loading = false;
        state.alarms = action.payload;
        state.lastUpdate = new Date().toISOString();
      })
      .addCase(fetchAlarms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch alarms';
      });
  },
});

export const { addAlarm, acknowledgeAlarm, clearAlarms } = alarmSlice.actions;
export default alarmSlice.reducer;
