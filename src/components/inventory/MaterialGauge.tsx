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
        'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        statusClass
      )}
      title="Material remaining"
    >
      <span>Material</span>
      <span>{display}</span>
    </div>
  )
}
