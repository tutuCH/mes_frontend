import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Factory, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Factory as FactoryType } from '@/types/api'

interface FactoryHeaderProps {
  factory: FactoryType
  machineCount: number
  onDelete?: () => void
}

export function FactoryHeader({ factory, machineCount, onDelete }: FactoryHeaderProps) {
  const { t } = useTranslation()
  const width = factory.factoryWidth || 0
  const height = factory.factoryHeight || 0

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-3 sm:p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Left Group */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Factory Icon */}
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 items-center justify-center">
            <Factory className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          {/* Factory Name & Info */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold">
              {factory.factoryName || `Factory ${factory.factoryIndex}`}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Badge className="bg-white/20 text-white hover:bg-white/30">
                {width}×{height}
              </Badge>
              <span>•</span>
              <span>{machineCount} {t('factoryView.machines')}</span>
            </div>
          </div>
        </div>

        {/* Right Group - Delete Button (only when no machines) */}
        {machineCount === 0 && onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('factoryView.deleteFactory')}</span>
            <span className="sm:hidden">{t('common.delete')}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
