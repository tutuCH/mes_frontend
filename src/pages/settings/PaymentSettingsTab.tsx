import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, CreditCard, CheckCircle, Zap, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { createLogger } from '@/utils/logger'
import type { BillingSubscription, BillingPlan, PaymentMethod, BillingDemoInfo } from '@/types/api'

const logger = createLogger('PaymentSettingsTab')

// Normalize subscription status to ensure we have a valid translation key
const normalizeSubscriptionStatus = (status: string | undefined | null): string => {
  if (!status || status === 'null' || status === 'undefined' || status.trim() === '') {
    return 'inactive'
  }

  // Map Stripe status values to our translation keys
  const statusMap: Record<string, string> = {
    'active': 'active',
    'trialing': 'trialing',
    'canceled': 'canceled',
    'past_due': 'past_due',
    'unpaid': 'unpaid',
    'incomplete': 'inactive',
    'incomplete_expired': 'inactive',
    'paused': 'inactive',
  }

  const normalizedStatus = statusMap[status.toLowerCase()] || 'inactive'

  if (import.meta.env.DEV && !statusMap[status.toLowerCase()]) {
    logger.warn('[Payment] Unknown subscription status:', status, '→ Normalized to:', normalizedStatus)
  }

  return normalizedStatus
}

export function PaymentSettingsTab() {
  const { t } = useTranslation()

  // State management
  const [subscription, setSubscription] = useState<BillingSubscription | BillingDemoInfo | null>(null)
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [cancelingSubscription, setCancelingSubscription] = useState(false)

  // Fetch billing data on mount
  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    setIsLoading(true)
    try {
      const [subscriptionData, plansData, paymentMethodsData] = await Promise.all([
        api.getCurrentSubscription(),
        api.getBillingPlans(),
        api.getPaymentMethods().catch(() => []), // Payment methods may fail gracefully
      ])
      setSubscription(subscriptionData)
      setPlans(plansData)
      setPaymentMethods(paymentMethodsData)
    } catch (error) {
      logger.error('Failed to fetch billing data:', error)
      toast.error(t('settings.payment.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (plan: BillingPlan) => {
    setSelectedPlan(plan)
    setIsUpgradeDialogOpen(true)
  }

  const confirmUpgrade = async () => {
    if (!selectedPlan) return
    setIsRedirecting(true)
    try {
      const lookupKey = selectedPlan.planId || selectedPlan.id
      if (!lookupKey) {
        toast.error(t('settings.payment.checkoutFailed'))
        setIsRedirecting(false)
        return
      }

      const session = await api.createCheckoutSession({
        lookupKey,
        successUrl: `${window.location.origin}/settings?payment=success`,
        cancelUrl: `${window.location.origin}/settings?payment=canceled`,
      })
      // Redirect to Stripe Checkout
      window.location.href = session.url
    } catch (error) {
      logger.error('Failed to create checkout session:', error)
      toast.error(t('settings.payment.checkoutFailed'))
      setIsRedirecting(false)
    }
  }

  const handleManageBilling = async () => {
    setIsRedirecting(true)

    try {

      const session = await api.createPortalSession({
        returnUrl: `${window.location.origin}/settings?tab=payment`,
      })


      // Validate URL format
      if (!session.url || typeof session.url !== 'string') {
        throw new Error('Invalid portal session URL received from server')
      }

      // Validate URL is a valid URL
      try {
        new URL(session.url)
      } catch {
        throw new Error('Portal URL is not a valid URL format')
      }

      // Validate URL starts with https:// (Stripe portal URLs should be HTTPS)
      if (!session.url.startsWith('https://')) {
        logger.warn('[Billing Portal] URL is not HTTPS:', session.url)
      }

      window.location.href = session.url

    } catch (error) {
      logger.error('[Billing Portal] Failed to create portal session:', error)

      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          toast.error(t('settings.payment.portalNotConfigured'))
        } else if (error.message.includes('401') || error.message.includes('403')) {
          toast.error(t('settings.payment.portalUnauthorized'))
        } else {
          toast.error(t('settings.payment.portalFailed') + ': ' + error.message)
        }
      } else {
        toast.error(t('settings.payment.portalFailed'))
      }

      setIsRedirecting(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscription || 'isDemo' in subscription) return
    setCancelingSubscription(true)
    try {
      await api.cancelBillingSubscription(subscription.subscriptionId)
      await fetchBillingData()
      setIsCancelDialogOpen(false)
      toast.success(t('settings.payment.cancellationScheduled'))
    } catch (error) {
      logger.error('Failed to cancel subscription:', error)
      toast.error(t('settings.payment.cancellationFailed'))
    } finally {
      setCancelingSubscription(false)
    }
  }

  // Check if demo mode
  const isDemoMode = subscription && 'isDemo' in subscription

  // Get subscription status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trialing: 'secondary',
      canceled: 'secondary',
      past_due: 'destructive',
      unpaid: 'destructive',
      inactive: 'outline',
    }
    return variants[status] || 'outline'
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  // Get card brand icon
  const getCardBrandIcon = () => {
    return <CreditCard className="h-5 w-5" />
  }

  // Get current plan
  const getCurrentPlan = () => {
    if (!subscription || isDemoMode) return null
    return plans.find(p => p.planId === subscription.planId)
  }

  const currentPlan = getCurrentPlan()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('settings.payment.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('settings.payment.description')}</p>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            {t('settings.payment.demoMode')}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Current Subscription Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('settings.payment.currentPlan')}</CardTitle>
                  <CardDescription>{t('settings.payment.currentPlanDescription')}</CardDescription>
                </div>
                {!isDemoMode && subscription && (
                  <Badge variant={getStatusBadge(subscription.status)}>
                    {t(`settings.payment.status.${normalizeSubscriptionStatus(subscription.status)}`)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isDemoMode && subscription && ['active', 'trialing'].includes(subscription.status) && currentPlan ? (
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">${currentPlan.price}</span>
                    <span className="text-muted-foreground">
                      {t(`settings.payment.per${currentPlan.interval === 'month' ? 'Month' : 'Year'}`)}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {currentPlan.name}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {subscription.currentPeriodEnd && (
                      <div className="text-muted-foreground">
                        {t('settings.payment.renewalDate', { date: formatDate(subscription.currentPeriodEnd) })}
                      </div>
                    )}
                    {subscription.trialEnd && (
                      <div className="text-muted-foreground">
                        {t('settings.payment.trialEnd', { date: formatDate(subscription.trialEnd) })}
                      </div>
                    )}
                    {subscription.cancelAtPeriodEnd && (
                      <Alert>
                        <AlertDescription className="text-sm">
                          {t('settings.payment.cancelSubscriptionDescription')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleManageBilling}
                      disabled={isRedirecting}
                      variant="outline"
                    >
                      {isRedirecting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 h-4 w-4" />
                      )}
                      {t('settings.payment.manageBilling')}
                    </Button>
                    {!subscription.cancelAtPeriodEnd && subscription.status === 'active' && (
                      <Button
                        onClick={() => setIsCancelDialogOpen(true)}
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        {t('settings.payment.cancelSubscription')}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{t('settings.payment.noActiveSubscription')}</p>
                  <Button onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}>
                    {t('settings.payment.selectPlan')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Plans Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.payment.availablePlans')}</CardTitle>
              <CardDescription>{t('settings.payment.plansDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                  // Determine if this plan is the user's current active plan
                  const isCurrentPlan = (() => {
                    // Demo mode - no active subscription
                    if (isDemoMode) return false

                    // No subscription - no active plan
                    if (!subscription) return false

                    // Demo info - no active plan
                    if ('isDemo' in subscription) return false

                    // Only consider plans "current" if subscription is active or trialing
                    if (!['active', 'trialing'].includes(subscription.status)) return false

                    // Type guard passed - safe to access planId
                    const currentPlanId = subscription.planId


                    // Compare plan IDs (both are strings)
                    return currentPlanId === plan.planId
                  })()

                  return (
                    <Card
                      key={plan.planId}
                      className={`relative ${plan.popular ? 'border-primary' : ''}`}
                    >
                      {plan.popular && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                          {t('settings.payment.popular')}
                        </Badge>
                      )}
                      <CardHeader>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">${plan.price}</span>
                            <span className="text-sm text-muted-foreground">
                              {t(`settings.payment.per${plan.interval === 'month' ? 'Month' : 'Year'}`)}
                            </span>
                          </div>
                        </div>

                        <ul className="space-y-2 mb-4">
                          {plan.features
                            .filter(f => {
                              if (!f || typeof f !== 'string') return false

                              const normalized = f.toLowerCase().trim()

                              // Filter out placeholder values
                              if (normalized === 'myproduct' ||
                                  normalized.includes('placeholder') ||
                                  normalized.includes('example') ||
                                  normalized === 'todo' ||
                                  normalized === 'tbd' ||
                                  normalized === '') {
                                return false
                              }

                              return true
                            })
                            .map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                          {plan.maxMachines && (
                            <li key={`machines-${plan.planId}`} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span>
                                {t('settings.payment.maxMachines', { count: plan.maxMachines })}
                              </span>
                            </li>
                          )}
                          {plan.maxUsers && (
                            <li key={`users-${plan.planId}`} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span>
                                {t('settings.payment.maxUsers', { count: plan.maxUsers })}
                              </span>
                            </li>
                          )}
                        </ul>

                        <Button
                          onClick={() => handleUpgrade(plan)}
                          disabled={isCurrentPlan || !!isDemoMode}
                          className="w-full"
                          variant={isCurrentPlan ? 'outline' : 'default'}
                        >
                          {isCurrentPlan ? t('settings.payment.currentPlanLabel') : t('settings.payment.selectPlan')}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Card */}
          {paymentMethods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.payment.paymentMethods')}</CardTitle>
                <CardDescription>{t('settings.payment.paymentMethodsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getCardBrandIcon()}
                        <div>
                          <div className="font-medium">
                            {method.brand || t('settings.payment.card')}
                            {method.isDefault && (
                              <Badge variant="secondary" className="ml-2">
                                {t('settings.payment.defaultMethod')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t('settings.payment.endingIn', { last4: method.last4 })}
                            {method.expMonth && method.expYear && (
                              <span className="ml-2">
                                {t('settings.payment.expires', {
                                  month: method.expMonth,
                                  year: method.expYear,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {t('settings.payment.managePaymentMethodsNote')}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.payment.upgradeDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('settings.payment.upgradeDialog.description', { plan: selectedPlan?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUpgradeDialogOpen(false)}
              disabled={isRedirecting}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmUpgrade} disabled={isRedirecting}>
              {isRedirecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('settings.payment.upgradeDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.payment.cancelDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('settings.payment.cancelDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={cancelingSubscription}
            >
              {t('settings.payment.cancelDialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelingSubscription}
            >
              {cancelingSubscription ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('settings.payment.cancelDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
