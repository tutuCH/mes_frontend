import { useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { type AppDispatch, type RootState } from '@/store'
import { fetchMachines, updateMachineStatus } from '@/store/slices/machineSlice'
import { socketService } from '@/services/socket'
import { normalizeRealtimeData, normalizeSPCData, mapToMachineStatus, mapToOpMode } from '@/utils/fieldMapping'
import { toast } from 'sonner'
import type { RealtimeUpdateEvent, SPCUpdateEvent, MachineStatusEvent } from '@/types/api'

export function useRealtimeData() {
  const dispatch = useDispatch<AppDispatch>()
  const { machines, error } = useSelector((state: RootState) => state.machines)
  const subscribedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    dispatch(fetchMachines())
  }, [dispatch])

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
    // Use field mapping to normalize the data
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
  }, [dispatch])

  const handleSPCUpdate = useCallback((payload: SPCUpdateEvent) => {
    // Use field mapping to normalize the data
    const normalized = normalizeSPCData(payload)

    dispatch(updateMachineStatus({
      id: normalized.deviceId,
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
      id: payload.deviceId,
      data: {
        status: mapToMachineStatus(payload.status),
        lastUpdate: payload.timestamp
      }
    }))
  }, [dispatch])

  useEffect(() => {
    // Connect socket
    socketService.connect()

    // Listen for updates
    socketService.on('realtime-update', handleRealtimeUpdate)
    socketService.on('spc-update', handleSPCUpdate)
    socketService.on('machine-status', handleMachineStatus)

    return () => {
      socketService.off('realtime-update', handleRealtimeUpdate)
      socketService.off('spc-update', handleSPCUpdate)
      socketService.off('machine-status', handleMachineStatus)
    }
  }, [handleRealtimeUpdate, handleSPCUpdate, handleMachineStatus])

  // Subscribe to machines when they are loaded
  useEffect(() => {
    const machineIds = Object.keys(machines)

    // Subscribe to new machines
    machineIds.forEach(id => {
      if (!subscribedRef.current.has(id)) {
        socketService.subscribeToMachine(id)
        subscribedRef.current.add(id)
      }
    })

    // Unsubscribe from removed machines
    subscribedRef.current.forEach(id => {
      if (!machines[id]) {
        socketService.unsubscribeFromMachine(id)
        subscribedRef.current.delete(id)
      }
    })
  }, [machines])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscribedRef.current.forEach(id => {
        socketService.unsubscribeFromMachine(id)
      })
      subscribedRef.current.clear()
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
