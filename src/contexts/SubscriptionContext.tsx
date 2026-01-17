import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { useSubscriptionPolling } from '@/hooks/useSubscriptionPolling'
import type { BillingSubscription, BillingPlan, PaymentMethod, BillingDemoInfo } from '@/types/api'

interface SubscriptionContextValue {
  subscription: BillingSubscription | BillingDemoInfo | null
  plans: BillingPlan[]
  paymentMethods: PaymentMethod[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  forceRefresh: () => Promise<void>
  hasActiveSubscription: () => boolean
  canAccess: () => boolean
  getSubscriptionStatus: () => 'active' | 'past_due' | 'canceled' | 'inactive' | 'none'
  getCurrentPlan: () => BillingPlan | null
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<BillingSubscription | BillingDemoInfo | null>(null)
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptionData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [subscriptionData, plansData, paymentMethodsData] = await Promise.all([
        api.getCurrentSubscription(),
        api.getBillingPlans(),
        api.getPaymentMethods().catch(() => []),
      ])

      setSubscription(subscriptionData)
      setPlans(plansData)
      setPaymentMethods(paymentMethodsData)
    } catch (err) {
      console.error('Failed to fetch subscription data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const { forceRefresh } = useSubscriptionPolling({
    enabled: true,
    interval: 120000,
    onRefresh: fetchSubscriptionData,
  })

  const hasActiveSubscription = useCallback(() => {
    if (!subscription || 'isDemo' in subscription) return false
    return ['active', 'trialing'].includes(subscription.status)
  }, [subscription])

  const canAccess = useCallback(() => {
    if (!subscription) return false
    if ('isDemo' in subscription) return false

    const status = subscription.status
    if (status === 'active' || status === 'trialing') return true
    if (status === 'past_due') return true
    if (status === 'canceled') {
      return !subscription.cancelAtPeriodEnd || new Date(subscription.currentPeriodEnd) > new Date()
    }
    return false
  }, [subscription])

  const getSubscriptionStatus = useCallback((): 'active' | 'past_due' | 'canceled' | 'inactive' | 'none' => {
    if (!subscription) return 'none'
    if ('isDemo' in subscription) return 'none'

    const status = subscription.status
    if (status === 'active' || status === 'trialing') return 'active'
    if (status === 'past_due') return 'past_due'
    if (status === 'canceled') return 'canceled'
    return 'inactive'
  }, [subscription])

  const getCurrentPlan = useCallback((): BillingPlan | null => {
    if (!subscription || 'isDemo' in subscription) return null
    return plans.find(p => p.planId === subscription.planId) || null
  }, [subscription, plans])

  const value: SubscriptionContextValue = {
    subscription,
    plans,
    paymentMethods,
    isLoading,
    error,
    refresh: fetchSubscriptionData,
    forceRefresh,
    hasActiveSubscription,
    canAccess,
    getSubscriptionStatus,
    getCurrentPlan,
  }

  useEffect(() => {
    fetchSubscriptionData()
  }, [fetchSubscriptionData])

  useEffect(() => {
    const paymentStatus = new URLSearchParams(window.location.search).get('payment')
    if (paymentStatus === 'success') {
      forceRefresh()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [forceRefresh])

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
