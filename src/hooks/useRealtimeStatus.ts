import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { sseService } from '@/services/sse'
import { setWebSocketStatus } from '@/store/slices/factorySlice'

/**
 * Hook to sync stream connection status to Redux.
 * Components like RealtimeStatusPanel read from Redux to display status.
 */
export function useRealtimeStatus() {
  const dispatch = useDispatch()

  useEffect(() => {
    const unsubscribe = sseService.onStatusChange((status) => {
      const reduxStatus = status === 'reconnecting' ? 'connecting' : status
      dispatch(setWebSocketStatus(reduxStatus))
    })

    const currentStatus = sseService.getConnectionStatus()
    const reduxStatus = currentStatus === 'reconnecting' ? 'connecting' : currentStatus
    dispatch(setWebSocketStatus(reduxStatus))

    return unsubscribe
  }, [dispatch])
}
