import { useEffect, useCallback, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { type AppDispatch, type RootState } from '@/store'
import { fetchMachines, updateMachineStatus } from '@/store/slices/machineSlice'
import { addSubscribedMachine, removeSubscribedMachine } from '@/store/slices/factorySlice'
import { sseService } from '@/services/sse'
import { normalizeRealtimeData, normalizeSPCData, mapToMachineStatus, mapToOpMode } from '@/utils/fieldMapping'
import { toast } from 'sonner'
import { createLogger } from '@/utils/logger'
import type { RealtimeUpdateEvent, SPCUpdateEvent, MachineStatusEvent, MachineAlertEvent, AlarmUpdateEvent } from '@/types/api'

const logger = createLogger('useRealtimeData')

// Task 6: Gate debug logging to reduce console retention overhead
const DEBUG_REALTIME = import.meta.env.VITE_DEBUG_REALTIME === 'true'

export function useRealtimeData() {
  const dispatch = useDispatch<AppDispatch>()
  const { machines, error } = useSelector((state: RootState) => state.machines)
  const subscribedRef = useRef<Set<string>>(new Set())
  const MAX_AUTO_SUBSCRIPTIONS = 10

  const [connectionStatus, setConnectionStatus] = useState(
    sseService.getConnectionStatus()
  )

  useEffect(() => {
    logger.debug('Fetching machines...')
    dispatch(fetchMachines())
  }, [dispatch])

  // Subscribe to stream status changes
  useEffect(() => {
    const unsubscribe = sseService.onStatusChange((status) => {
      logger.debug('Stream status changed:', status)
      setConnectionStatus(status)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (error) {
      toast.error("Failed to connect to machine network", {
        description: "Please check your connection and try again.",
        action: {
          label: "Retry",
          onClick: () => dispatch(fetchMachines())
        }
      })
    }
  }, [error, dispatch])

  const handleRealtimeUpdate = useCallback((payload: RealtimeUpdateEvent) => {
    // Task 6: Gate per-message logging
    if (DEBUG_REALTIME) {
      logger.debug('Processing realtime-update for', payload.deviceId)
      logger.debug('Raw payload structure:', {
        hasData: !!(payload as any).data,
        hasDataObject: !!payload.Data,
        deviceId: payload.deviceId,
        timestamp: payload.timestamp,
        dataKeys: (payload as any).data ? Object.keys((payload as any).data) : 'none',
        DataKeys: payload.Data ? Object.keys(payload.Data) : 'none'
      })
    }

    // Use field mapping to normalize the data
    const normalized = normalizeRealtimeData(payload)

    if (DEBUG_REALTIME) {
      logger.debug('Normalized data:', {
        deviceId: normalized.deviceId,
        time: normalized.time,
        temp_1: normalized.temp_1,
        oil_temp: normalized.oil_temp,
        status: normalized.status,
        op_mode: normalized.operate_mode
      })
    }

    dispatch(updateMachineStatus({
      deviceId: normalized.deviceId,  // Use deviceId for stream events
      data: {
        temperature: normalized.temp_1,
        oilTemp: normalized.oil_temp,
        status: mapToMachineStatus(normalized.status),
        opMode: mapToOpMode(normalized.operate_mode),
        lastUpdate: normalized.time
      }
    }))
  }, [dispatch])

  const handleSPCUpdate = useCallback((payload: SPCUpdateEvent) => {
    // Use field mapping to normalize the data
    const normalized = normalizeSPCData(payload)

    dispatch(updateMachineStatus({
      deviceId: normalized.deviceId,  // Use deviceId for stream events
      data: {
        cycleTime: normalized.cycle_time,
        // Calculate efficiency based on cycle time vs target (assume 45s target)
        efficiency: normalized.cycle_time
          ? Math.min(100, Math.round((45 / normalized.cycle_time) * 100))
          : undefined,
        lastUpdate: normalized.time
      }
    }))
  }, [dispatch])

  const handleMachineStatus = useCallback((payload: MachineStatusEvent) => {
    dispatch(updateMachineStatus({
      deviceId: payload.deviceId,  // Use deviceId for stream events
      data: {
        status: mapToMachineStatus(payload.status),
        lastUpdate: payload.timestamp
      }
    }))
  }, [dispatch])

  const handleMachineAlert = useCallback((payload: MachineAlertEvent) => {
    if (DEBUG_REALTIME) logger.debug('machine-alert:', payload)
    // Update machine status with alert info
    dispatch(updateMachineStatus({
      deviceId: payload.deviceId,
      data: {
        hasAlert: true,
        alertType: payload.alertType,
        alertMessage: payload.message,
        alertSeverity: payload.alertType,
        lastUpdate: payload.timestamp
      }
    }))
  }, [dispatch])

  const handleAlarmUpdate = useCallback((payload: AlarmUpdateEvent) => {
    if (DEBUG_REALTIME) logger.debug('alarm-update:', payload)
    // Alarm events are handled by useAlarms hook
    // This handler is for logging and potential future integration
  }, [])

  useEffect(() => {
    // Connect stream ONCE when hook mounts
    sseService.connect()
  }, []) // Empty deps - only run once

  // Separate effect for listeners (can re-run if callbacks change)
  useEffect(() => {
    sseService.on('realtime-update', handleRealtimeUpdate)
    sseService.on('spc-update', handleSPCUpdate)
    sseService.on('machine-status', handleMachineStatus)
    sseService.on('machine-alert', handleMachineAlert)
    sseService.on('alarm-update', handleAlarmUpdate)

    return () => {
      sseService.off('realtime-update', handleRealtimeUpdate)
      sseService.off('spc-update', handleSPCUpdate)
      sseService.off('machine-status', handleMachineStatus)
      sseService.off('machine-alert', handleMachineAlert)
      sseService.off('alarm-update', handleAlarmUpdate)
    }
  }, [handleRealtimeUpdate, handleSPCUpdate, handleMachineStatus, handleMachineAlert, handleAlarmUpdate])

  // Subscribe to machines when they are loaded AND socket is connected
  // This effect re-runs when either machines change OR socket becomes connected
  useEffect(() => {
    const machineEntries = Object.entries(machines)
      .map(([id, machine]) => ({
        id,
        deviceId: machine?.deviceId || id
      }))
      .sort((a, b) => a.deviceId.localeCompare(b.deviceId))
    const machineIds = machineEntries.map(entry => entry.id)
    if (DEBUG_REALTIME) logger.debug('Subscribing to machines. Status:', connectionStatus, ', Machines:', machineIds.length)

    // Subscribe to new machines using deviceId (which is the machineName from backend)
    machineEntries.slice(0, MAX_AUTO_SUBSCRIPTIONS).forEach(entry => {
      const deviceId = entry.deviceId
      const id = entry.id

      if (!subscribedRef.current.has(deviceId)) {
        if (DEBUG_REALTIME) logger.debug('Subscribing to new machine:', deviceId, '(ID:', id, ')')
        const didSubscribe = sseService.subscribeToMachine(deviceId)
        if (didSubscribe) {
          subscribedRef.current.add(deviceId)
          dispatch(addSubscribedMachine(deviceId))
        } else if (DEBUG_REALTIME) {
          logger.debug('Subscription skipped (limit reached) for machine:', deviceId)
        }
      }
    })

    // Unsubscribe from removed machines using deviceId
    subscribedRef.current.forEach(deviceId => {
      // Find if this deviceId still exists in the machines object
      const stillExists = Object.values(machines).some(m => m.deviceId === deviceId)
      if (!stillExists) {
        if (DEBUG_REALTIME) logger.debug('Unsubscribing from removed machine:', deviceId)
        sseService.unsubscribeFromMachine(deviceId)
        subscribedRef.current.delete(deviceId)
        dispatch(removeSubscribedMachine(deviceId))
      }
    })

    if (DEBUG_REALTIME) logger.debug('Total subscribed machines:', subscribedRef.current.size)
  }, [machines, connectionStatus, dispatch])

  // Sync existing socket service subscriptions to Redux when socket connects
  // This handles the case where socket might already have subscriptions from a previous session
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const currentlySubscribed = sseService.getSubscribedMachines()
      if (currentlySubscribed.length > 0) {
        if (DEBUG_REALTIME) logger.debug('Syncing existing subscriptions to Redux:', currentlySubscribed)
        currentlySubscribed.forEach(machineName => {
          subscribedRef.current.add(machineName)
          dispatch(addSubscribedMachine(machineName))
        })
      }
    }
  }, [connectionStatus, dispatch])

  // Cleanup on unmount
  // NOTE: We do NOT unsubscribe from machines or disconnect stream here
  // because we want SSE connection to persist globally across the app
  // Subscriptions are managed globally by GlobalSSEManager
  useEffect(() => {
    return () => {
      // NO-OP: Keep subscriptions and connection alive
      // The GlobalSSEManager in App.tsx handles the lifecycle
    }
  }, [])
}

