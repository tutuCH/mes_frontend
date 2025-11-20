import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { type AppDispatch, type RootState } from '@/store'
import { fetchMachines, updateMachineStatus } from '@/store/slices/machineSlice'
import { socketService } from '@/services/socket'
import { toast } from 'sonner'

export function useRealtimeData() {
  const dispatch = useDispatch<AppDispatch>()
  const { machines, error } = useSelector((state: RootState) => state.machines)

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

  useEffect(() => {
    // Connect socket
    socketService.connect()

    // Subscribe to all machines
    Object.keys(machines).forEach(id => {
      socketService.subscribeToMachine(id)
    })

    // Listen for updates
    const handleRealtimeUpdate = (payload: any) => {
      const { deviceId, data } = payload
      // Map backend data to frontend state
      dispatch(updateMachineStatus({
        id: deviceId, // Assuming deviceId matches machineId
        data: {
          temperature: data.Data.T1,
          status: data.Data.STS === 2 ? 'running' : data.Data.STS === 3 ? 'alarm' : 'idle',
          lastUpdate: new Date().toISOString()
        }
      }))
    }

    const handleSPCUpdate = (payload: any) => {
      const { deviceId, data } = payload
      dispatch(updateMachineStatus({
        id: deviceId,
        data: {
          cycleTime: parseFloat(data.Data.ECYCT),
          // Calculate efficiency roughly based on cycle time vs target (mock target 45s)
          efficiency: Math.min(100, (45 / parseFloat(data.Data.ECYCT)) * 100)
        }
      }))
    }

    socketService.on('realtime-update', handleRealtimeUpdate)
    socketService.on('spc-update', handleSPCUpdate)

    return () => {
      socketService.off('realtime-update', handleRealtimeUpdate)
      socketService.off('spc-update', handleSPCUpdate)
      socketService.disconnect()
    }
  }, [machines, dispatch])
}
