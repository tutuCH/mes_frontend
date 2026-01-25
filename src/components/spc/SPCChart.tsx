/**
 * SPCChart Component
 * Real-time SPC chart using Chart.js with control limits
 */

import { useEffect, useRef, memo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartJS, defaultChartOptions, createControlLimitLine, createDataLine, createCurrentValueIndicator, createStdDevLine, createMedianLine, createP95Line } from '@/lib/chartConfig'
import type { ChartOptions, ChartData } from '@/lib/chartConfig'
import { useSPCStreamAggregator, type DataPoint } from '@/hooks/useSPCStreamAggregator'
import type { SpcSeriesResponse, SpcSeriesStats } from '@/types/api'
import { api } from '@/services/api'
import { Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { SPCStatsPanel } from './SPCStatsPanel'

const DEBUG = true

const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log('[SPCChart]', ...args)
}

type TimeWindow = 'last_15m' | 'last_1h' | 'last_6h' | 'last_24h' | 'last_3d' | 'last_7d'
export type { TimeWindow }

interface ControlLimits {
  ucl: number
  lcl: number
  mean: number
}

interface SPCChartProps {
  machineId: number | string  // Numeric ID for REST API calls
  deviceId: string  // Device name for WebSocket subscriptions
  field: string
  name: string
  unit: string
  dataSource: 'spc' | 'realtime'
  isPaused?: boolean
  timeWindow?: TimeWindow
}

