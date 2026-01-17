import { useTranslation } from 'react-i18next'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

interface PastDueBannerProps {
  onClose?: () => void
  className?: string
}

export function PastDueBanner({ onClose, className }: PastDueBannerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleManageBilling = () => {
    navigate('/settings?tab=payment')
  }

  return (
    <div className={`bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-100 px-4 py-3 rounded-lg flex items-start gap-3 ${className || ''}`}>
      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <div className="font-medium">
          {t('settings.payment.pastDue.title')}
        </div>
        <div className="text-sm text-amber-800 dark:text-amber-200">
          {t('settings.payment.pastDue.description')}
        </div>
        <Button
          onClick={handleManageBilling}
          variant="link"
          className="h-auto p-0 text-amber-700 dark:text-amber-300 underline-offset-4"
        >
          {t('settings.payment.pastDue.updatePayment')}
        </Button>
      </div>
      {onClose && (
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-2 -mt-2 shrink-0 text-amber-700 dark:text-amber-300"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
