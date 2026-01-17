import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle } from 'lucide-react'
import type { BillingPlan } from '@/types/api'

interface PlanComparisonProps {
  plans: BillingPlan[]
  currentPlanId?: string
}

export function PlanComparison({ plans, currentPlanId }: PlanComparisonProps) {
  const { t } = useTranslation()

  const sortedPlans = plans.sort((a, b) => a.price - b.price)
  const allFeatures = Array.from(
    new Set(
      sortedPlans.flatMap(plan =>
        plan.features.filter(f =>
          f && typeof f === 'string' && !['myproduct', 'placeholder', 'example', 'todo', 'tbd', ''].includes(f.toLowerCase().trim())
        )
      )
    )
  )

  const hasFeature = (plan: BillingPlan, feature: string): boolean => {
    return plan.features.includes(feature)
  }

  const firstPlan = plans[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.payment.planComparison.title')}</CardTitle>
        <CardDescription>{t('settings.payment.planComparison.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium">{t('settings.payment.planComparison.features')}</th>
                {sortedPlans.map(plan => (
                  <th
                    key={plan.planId}
                    className={`p-4 text-center font-medium ${plan.planId === currentPlanId ? 'bg-primary/10 border-2 border-primary' : ''}`}
                  >
                    <div className="font-bold">{plan.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${plan.price} / {plan.interval === 'month' ? t('settings.payment.perMonth') : t('settings.payment.perYear')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-4 font-medium">{t('settings.payment.planComparison.price')}</td>
                {sortedPlans.map(plan => (
                  <td
                    key={plan.planId}
                    className={`p-4 text-center ${plan.planId === currentPlanId ? 'bg-primary/10' : ''}`}
                  >
                    ${plan.price} / {plan.interval === 'month' ? t('settings.payment.perMonth') : t('settings.payment.perYear')}
                  </td>
                ))}
              </tr>

              {firstPlan?.maxMachines && (
                <tr className="border-b">
                  <td className="p-4 font-medium">{t('settings.payment.maxMachines', { count: 1 })}</td>
                  {sortedPlans.map(plan => (
                    <td
                      key={plan.planId}
                      className={`p-4 text-center ${plan.planId === currentPlanId ? 'bg-primary/10' : ''}`}
                    >
                      {plan.maxMachines || t('common.unlimited')}
                    </td>
                  ))}
                </tr>
              )}

              {firstPlan?.maxUsers && (
                <tr className="border-b">
                  <td className="p-4 font-medium">{t('settings.payment.maxUsers', { count: 1 })}</td>
                  {sortedPlans.map(plan => (
                    <td
                      key={plan.planId}
                      className={`p-4 text-center ${plan.planId === currentPlanId ? 'bg-primary/10' : ''}`}
                    >
                      {plan.maxUsers || t('common.unlimited')}
                    </td>
                  ))}
                </tr>
              )}

              {allFeatures.map(feature => (
                <tr key={feature} className="border-b">
                  <td className="p-4 text-sm">{feature}</td>
                  {sortedPlans.map(plan => (
                    <td
                      key={plan.planId}
                      className={`p-4 text-center ${plan.planId === currentPlanId ? 'bg-primary/10' : ''}`}
                    >
                      {hasFeature(plan, feature) ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
