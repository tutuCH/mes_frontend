import { PredictiveRiskList } from '@/components/maintenance/PredictiveRiskList'
import { Button } from '@/components/ui/button'
import { Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function MaintenanceDashboard() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('maintenance.title')}</h1>
          <p className="text-muted-foreground">{t('maintenance.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Wrench className="mr-2 h-4 w-4" />
            {t('maintenance.createWorkOrder')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <PredictiveRiskList />
      </div>
    </div>
  )
}
