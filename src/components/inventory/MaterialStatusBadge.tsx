import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export type MaterialStatus = 'ok' | 'warning' | 'critical'

const STATUS_STYLES: Record<MaterialStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
}

export function MaterialStatusBadge({ status }: { status: MaterialStatus }) {
  const { t } = useTranslation()
  const label = t(`inventory.status.${status}`)

  return (
    <span
      data-testid="material-status"
      data-status={status}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        STATUS_STYLES[status]
      )}
    >
      {label}
    </span>
  )
}
