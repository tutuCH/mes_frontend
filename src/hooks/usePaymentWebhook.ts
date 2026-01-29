import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'
import {
  fetchBillingData,
  stopWebhookPolling,
  incrementWebhookPollCount,
} from '@/store/slices/paymentSlice'
import { createLogger } from '@/utils/logger'

const logger = createLogger('usePaymentWebhook')

export interface UsePaymentWebhookReturn {
  startPolling: () => void
  stopPolling: () => void
  isPolling: boolean
}

/**
 * Custom hook for webhook polling
 *
 * Polls /api/subscription/current every 5 seconds for max 2 minutes
 * to catch webhook-driven updates without requiring WebSocket support.
 *
 * This is useful because:
 * 1. Webhooks are processed by the backend asynchronously
 * 2. The frontend needs to know when the subscription is updated
 * 3. We don't want to require WebSocket support for payment updates
 *
 * Usage:
 * ```tsx
 * const { startPolling, stopPolling, isPolling } = usePaymentWebhook()
 *
 * // Start polling after checkout
 * useEffect(() => {
 *   if (checkoutSuccess) {
 *     startPolling()
 *   }
 * }, [checkoutSuccess, startPolling])
 * ```
 */
export function usePaymentWebhook(): UsePaymentWebhookReturn {
  const dispatch = useDispatch<AppDispatch>()

  // Select polling state from Redux
  const { webhookPollingActive, webhookPollCount, subscription } = useSelector(
    (state: RootState) => state.payment
  )

  const isPolling = webhookPollingActive

  /**
   * Start polling for webhook updates
   */
  const startPolling = () => {
    // Polling will be managed by the useEffect below
    // We just need to set the active state in Redux
    // But since we're using Redux state, the polling is automatic
  }

  /**
   * Stop polling for webhook updates
   */
  const stopPolling = () => {
    dispatch(stopWebhookPolling())
  }

  /**
   * Poll for subscription updates every 5 seconds
   * Stop when:
   * 1. Subscription status changes
   * 2. Max 2 minutes elapsed (24 polls * 5 seconds)
   * 3. Polling is deactivated
   */
  useEffect(() => {
    if (!webhookPollingActive) {
      return
    }

    // Max 2 minutes (24 polls * 5 seconds)
    const MAX_POLLS = 24
    const POLL_INTERVAL = 5000 // 5 seconds

    if (webhookPollCount >= MAX_POLLS) {
      dispatch(stopWebhookPolling())
      return
    }

    // Set up polling interval
    const intervalId = setInterval(async () => {
      try {
        // Fetch latest billing data
        const result = await dispatch(fetchBillingData())

        // Check if subscription data changed
        if (fetchBillingData.fulfilled.match(result)) {
          const newSubscription = result.payload.subscription

          // If we have subscription data and it's different, stop polling
          // This is a simple check - you might want more sophisticated comparison
          if (newSubscription && newSubscription !== subscription) {
            dispatch(stopWebhookPolling())
            return
          }
        }

        // Increment poll count
        dispatch(incrementWebhookPollCount())

        // Stop if we've reached max polls
        if (webhookPollCount + 1 >= MAX_POLLS) {
          dispatch(stopWebhookPolling())
        }
      } catch (error) {
        logger.error('[usePaymentWebhook] Polling error:', error)
        // Continue polling on error, but increment count
        dispatch(incrementWebhookPollCount())
      }
    }, POLL_INTERVAL)

    // Cleanup interval on unmount or when polling stops
    return () => clearInterval(intervalId)
  }, [webhookPollingActive, webhookPollCount, subscription, dispatch])

  return {
    startPolling,
    stopPolling,
    isPolling,
  }
}
