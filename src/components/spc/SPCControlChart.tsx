import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter } from 'recharts'
import { useMemo } from 'react'

interface SPCControlChartProps {
  title: string
  data: Array<{ id: number; value: number; timestamp: string }>
  unit: string
}

/**
 * OPTIMIZED: Removed duplicate data transformation
 * Data is already pre-transformed by parent component
 *
 * Task 5: Stable memoization keys to prevent unnecessary recomputation
 */
export function SPCControlChart({ title, data, unit }: SPCControlChartProps) {
  // OPTIMIZATION: Data is already transformed, just use it directly
  // This avoids creating a new array on every render
  const chartData = data

  // Create a stable key for data to prevent unnecessary recomputation (Task 5)
  // Use data length and last 3 values as a quick change detection
  const dataKey = useMemo(() => {
    if (chartData.length === 0) return 'empty'
    const lastValues = chartData.slice(-3).map(d => d.value.toFixed(2)).join(',')
    return `${chartData.length}:${lastValues}`
  }, [chartData])

  // Calculate control limits dynamically from data
  const controlLimits = useMemo(() => {
    if (chartData.length === 0) {
      return { mean: 0, ucl: 0, lcl: 0, stdDev: 0 }
    }

    const values = chartData.map(d => d.value)

    // Calculate mean
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    // Calculate control limits (mean ± 3σ)
    const ucl = mean + 3 * stdDev
    const lcl = mean - 3 * stdDev

    return { mean, ucl, lcl, stdDev }
  }, [dataKey]) // Use stable key instead of array reference

  // Identify out-of-control points (Task 5: Skip recompute when limits unchanged)
  const outOfControlPoints = useMemo(() => {
    return chartData
      .filter(d => d.value > controlLimits.ucl || d.value < controlLimits.lcl)
      .map(d => ({ id: d.id, value: d.value }))
  }, [dataKey, controlLimits.ucl, controlLimits.lcl]) // Use stable key

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <div className="text-xs text-muted-foreground text-right">
            <div>n = {data.length}</div>
            <div>Mean = {controlLimits.mean.toFixed(2)} {unit}</div>
            <div>σ = {controlLimits.stdDev.toFixed(2)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] sm:h-[260px] md:h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="id"
                hide
              />
              <YAxis
                domain={[
                  controlLimits.lcl - (controlLimits.ucl - controlLimits.lcl) * 0.2,
                  controlLimits.ucl + (controlLimits.ucl - controlLimits.lcl) * 0.2
                ]}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, 'Value']}
                labelFormatter={(label) => `Sample #${label}`}
              />

              {/* Control Limits */}
              <ReferenceLine
                y={controlLimits.ucl}
                stroke="red"
                strokeDasharray="3 3"
                label={{ value: `UCL: ${controlLimits.ucl.toFixed(2)}`, fill: 'red', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                y={controlLimits.lcl}
                stroke="red"
                strokeDasharray="3 3"
                label={{ value: `LCL: ${controlLimits.lcl.toFixed(2)}`, fill: 'red', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                y={controlLimits.mean}
                stroke="green"
                label={{ value: `Mean: ${controlLimits.mean.toFixed(2)}`, fill: 'green', fontSize: 10, position: 'right' }}
              />

              {/* Data Line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3, fill: "#2563eb" }}
                activeDot={{ r: 6 }}
              />

              {/* Out of Control Points (highlighted in red) */}
              <Scatter
                data={outOfControlPoints}
                fill="red"
                shape="circle"
                r={6}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics Summary */}
        {outOfControlPoints.length > 0 && (
          <div className="mt-2 text-xs text-destructive">
            {outOfControlPoints.length} out of control point{outOfControlPoints.length > 1 ? 's' : ''} detected
          </div>
        )}
      </CardContent>
    </Card>
  )
}
