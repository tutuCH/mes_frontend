import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch, type RootState } from '@/store';
import { fetchAlarms, addAlarm } from '@/store/slices/alarmSlice';
import { sseService } from '@/services/sse';
import type { AlarmUpdateEvent } from '@/types/api';

interface UseAlarmsOptions {
  machineId?: string | number;
  timeRange?: string;
  enableWebSocket?: boolean;
}

/**
 * Hook for fetching and managing alarm data
 * @param options - Configuration options
 * @returns Alarm state and utilities
 */
export function useAlarms(options: UseAlarmsOptions = {}) {
  const { machineId, timeRange = '-24h', enableWebSocket = true } = options;

  const dispatch = useDispatch<AppDispatch>();
  const { alarms, loading, error, lastUpdate } = useSelector(
    (state: RootState) => state.alarms
  );

  // Fetch historical alarms on mount or when machineId/timeRange changes
  useEffect(() => {
    if (machineId) {
      dispatch(fetchAlarms({ machineId, timeRange }));
    }
  }, [dispatch, machineId, timeRange]);

  // Handle real-time alarm updates from the stream
  const handleAlarmUpdate = useCallback((payload: AlarmUpdateEvent) => {
    // Filter by machine if specified
    if (!machineId || payload.deviceId === machineId.toString()) {
      dispatch(addAlarm(payload));
    }
  }, [dispatch, machineId]);

  // Subscribe to stream alarm updates
  useEffect(() => {
    if (enableWebSocket) {
      sseService.connect();
      sseService.on('alarm-update', handleAlarmUpdate);

      return () => {
        sseService.off('alarm-update', handleAlarmUpdate);
      };
    }
  }, [handleAlarmUpdate, enableWebSocket]);

  return {
    alarms,
    loading,
    error,
    lastUpdate,
  };
}
