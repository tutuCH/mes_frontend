import { useEffect, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'
import { fetchBillingData } from '@/store/slices/paymentSlice'
import type { BillingPlan } from '@/types/api'
import { isInTrial, daysUntil } from '@/utils/paymentUtils'

export interface UsePaymentStateReturn {
  // Data
  subscription: import('@/store/slices/paymentSlice').BillingSubscription | import('@/store/slices/paymentSlice').BillingDemoInfo | null
  plans: BillingPlan[]
  paymentMethods: import('@/types/api').PaymentMethod[]
  invoices: import('@/store/slices/paymentSlice').Invoice[]
  usage: import('@/store/slices/paymentSlice').UsageMetrics | null

  // UI State
  loading: boolean
  error: string | null
  isDemoMode: boolean

  // Computed values
  currentPlan: BillingPlan | null
  isInTrialPeriod: boolean
  daysUntilTrialEnd: number | null
  daysUntilPeriodEnd: number | null

  // Actions
  refetch: () => void
}

/**
 * Custom hook for accessing payment state from Redux
 * Provides memoized computed values and refetch functionality
 */
export function usePaymentState(): UsePaymentStateReturn {
  const dispatch = useDispatch<AppDispatch>()

  // Select payment state from Redux
  const {
    subscription,
    plans,
    paymentMethods,
    invoices,
    usage,
    loading,
    error,
  } = useSelector((state: RootState) => state.payment)

  // Fetch billing data on mount
  useEffect(() => {
    dispatch(fetchBillingData())
  }, [dispatch])

  // Refetch function
  const refetch = useCallback(() => {
    dispatch(fetchBillingData())
  }, [dispatch])

  // Check if in demo mode
  const isDemoMode = useMemo(() => {
    return subscription !== null && 'isDemo' in subscription
  }, [subscription])

  // Get current plan
  const currentPlan = useMemo(() => {
    if (!subscription || isDemoMode) return null
    return plans.find((p) => p.planId === subscription.planId) || null
  }, [subscription, plans, isDemoMode])

  // Check if in trial period
  const isInTrialPeriod = useMemo(() => {
    if (!subscription || isDemoMode) return false
    return isInTrial(subscription)
  }, [subscription, isDemoMode])

  // Days until trial ends
  const daysUntilTrialEnd = useMemo(() => {
    if (!subscription || isDemoMode || !subscription.trialEnd) return null
    return daysUntil(subscription.trialEnd)
  }, [subscription, isDemoMode])

  // Days until period ends
  const daysUntilPeriodEnd = useMemo(() => {
    if (!subscription || isDemoMode || !subscription.currentPeriodEnd) return null
    return daysUntil(subscription.currentPeriodEnd)
  }, [subscription, isDemoMode])

  return {
    // Data
    subscription,
    plans,
    paymentMethods,
    invoices,
    usage,

    // UI State
    loading,
    error,
    isDemoMode,

    // Computed values
    currentPlan,
    isInTrialPeriod,
    daysUntilTrialEnd,
    daysUntilPeriodEnd,

    // Actions
    refetch,
  }
}