// Hook for subscribing to a single machine
export function useMachineRealtimeData(machineId: string | number) {
  const dispatch = useDispatch<AppDispatch>()
  const machine = useSelector((state: RootState) =>
    state.machines.machines[machineId.toString()]
  )

  const handleRealtimeUpdate = useCallback((payload: RealtimeUpdateEvent) => {
    if (payload.deviceId !== machineId.toString()) return

    const normalized = normalizeRealtimeData(payload)
    dispatch(updateMachineStatus({
      id: normalized.deviceId,
      data: {
        temperature: normalized.temp_1,
        oilTemp: normalized.oil_temp,
        status: mapToMachineStatus(normalized.status),
        opMode: mapToOpMode(normalized.operate_mode),
        lastUpdate: normalized.time
      }
    }))
  }, [dispatch, machineId])

  const handleSPCUpdate = useCallback((payload: SPCUpdateEvent) => {
    if (payload.deviceId !== machineId.toString()) return

    const normalized = normalizeSPCData(payload)
    dispatch(updateMachineStatus({
      id: normalized.deviceId,
      data: {
        cycleTime: normalized.cycle_time,
        efficiency: normalized.cycle_time
          ? Math.min(100, Math.round((45 / normalized.cycle_time) * 100))
          : undefined,
        lastUpdate: normalized.time
      }
    }))
  }, [dispatch, machineId])

  useEffect(() => {
    sseService.connect()
    sseService.subscribeToMachine(machineId.toString())

    sseService.on('realtime-update', handleRealtimeUpdate)
    sseService.on('spc-update', handleSPCUpdate)

    return () => {
      sseService.off('realtime-update', handleRealtimeUpdate)
      sseService.off('spc-update', handleSPCUpdate)
      sseService.unsubscribeFromMachine(machineId.toString())
    }
  }, [machineId, handleRealtimeUpdate, handleSPCUpdate])

  return machine
}
