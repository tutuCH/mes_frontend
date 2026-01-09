import { Button } from '@/components/ui/button'
import { RefreshCw, Cog } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FactoryControlsBarProps {
  onRefresh?: () => void
  onSettings?: () => void
}

export function FactoryControlsBar({ onRefresh, onSettings }: FactoryControlsBarProps) {
  const { t } = useTranslation()
  const statusConfig = [
    { key: 'online', color: 'bg-green-400', ring: 'ring-green-200' },
    { key: 'offline', color: 'bg-gray-400', ring: 'ring-gray-200' },
    { key: 'warning', color: 'bg-amber-400', ring: 'ring-amber-200' },
    { key: 'error', color: 'bg-red-400', ring: 'ring-red-200' },
  ]

  return (
    <div className="border-b bg-slate-50 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          {statusConfig.map(({ key, color, ring }) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${color} ring-2 ${ring}`} />
              <span className="text-muted-foreground">{t(`factoryView.${key}`)}</span>
            </div>
          ))}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            {t('factoryView.refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={onSettings}>
            <Cog className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            {t('factoryView.settings')}
          </Button>
        </div>
      </div>
    </div>
  )
}
