import { useEffect, useCallback, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { type AppDispatch, type RootState } from '@/store'
import { fetchMachines, updateMachineStatus } from '@/store/slices/machineSlice'
import { addSubscribedMachine, removeSubscribedMachine } from '@/store/slices/factorySlice'
import { socketService } from '@/services/socket'
import { normalizeRealtimeData, normalizeSPCData, mapToMachineStatus, mapToOpMode } from '@/utils/fieldMapping'
import { toast } from 'sonner'
import { createLogger } from '@/utils/logger'
import type { RealtimeUpdateEvent, SPCUpdateEvent, MachineStatusEvent, MachineAlertEvent, AlarmUpdateEvent } from '@/types/api'

const logger = createLogger('useRealtimeData')

export function useRealtimeData() {
  const dispatch = useDispatch<AppDispatch>()
  const { machines, error } = useSelector((state: RootState) => state.machines)
  const subscribedRef = useRef<Set<string>>(new Set())

  // Track socket connection status to trigger subscription when connected
  const [isSocketConnected, setIsSocketConnected] = useState(
    socketService.getConnectionStatus() === 'connected'
  )

  useEffect(() => {
    logger.debug('Fetching machines...')
    dispatch(fetchMachines())
  }, [dispatch])

  // Subscribe to socket status changes to trigger subscription when connected
  useEffect(() => {
    const unsubscribe = socketService.onStatusChange((status) => {
      const connected = status === 'connected'
      logger.debug('Socket status changed:', status, '→ isConnected:', connected)
      setIsSocketConnected(connected)
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
    logger.debug('Processing realtime-update for', payload.deviceId)
    logger.debug('Raw payload structure:', {
      hasData: !!(payload as any).data,
      hasDataObject: !!payload.Data,
      deviceId: payload.deviceId,
      timestamp: payload.timestamp,
      dataKeys: (payload as any).data ? Object.keys((payload as any).data) : 'none',
      DataKeys: payload.Data ? Object.keys(payload.Data) : 'none'
    })

    // Use field mapping to normalize the data
    const normalized = normalizeRealtimeData(payload)

    logger.debug('Normalized data:', {
      deviceId: normalized.deviceId,
      time: normalized.time,
      temp_1: normalized.temp_1,
      oil_temp: normalized.oil_temp,
      status: normalized.status,
      op_mode: normalized.operate_mode
    })

    dispatch(updateMachineStatus({
      deviceId: normalized.deviceId,  // Use deviceId for WebSocket events
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
      deviceId: normalized.deviceId,  // Use deviceId for WebSocket events
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
      deviceId: payload.deviceId,  // Use deviceId for WebSocket events
      data: {
        status: mapToMachineStatus(payload.status),
        lastUpdate: payload.timestamp
      }
    }))
  }, [dispatch])

  const handleMachineAlert = useCallback((payload: MachineAlertEvent) => {
    logger.debug('machine-alert:', payload)
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
    logger.debug('alarm-update:', payload)
    // Alarm events are handled by useAlarms hook
    // This handler is for logging and potential future integration
  }, [])

  useEffect(() => {
    // Connect socket ONCE when hook mounts
    socketService.connect()
  }, []) // Empty deps - only run once

  // Separate effect for listeners (can re-run if callbacks change)
  useEffect(() => {
    socketService.on('realtime-update', handleRealtimeUpdate)
    socketService.on('spc-update', handleSPCUpdate)
    socketService.on('machine-status', handleMachineStatus)
    socketService.on('machine-alert', handleMachineAlert)
    socketService.on('alarm-update', handleAlarmUpdate)

    return () => {
      socketService.off('realtime-update', handleRealtimeUpdate)
      socketService.off('spc-update', handleSPCUpdate)
      socketService.off('machine-status', handleMachineStatus)
      socketService.off('machine-alert', handleMachineAlert)
      socketService.off('alarm-update', handleAlarmUpdate)
    }
  }, [handleRealtimeUpdate, handleSPCUpdate, handleMachineStatus, handleMachineAlert, handleAlarmUpdate])

  // Subscribe to machines when they are loaded AND socket is connected
  // This effect re-runs when either machines change OR socket becomes connected
  useEffect(() => {
    // Only subscribe if socket is connected
    if (!isSocketConnected) {
      logger.debug('Socket not connected, skipping subscriptions')
      return
    }

    const machineIds = Object.keys(machines)
    logger.debug('Subscribing to machines. Socket connected:', isSocketConnected, ', Machines:', machineIds.length)

    // Subscribe to new machines using deviceId (which is the machineName from backend)
    machineIds.forEach(id => {
      const machine = machines[id]
      const deviceId = machine?.deviceId || id

      if (!subscribedRef.current.has(deviceId)) {
        logger.debug('Subscribing to new machine:', deviceId, '(ID:', id, ')')
        socketService.subscribeToMachine(deviceId)
        subscribedRef.current.add(deviceId)
        dispatch(addSubscribedMachine(deviceId))
      }
    })

    // Unsubscribe from removed machines using deviceId
    subscribedRef.current.forEach(deviceId => {
      // Find if this deviceId still exists in the machines object
      const stillExists = Object.values(machines).some(m => m.deviceId === deviceId)
      if (!stillExists) {
        logger.debug('Unsubscribing from removed machine:', deviceId)
        socketService.unsubscribeFromMachine(deviceId)
        subscribedRef.current.delete(deviceId)
        dispatch(removeSubscribedMachine(deviceId))
      }
    })

    logger.debug('Total subscribed machines:', subscribedRef.current.size)
  }, [machines, isSocketConnected, dispatch])

  // Sync existing socket service subscriptions to Redux when socket connects
  // This handles the case where socket might already have subscriptions from a previous session
  useEffect(() => {
    if (isSocketConnected) {
      const currentlySubscribed = socketService.getSubscribedMachines()
      if (currentlySubscribed.length > 0) {
        logger.debug('Syncing existing subscriptions to Redux:', currentlySubscribed)
        currentlySubscribed.forEach(machineName => {
          subscribedRef.current.add(machineName)
          dispatch(addSubscribedMachine(machineName))
        })
      }
    }
  }, [isSocketConnected, dispatch])

  // Cleanup on unmount
  // NOTE: We do NOT unsubscribe from machines or disconnect socket here
  // because we want WebSocket connection to persist globally across the app
  // Subscriptions are managed globally by GlobalWebSocketManager
  useEffect(() => {
    return () => {
      // NO-OP: Keep subscriptions and connection alive
      // The GlobalWebSocketManager in App.tsx handles the lifecycle
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
        opMode: mapToOpMode(normalized.op_mode),
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
    socketService.connect()
    socketService.subscribeToMachine(machineId.toString())

    socketService.on('realtime-update', handleRealtimeUpdate)
    socketService.on('spc-update', handleSPCUpdate)

    return () => {
      socketService.off('realtime-update', handleRealtimeUpdate)
      socketService.off('spc-update', handleSPCUpdate)
      socketService.unsubscribeFromMachine(machineId.toString())
    }
  }, [machineId, handleRealtimeUpdate, handleSPCUpdate])

  return machine
}
