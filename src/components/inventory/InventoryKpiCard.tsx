import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface InventoryKpiCardProps {
  title: string
  value: string
  subtitle?: string
  tone?: 'default' | 'warning' | 'critical'
  testId?: string
}

const TONE_STYLES: Record<NonNullable<InventoryKpiCardProps['tone']>, string> = {
  default: 'text-foreground',
  warning: 'text-amber-600',
  critical: 'text-rose-600',
}

export function InventoryKpiCard({
  title,
  value,
  subtitle,
  tone = 'default',
  testId,
}: InventoryKpiCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        <div
          data-testid={testId}
          className={cn('mt-2 text-2xl font-semibold', TONE_STYLES[tone])}
        >
          {value}
        </div>
        {subtitle && (
          <div className="mt-1 text-xs text-muted-foreground">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