const RENDER_INTERVAL_MS = 100 // Update chart at 10 FPS
export const SPCChart = memo(function SPCChart({
  machineId,
  deviceId,
  field,
  name,
  unit,
  dataSource,
  isPaused = false,
  timeWindow = 'last_1h'
}: SPCChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartJS<'line'> | null>(null)
  const dataRef = useRef<DataPoint[]>([])
  const prevDataLengthRef = useRef<number>(0)
  const renderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const renderLoopStartedRef = useRef(false)
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<DataPoint[]>([])
  const [stats, setStats] = useState<SpcSeriesStats | null>(null)
  const [series, setSeries] = useState<SpcSeriesResponse | null>(null)
  const [limits, setLimits] = useState<ControlLimits | null>(null)
  const [limitsLoaded, setLimitsLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [collapsibleOpen, setCollapsibleOpen] = useState(false)
  const [currentValue, setCurrentValue] = useState<number | null>(null)

  const currentWindow = timeWindow || 'last_1h'
  const getDownsampleMethod = (window: TimeWindow): string => {
    const longWindows: TimeWindow[] = ['last_24h', 'last_3d', 'last_7d']
    return longWindows.includes(window) ? 'avg' : 'none'
  }

  // Handle data updates from WebSocket
  const handleDataUpdate = useCallback((newData: DataPoint[]) => {
    dataRef.current = newData
    if (newData.length > 0) {
      const val = newData[newData.length - 1].y
      setCurrentValue(val)
      debugLog('Current value updated:', val)
    }
  }, [])

  // Use the stream aggregator hook - capture the returned buffer
  const { dataBuffer } = useSPCStreamAggregator({
    deviceId,
    field,
    dataSource,
    initialData,
    onDataUpdate: handleDataUpdate,
    isPaused,
  })

  // Fetch chart series data on mount
  useEffect(() => {
    if (!machineId || !field || !timeWindow) return

    const fetchSeriesData = async () => {
      setLoading(true)
      setError(null)

      try {
        debugLog('Fetching series data for:', { machineId, field, timeWindow: currentWindow })

        const seriesRes: SpcSeriesResponse = await api.getSPCSeries(
          machineId,
          field,
          currentWindow as string,
          100,
          getDownsampleMethod(currentWindow),
          true,
          true
        )

        debugLog('Received series response:', {
          hasSeries: !!seriesRes.series,
          seriesLength: seriesRes.series?.length,
          hasLimits: !!seriesRes.limits,
          limits: seriesRes.limits,
          hasStats: !!seriesRes.stats,
          stats: seriesRes.stats
        })

        if (!seriesRes.series || seriesRes.series.length === 0) {
          debugLog('No series data available')
          setInitialData([])
          setDataLoaded(true)
          setLoading(false)
          setLimits(null)
          setLimitsLoaded(true)
          return
        }

        const historicalPoints: DataPoint[] = seriesRes.series.map(p => ({
          x: new Date(p.ts).getTime(),
          y: p.value
        })).filter((p): p is DataPoint => !isNaN(p.y))

        debugLog('Mapped historical points:', { count: historicalPoints.length })
        setInitialData(historicalPoints)
        setDataLoaded(true)
        setSeries(seriesRes)

        if (seriesRes.limits &&
            seriesRes.limits.ucl !== undefined &&
            seriesRes.limits.lcl !== undefined &&
            seriesRes.limits.mean !== undefined) {
          const newLimits = {
            ucl: seriesRes.limits.ucl,
            lcl: seriesRes.limits.lcl,
            mean: seriesRes.limits.mean
          }
          debugLog('Setting limits:', newLimits)
          setLimits(newLimits)
          setLimitsLoaded(true)
        } else {
          debugLog('Limits not available or incomplete')
          setLimits(null)
          setLimitsLoaded(true)
        }

        if (seriesRes.stats) {
          debugLog('Setting stats:', seriesRes.stats)
          setStats(seriesRes.stats)
        } else {
          debugLog('Stats not available')
          setStats(null)
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch SPC series:', err)
        setError('Failed to load chart data')
        setDataLoaded(true)
        setLimitsLoaded(true)
        setLoading(false)
      }
    }

    fetchSeriesData()
  }, [machineId, field, timeWindow, dataSource, currentWindow])

  // Initialize chart - wait for data to be loaded
  useEffect(() => {
    if (!canvasRef.current) return
    // Use dataBuffer for initial data - new references will be provided by the aggregator
    if (!dataBuffer || dataBuffer.length === 0) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return


    // Create chart with initial data - new references will be provided via handleDataUpdate
    const chartData: ChartData = {
      datasets: [
        createDataLine(dataBuffer, `${name} (${unit})`),
      ],
    }

    // Initialize dataRef with initial data
    dataRef.current = dataBuffer

    // Add control limit lines if available
    if (limits) {
      const { ucl, lcl, mean } = limits
      void ucl; void lcl; void mean // Values used in render loop
      chartData.datasets.push(
        createControlLimitLine([], 'rgb(239, 68, 68)', 'UCL', [5, 5]), // red-500
        createControlLimitLine([], 'rgb(239, 68, 68)', 'LCL', [5, 5]), // red-500
        createControlLimitLine([], 'rgb(34, 197, 94)', 'Mean', [3, 3]) // green-500
      )

      // Add statistical lines if stats available
      if (stats) {
        // P95 line
        chartData.datasets.push(createP95Line([]))

        // Median line
        chartData.datasets.push(createMedianLine([]))

        // +1σ line (if stdDev available)
        if (stats.stdDev) {
          chartData.datasets.push(createStdDevLine([], 'rgb(251, 191, 36)', '+1σ', [2, 4])) // amber-400
          chartData.datasets.push(createStdDevLine([], 'rgb(251, 191, 36)', '-1σ', [2, 4]))
        }

        // +2σ line (if stdDev available)
        if (stats.stdDev) {
          chartData.datasets.push(createStdDevLine([], 'rgb(156, 163, 175)', '+2σ', [1, 3])) // gray-400
          chartData.datasets.push(createStdDevLine([], 'rgb(156, 163, 175)', '-2σ', [1, 3]))
        }
      }

      // Add current value indicator if data exists
      if (dataBuffer.length > 0) {
        const val = dataBuffer[dataBuffer.length - 1].y
        chartData.datasets.push(createCurrentValueIndicator(val, ucl, lcl))
      }

      debugLog('Chart initialized with datasets:', chartData.datasets.length)
      debugLog('Chart instance created')
    }

    // Chart options
    const options: ChartOptions = {
      ...defaultChartOptions,
      scales: {
        ...defaultChartOptions.scales,
        y: {
          ...defaultChartOptions.scales?.y,
          title: {
            display: true,
            text: unit,
            font: {
              size: 11,
            },
          },
        },
      },
    }

    // Create chart instance
    chartRef.current = new ChartJS(ctx, {
      type: 'line',
      data: chartData,
      options,
    })

    return () => {
      if (chartRef.current) {
        debugLog('Destroying chart instance')
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [loading, limitsLoaded, dataBuffer, name, unit, field, timeWindow, limits, stats])

  // Update control limits when they load (fallback for edge cases)
  // Note: With limitsLoaded in the chart init dependencies, this is primarily defensive
  useEffect(() => {
    if (!chartRef.current || !limitsLoaded || !limits) return

    const chart = chartRef.current

    // Add control limit lines if they don't exist (defensive fallback)
    if (chart.data.datasets.length === 1) {
      chart.data.datasets.push(
        createControlLimitLine([], 'rgb(239, 68, 68)', 'UCL', [5, 5]), // red-500
        createControlLimitLine([], 'rgb(239, 68, 68)', 'LCL', [5, 5]), // red-500
        createControlLimitLine([], 'rgb(34, 197, 94)', 'Mean', [3, 3]) // green-500
      )
      chart.update()
    }
  }, [limitsLoaded, limits])

  // Render loop - update chart at fixed interval
  // Note: Depends on dataLoaded and limitsLoaded (state) rather than chartRef.current (ref)
  // because ref changes don't trigger effect re-runs
  useEffect(() => {
    // Wait for data and limits to be loaded before starting render loop
    if (!dataLoaded || !limitsLoaded) {
      return
    }

    if (!chartRef.current) {
      return
    }

    // Prevent starting multiple intervals
    if (renderLoopStartedRef.current) {
      return
    }

    renderLoopStartedRef.current = true

    const updateChart = () => {
      if (!chartRef.current) return

      const chart = chartRef.current
      const data = dataRef.current
      const prevLength = prevDataLengthRef.current
      const lengthChanged = data.length !== prevLength

      // Update main data line - new reference triggers Chart.js change detection
      chart.data.datasets[0].data = data

      if (lengthChanged) {
        prevDataLengthRef.current = data.length
      }

      // Update control limit lines if available
      if (limits && data.length > 0 && chart.data.datasets.length > 1) {
        const { ucl, lcl, mean } = limits
        const firstX = data[0].x
        const lastX = data[data.length - 1].x

        // UCL line (dataset 1)
        chart.data.datasets[1].data = [
          { x: firstX, y: ucl },
          { x: lastX, y: ucl },
        ]

        // LCL line (dataset 2)
        chart.data.datasets[2].data = [
          { x: firstX, y: lcl },
          { x: lastX, y: lcl },
        ]

        // Mean line (dataset 3)
        chart.data.datasets[3].data = [
          { x: firstX, y: mean },
          { x: lastX, y: mean },
        ]

        // Statistical lines if stats available
        let datasetIndex = 4
        if (stats) {
          // P95 line
          if (stats.p95 !== undefined && chart.data.datasets[datasetIndex]) {
            chart.data.datasets[datasetIndex].data = [
              { x: firstX, y: stats.p95 },
              { x: lastX, y: stats.p95 },
            ]
          }
          datasetIndex++

          // Median line
          if (stats.median !== undefined && chart.data.datasets[datasetIndex]) {
            chart.data.datasets[datasetIndex].data = [
              { x: firstX, y: stats.median },
              { x: lastX, y: stats.median },
            ]
          }
          datasetIndex++

          // ±1σ lines
          if (stats.stdDev !== undefined) {
            const plus1Sigma = mean + stats.stdDev
            const minus1Sigma = mean - stats.stdDev

            if (chart.data.datasets[datasetIndex]) {
              chart.data.datasets[datasetIndex].data = [
                { x: firstX, y: plus1Sigma },
                { x: lastX, y: plus1Sigma },
              ]
            }
            datasetIndex++

            if (chart.data.datasets[datasetIndex]) {
              chart.data.datasets[datasetIndex].data = [
                { x: firstX, y: minus1Sigma },
                { x: lastX, y: minus1Sigma },
              ]
            }
            datasetIndex++

            // ±2σ lines
            const plus2Sigma = mean + 2 * stats.stdDev
            const minus2Sigma = mean - 2 * stats.stdDev

            if (chart.data.datasets[datasetIndex]) {
              chart.data.datasets[datasetIndex].data = [
                { x: firstX, y: plus2Sigma },
                { x: lastX, y: plus2Sigma },
              ]
            }
            datasetIndex++

            if (chart.data.datasets[datasetIndex]) {
              chart.data.datasets[datasetIndex].data = [
                { x: firstX, y: minus2Sigma },
                { x: lastX, y: minus2Sigma },
              ]
            }
            datasetIndex++
          }
        }

        // Update current value indicator
        if (data.length > 0 && chart.data.datasets[datasetIndex]) {
          const val = data[data.length - 1].y
          chart.data.datasets[datasetIndex].data = [{ x: Date.now(), y: val }]
        }
      }

      // Update chart with 'none' mode for better performance during real-time updates
      // Using 'none' mode avoids full animations and improves rendering performance
      chart.update('none')
    }

    // Start render loop
    renderTimerRef.current = setInterval(updateChart, RENDER_INTERVAL_MS)

    return () => {
      if (renderTimerRef.current) {
        clearInterval(renderTimerRef.current)
        renderTimerRef.current = null
        renderLoopStartedRef.current = false
      }
    }
  }, [dataLoaded, limitsLoaded, field, limits, stats])

  // Debug log render state
  debugLog('Render state:', {
    loading,
    dataLoaded,
    limitsLoaded,
    collapsibleOpen,
    hasStats: !!stats,
    hasLimits: !!limits,
    hasSeries: !!series
  })

  // Show loading state
  if (loading || !dataLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading chart...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-sm text-destructive">
          <div className="font-medium">{error}</div>
          <div className="text-xs mt-1">Chart: {name}</div>
        </div>
      </div>
    )
  }

  // Main render - chart with collapsible stats panel
  const hasStatsData = dataLoaded && limitsLoaded && stats && limits && series
  debugLog('Stats data ready:', hasStatsData)

  return (
    <Card className="w-full border rounded-lg overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Chart Section - Fixed Height */}
        <div className="w-full h-80 relative bg-card border border-border/50 rounded-xl">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Stats Panel - Collapsible */}
        {hasStatsData && (
          <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
            <CollapsibleTrigger render={
              <Button variant="ghost" className="w-full justify-between">
                <span>{t(`spc.${collapsibleOpen ? 'hideDetails' : 'seeDetails'}`)}</span>
                <ChevronDown className="ml-auto group-data-[state=open]/collapsible-trigger:rotate-180" />
              </Button>
            } />
            <CollapsibleContent className="flex flex-col items-start gap-4 p-2.5 pt-0 text-sm">
              <SPCStatsPanel
                field={field}
                unit={unit}
                name={name}
                current={currentValue || 0}
                mean={limits.mean}
                ucl={limits.ucl}
                lcl={limits.lcl}
                count={stats.count}
                stdDev={stats.stdDev}
                median={stats.median}
                min={stats.min}
                max={stats.max}
                p95={stats.p95}
                windowStart={series.window?.start || ''}
                windowEnd={series.window?.end || ''}
                sigma={limits.sigma}
                method={series.limits?.method || ''}
                dataPoints={initialData.map(p => ({
                  ts: new Date(p.x).toISOString(),
                  value: p.y
                }))}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
})
