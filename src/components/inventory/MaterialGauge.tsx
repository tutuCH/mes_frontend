import { cn } from '@/lib/utils'
import type { MaterialStatus } from './MaterialStatusBadge'

const STATUS_RING: Record<MaterialStatus, string> = {
  ok: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  critical: 'bg-rose-500/10 text-rose-600',
}

export function MaterialGauge({
  remainingHours,
  status,
}: {
  remainingHours: number | null
  status: MaterialStatus | null
}) {
  const display = remainingHours == null ? '--' : `${remainingHours.toFixed(1)}h`
  const statusClass = status ? STATUS_RING[status] : 'bg-muted text-muted-foreground'

  return (
    <div
      data-testid="material-gauge"
      className={cn(
        'mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none sm:px-2 sm:text-[10px]',
        statusClass
      )}
      title="Material remaining"
    >
      <span className="hidden sm:inline">Material</span>
      <span className="truncate">{display}</span>
    </div>
  )
}
