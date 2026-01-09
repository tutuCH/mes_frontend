import { useState, memo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SPCControlChart } from './SPCControlChart'

interface Metric {
  name: string
  field: string
  unit: string
  dataSource: 'spc' | 'realtime'
}

interface ChartDataPoint {
  id: number
  value: number
  timestamp: string
}

interface MetricCategorySectionProps {
  category: string
  metrics: Metric[]
  chartData: Record<string, ChartDataPoint[]>
  defaultOpen?: boolean
}

export const MetricCategorySection = memo(function MetricCategorySection({
  category,
  metrics,
  chartData,
  defaultOpen = true
}: MetricCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => {
              const data = chartData[metric.field] || []
              return (
                <SPCControlChart
                  key={metric.field}
                  title={metric.name}
                  data={data}
                  unit={metric.unit}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})
