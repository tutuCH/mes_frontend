import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Lock, Crown, ArrowRight } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface SubscriptionGateProps {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
  open?: boolean
  onUpgrade?: () => void
}

export function SubscriptionGate({
  feature,
  children,
  fallback,
  open: controlledOpen,
  onUpgrade,
}: SubscriptionGateProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { canAccess, getCurrentPlan, plans } = useSubscription()
  const currentPlan = getCurrentPlan()

  const canAccessFeature = canAccess()

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      navigate('/settings?tab=payment', { state: { from: location.pathname } })
    }
  }

  if (canAccessFeature) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <Dialog open={controlledOpen !== undefined ? controlledOpen : true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl">
              {t('settings.payment.subscriptionGate.title')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {t('settings.payment.subscriptionGate.description', { feature })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentPlan && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Crown className="h-4 w-4 text-muted-foreground" />
                <span>{t('settings.payment.subscriptionGate.currentPlan')}</span>
              </div>
              <div className="pl-6">
                <div className="font-semibold">{currentPlan.name}</div>
                <div className="text-sm text-muted-foreground">
                  ${currentPlan.price} / {currentPlan.interval === 'month' ? t('settings.payment.perMonth') : t('settings.payment.perYear')}
                </div>
              </div>
            </div>
          )}

          <div className="bg-primary/5 rounded-lg p-4 space-y-3">
            <div className="font-medium text-primary">
              {t('settings.payment.subscriptionGate.unlockMessage')}
            </div>
            <ul className="space-y-2 text-sm">
              {plans.slice(0, 3).map((plan) => (
                <li key={plan.planId} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-muted-foreground">
                      ${plan.price} / {plan.interval === 'month' ? t('settings.payment.perMonth') : t('settings.payment.perYear')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/settings?tab=payment')}
            className="flex-1"
          >
            {t('settings.payment.viewPlans')}
          </Button>
          <Button
            onClick={handleUpgrade}
            className="flex-1"
          >
            {t('settings.payment.upgradeNow')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
