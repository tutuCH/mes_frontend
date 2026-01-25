import { memo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SPCChart } from './SPCChart'
import type { TimeWindow } from './SPCChart'

interface Metric {
  name: string
  field: string
  unit: string
  dataSource: 'spc' | 'realtime'
}

interface MetricCategorySectionProps {
  category: string
  metrics: Metric[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  machineId: number | string  // Numeric ID for REST API calls
  deviceId: string  // Device name for WebSocket subscriptions
  isPaused?: boolean
  timeWindow?: string
}

export const MetricCategorySection = memo(function MetricCategorySection({
  category,
  metrics,
  isOpen,
  onOpenChange,
  machineId,
  deviceId,
  isPaused = false,
  timeWindow = 'last_1h'
}: MetricCategorySectionProps) {

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => onOpenChange(!isOpen)}
        className="w-full px-4 py-3 bg-muted/50 hover:bg-muted/80 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{category}</h3>
          <span className="text-sm text-muted-foreground">
            ({metrics.length} metric{metrics.length > 1 ? 's' : ''})
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map((metric) => (
              <div key={metric.field} className="border rounded-lg p-3 bg-card">
                <h4 className="text-sm font-medium mb-2">{metric.name}</h4>
                <div className="h-[calc(100%-2rem)]">
                  <SPCChart
                    machineId={machineId}
                    deviceId={deviceId}
                    field={metric.field}
                    name={metric.name}
                    unit={metric.unit}
                    dataSource={metric.dataSource}
                    isPaused={isPaused}
                    timeWindow={timeWindow as TimeWindow}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
