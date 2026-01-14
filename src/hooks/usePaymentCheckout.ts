import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { type AppDispatch, type RootState } from '@/store'
import {
  createCheckoutSession,
  setCheckoutStatus,
  startWebhookPolling,
} from '@/store/slices/paymentSlice'
import { toast } from 'sonner'
import type { BillingPlan } from '@/types/api'
import {
  buildCheckoutUrls,
  generateIdempotencyKey,
  generateCheckoutMetadata,
  parsePaymentQueryParams,
  cleanPaymentQueryParams,
  getCurrentUserId,
} from '@/utils/paymentUtils'
import { handleStripeError } from '@/utils/stripeErrorHandler'

export type CheckoutStatus = 'idle' | 'redirecting' | 'success' | 'canceled' | 'failed'

export interface UsePaymentCheckoutReturn {
  checkout: (plan: BillingPlan, couponCode?: string) => Promise<void>
  isRedirecting: boolean
  checkoutStatus: CheckoutStatus
  error: string | null
}

/**
 * Custom hook for handling Stripe checkout flow
 * - Creates checkout sessions with idempotency and metadata
 * - Redirects to Stripe Checkout
 * - Processes URL query params after checkout
 * - Triggers webhook polling on success
 */
export function usePaymentCheckout(): UsePaymentCheckoutReturn {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()

  // Select checkout state from Redux
  const { checkoutStatus } = useSelector((state: RootState) => state.payment)

  // Check if currently redirecting
  const isRedirecting = checkoutStatus === 'redirecting'

  // Get error from Redux
  const error = useSelector((state: RootState) => state.payment.error)

  /**
   * Process checkout for a given plan
   */
  const checkout = useCallback(
    async (plan: BillingPlan, couponCode?: string) => {
      try {
        // Generate idempotency key for this checkout attempt
        const idempotencyKey = generateIdempotencyKey()

        // Build checkout URLs
        const { successUrl, cancelUrl } = buildCheckoutUrls()

        // Generate metadata for debugging
        const userId = getCurrentUserId() ?? undefined
        const metadata = generateCheckoutMetadata(plan.planId, userId, {
          couponCode: couponCode || '',
        })

        // Create checkout session
        const result = await dispatch(
          createCheckoutSession({
            planId: plan.planId,
            successUrl,
            cancelUrl,
            idempotencyKey,
            metadata,
          })
        )

        if (createCheckoutSession.fulfilled.match(result)) {
          // Redirect to Stripe Checkout
          if (result.payload.url) {
            window.location.href = result.payload.url
          } else {
            throw new Error('No checkout URL returned')
          }
        } else if (createCheckoutSession.rejected.match(result)) {
          // Handle error
          const stripeError = handleStripeError(result.payload as Error)
          toast.error(stripeError.userMessage, {
            description: stripeError.action === 'retry'
              ? t('common.retry')
              : undefined,
            action: stripeError.action === 'retry'
              ? {
                  label: t('common.retry'),
                  onClick: () => checkout(plan, couponCode),
                }
              : undefined,
          })
        }
      } catch (err) {
        // Handle unexpected errors
        const stripeError = handleStripeError(err)
        dispatch(setCheckoutStatus('failed'))
        toast.error(stripeError.userMessage)
      }
    },
    [dispatch, t]
  )

  /**
   * Process payment return URL params on mount
   */
  useEffect(() => {
    const paymentStatus = parsePaymentQueryParams()

    if (paymentStatus === 'success') {
      // Start webhook polling to catch subscription updates
      dispatch(startWebhookPolling())

      // Show success message
      toast.success(t('settings.payment.checkout.success'))

      // Update checkout status
      dispatch(setCheckoutStatus('success'))

      // Clean URL params
      cleanPaymentQueryParams()
    } else if (paymentStatus === 'canceled') {
      // Show canceled message
      toast.info(t('settings.payment.checkout.canceled'))

      // Update checkout status
      dispatch(setCheckoutStatus('canceled'))

      // Clean URL params
      cleanPaymentQueryParams()
    }
  }, [dispatch, t])

  return {
    checkout,
    isRedirecting,
    checkoutStatus,
    error,
  }
}
