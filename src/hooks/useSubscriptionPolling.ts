import { useEffect, useRef, useCallback } from 'react'

interface UseSubscriptionPollingOptions {
  enabled?: boolean
  interval?: number // milliseconds
  onRefresh?: () => Promise<void> | void
}

export function useSubscriptionPolling({
  enabled = true,
  interval = 120000, // 120 seconds in milliseconds
  onRefresh,
}: UseSubscriptionPollingOptions = {}) {
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPollingRef = useRef(false)
  const lastRefreshTimeRef = useRef<number>(0)

  const startPolling = useCallback(() => {
    if (!enabled || isPollingRef.current) return

    isPollingRef.current = true

    const poll = async () => {
      try {
        await onRefresh?.()
        lastRefreshTimeRef.current = Date.now()
      } catch (error) {
        console.error('[Subscription Polling] Error refreshing subscription:', error)
      }
    }

    poll()

    pollingIntervalRef.current = setInterval(() => {
      const now = Date.now()
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current

      if (timeSinceLastRefresh >= interval) {
        poll()
      }
    }, 1000) // Check every second if interval has passed
  }, [enabled, interval, onRefresh])

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      isPollingRef.current = false
    }
  }, [])

  const forceRefresh = useCallback(async () => {
    stopPolling()
    await onRefresh?.()
    lastRefreshTimeRef.current = Date.now()
    startPolling()
  }, [onRefresh, startPolling, stopPolling])

  useEffect(() => {
    if (enabled) {
      startPolling()
    } else {
      stopPolling()
    }

    return () => {
      stopPolling()
    }
  }, [enabled, startPolling, stopPolling])

  return {
    forceRefresh,
    isPolling: isPollingRef.current,
    lastRefreshTime: lastRefreshTimeRef.current,
  }
}
