import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Lock, Sparkles, ArrowRight, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Navigate } from 'react-router-dom'

const curatedFeatures = [
  'settings.payment.features.realtimeMonitoring',
  'settings.payment.features.spcAnalytics',
  'settings.payment.features.unlimitedMachines',
  'settings.payment.features.advancedAlarm',
  'settings.payment.features.historicalData',
  'settings.payment.features.apiAccess',
  'settings.payment.features.prioritySupport',
]

export default function SubscriptionRequired() {
  const { t } = useTranslation()
  const { plans, getCurrentPlan, canAccess, subscription, isLoading } = useSubscription()
  const { logout } = useAuth()
  const currentPlan = getCurrentPlan()
  const isSinglePlan = plans.length === 1
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  // Redirect to home if user already has active subscription
  useEffect(() => {
    if (!isLoading && canAccess()) {
      setShouldRedirect(true)
    }
  }, [isLoading, canAccess])

  if (shouldRedirect) {
    return <Navigate to="/" replace />
  }

  const handleSelectPlan = async (planId: string) => {
    if (isRedirecting) return
    setIsRedirecting(true)
    try {
      if (!planId) {
        throw new Error('No plan ID available')
      }

      const session = await api.createCheckoutSession({
        lookupKey: planId,
        successUrl: `${window.location.origin}/settings?payment=success`,
        cancelUrl: `${window.location.origin}/settings?payment=canceled`,
      })

      if (!session?.url) {
        throw new Error('No checkout URL returned')
      }

      window.location.href = session.url
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      toast.error(t('settings.payment.checkoutFailed'))
      setIsRedirecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3 text-slate-700">
            <Lock className="h-6 w-6 text-violet-600" />
            <span className="text-sm font-medium">{t('settings.payment.subscriptionRequired.title')}</span>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            {t('auth.signOut')}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6 mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-100 mb-6">
            <Lock className="h-10 w-10 text-violet-600" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900">
            {t('settings.payment.subscriptionRequired.title')}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {t('settings.payment.subscriptionRequired.description')}
          </p>
        </motion.div>

        {currentPlan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="max-w-md mx-auto mb-10"
          >
            <div className="bg-white border border-amber-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="text-amber-600 font-semibold mb-2">
                {t('settings.payment.subscriptionRequired.currentPlan')}
              </div>
              <div className="text-2xl font-bold text-slate-900">{currentPlan.name}</div>
              <div className="text-slate-600">
                ${currentPlan.price} {t(`settings.payment.per${currentPlan.interval === 'month' ? 'Month' : 'Year'}`)}
              </div>
              <button
                onClick={() => handleSelectPlan(currentPlan.planId)}
                className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
              >
                {t('settings.payment.manageSubscription')}
              </button>
            </div>
          </motion.div>
        )}

        <div className={`grid gap-6 ${isSinglePlan ? 'place-items-center' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {plans.map((plan, index) => (
            <motion.div
              key={`${plan.planId}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                {plan.popular && (
                  <span className="flex items-center gap-1 text-sm text-violet-600">
                    <Sparkles className="h-4 w-4" />
                    {t('settings.payment.popular')}
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">${plan.price}</div>
              <div className="text-slate-600 mb-4">
                {t(`settings.payment.per${plan.interval === 'month' ? 'Month' : 'Year'}`)}
              </div>
              <ul className="space-y-2 mb-6">
                {curatedFeatures.map(feature => (
                  <li key={`${plan.planId}-${feature}`} className="text-slate-600 text-sm">
                    {t(feature)}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelectPlan(plan.planId)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                {t('settings.payment.selectPlan')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
