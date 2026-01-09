import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { socketService } from '@/services/socket'
import { setWebSocketStatus } from '@/store/slices/factorySlice'

/**
 * Hook to sync WebSocket connection status from socket service to Redux store.
 * This ensures that components reading from Redux (like WebSocketStatusPanel) always
 * have the current connection status.
 *
 * Call this hook in components that need to track or display WebSocket status.
 */
export function useWebSocketStatus() {
  const dispatch = useDispatch()

  useEffect(() => {
    // Subscribe to socket service status changes
    const unsubscribe = socketService.onStatusChange((status) => {
      // Map socket service status to Redux status
      // Socket: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
      // Redux: 'disconnected' | 'connecting' | 'connected' | 'error'
      // We map 'reconnecting' to 'connecting' for UI purposes
      const reduxStatus = status === 'reconnecting' ? 'connecting' : status
      dispatch(setWebSocketStatus(reduxStatus))
    })

    // Initialize with current status on mount
    const currentStatus = socketService.getConnectionStatus()
    const reduxStatus = currentStatus === 'reconnecting' ? 'connecting' : currentStatus
    dispatch(setWebSocketStatus(reduxStatus))

    return unsubscribe
  }, [dispatch])
}
