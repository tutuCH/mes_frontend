/**
 * SPCChart Component
 * Real-time SPC chart using Chart.js with control limits
 */

import { useEffect, useRef, memo, useState, useCallback } from 'react'

import { AlertTriangle, Loader2 } from 'lucide-react'

import { ChartJS, defaultChartOptions } from '@/lib/chartConfig'
import type { ChartOptions, ChartData } from '@/lib/chartConfig'
import { useSPCStreamAggregator, type DataPoint } from '@/hooks/useSPCStreamAggregator'
import type { SpcSeriesResponse, SpcSeriesStats } from '@/types/api'
import { api } from '@/services/api'
import { createLogger } from '@/utils/logger'
import { summarizeSeriesTiming } from '@/utils/spcTimingDebug'
import { mapSeriesToChartPoints } from '@/utils/spcSeriesTransform'
import { buildSpcDatasets } from '@/utils/spcChartDatasets'
import { inferSpcCoverage, shouldWarnPartialCoverage } from '@/utils/spcCoverage'

import { SPCStatsPanel } from './SPCStatsPanel'
import {
  formatHours,
  MIN_24H_COVERAGE_RATIO,
  pickBetterSeriesResponse,
  resolveSpcSeriesLimit,
  shouldAttemptRawFallback,
  shouldShowNoDataCard,
} from './spcChartHelpers'

const logger = createLogger('SPCChart')
const debugLog = logger.debug.bind(logger)
const DEBUG_TIMING = import.meta.env.VITE_DEBUG_SPC_TIMING === 'true' ||
  (typeof window !== 'undefined' && (window as typeof window & { __SPC_DEBUG_TIMING__?: boolean }).__SPC_DEBUG_TIMING__ === true)

type TimeWindow = 'last_15m' | 'last_1h' | 'last_6h' | 'last_24h' | 'last_3d' | 'last_7d'
export type { TimeWindow }

interface ControlLimits {
  ucl: number
  lcl: number
  mean: number
  sigma?: number
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
const SPC_SERIES_LIMIT = resolveSpcSeriesLimit(import.meta.env.VITE_SPC_MAX_POINTS)

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<DataPoint[]>([])
  const [stats, setStats] = useState<SpcSeriesStats | null>(null)
  const [series, setSeries] = useState<SpcSeriesResponse | null>(null)
  const [limits, setLimits] = useState<ControlLimits | null>(null)
  const [limitsLoaded, setLimitsLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [currentValue, setCurrentValue] = useState<number | null>(null)
  const [historyHadNoData, setHistoryHadNoData] = useState(false)
  const [hasVisibleData, setHasVisibleData] = useState(false)

  const currentWindow = timeWindow || 'last_1h'
  const getDownsampleMethod = (window: TimeWindow): string => {
    return ['last_6h', 'last_24h', 'last_3d', 'last_7d'].includes(window) ? 'avg' : 'none'
  }

  // Handle data updates from WebSocket
  const handleDataUpdate = useCallback((newData: DataPoint[]) => {
    dataRef.current = newData
    setHasVisibleData(newData.some((point) => Number.isFinite(point.y)))
    if (newData.length > 0) {
      const val = newData[newData.length - 1].y
      setCurrentValue(val)
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
        const preferredDownsample = getDownsampleMethod(currentWindow)
        let seriesRes: SpcSeriesResponse = await api.getSPCSeries(
          machineId,
          field,
          currentWindow as string,
          SPC_SERIES_LIMIT,
          preferredDownsample,
          true,
          true
        )
        if (
          shouldAttemptRawFallback({
            response: seriesRes,
            preferredDownsample,
            requestedLimit: SPC_SERIES_LIMIT,
            currentWindow,
          })
        ) {
          try {
            const rawFallback = await api.getSPCSeries(
              machineId,
              field,
              currentWindow as string,
              SPC_SERIES_LIMIT,
              'none',
              true,
              true
            )
            seriesRes = pickBetterSeriesResponse(seriesRes, rawFallback)
          } catch (fallbackError) {
            logger.warn('[SPCChart] Raw fallback request failed, keeping primary response', {
              field,
              machineId,
              currentWindow,
              error: fallbackError,
            })
          }
        }

        if (!seriesRes.series || seriesRes.series.length === 0) {
          setSeries(seriesRes)
          setInitialData([])
          setStats(seriesRes.stats ?? null)
          setCurrentValue(null)
          setHasVisibleData(false)
          setHistoryHadNoData(true)
          setDataLoaded(true)
          setLoading(false)
          setLimits(null)
          setLimitsLoaded(true)
          return
        }

        // Use window.end for accurate window boundary (not meta.generatedAt which is response time)
        const windowEndMs = Date.parse(seriesRes.window?.end ?? '') || Date.now()
        // Apply intervalMs consistently for ALL time windows to ensure uniform time representation
        const shouldUseInterval = seriesRes.sampling?.intervalMs ?? null
        const historicalPoints: DataPoint[] = mapSeriesToChartPoints({
          series: seriesRes.series,
          downsample: seriesRes.sampling?.downsample,
          intervalMs: shouldUseInterval,
          windowEndMs,
          debug: DEBUG_TIMING,
          field,
          logger: DEBUG_TIMING ? logger : undefined,
        }).filter((p): p is DataPoint => !isNaN(p.y))

        if (DEBUG_TIMING && seriesRes.series.length > 0) {
          const firstPoint = seriesRes.series[0]
          const lastPoint = seriesRes.series[seriesRes.series.length - 1]
          logger.debug('[SPCChart] Series timing summary', {
            field,
            machineId,
            timeWindow: currentWindow,
            windowEndMs: new Date(windowEndMs).toISOString(),
            intervalMs: shouldUseInterval,
            seriesLength: seriesRes.series.length,
            rawFirstTs: firstPoint?.ts,
            rawLastTs: lastPoint?.ts,
            parsedFirstTs: new Date(Date.parse(firstPoint?.ts || '')).toISOString(),
            parsedLastTs: new Date(Date.parse(lastPoint?.ts || '')).toISOString(),
            windowStart: seriesRes.window?.start,
            windowEnd: seriesRes.window?.end,
            metaGeneratedAt: seriesRes.meta?.generatedAt,
            samplingMethod: seriesRes.sampling?.downsample,
            summary: summarizeSeriesTiming({
              window: currentWindow,
              sampling: seriesRes.sampling,
              series: seriesRes.series,
            }),
          })
          logger.debug('[SPCChart] Mapped historical points', {
            field,
            count: historicalPoints.length,
            first: historicalPoints[0],
            last: historicalPoints[historicalPoints.length - 1],
            timeSpanMs: historicalPoints.length > 1 
              ? historicalPoints[historicalPoints.length - 1].x - historicalPoints[0].x 
              : 0,
          })
        }
        setInitialData(historicalPoints)
        setHasVisibleData(historicalPoints.some((point) => Number.isFinite(point.y)))
        setHistoryHadNoData(false)
        setDataLoaded(true)
        setSeries(seriesRes)

        if (seriesRes.limits &&
            seriesRes.limits.ucl !== undefined &&
            seriesRes.limits.lcl !== undefined &&
            seriesRes.limits.mean !== undefined) {
          const newLimits = {
            ucl: seriesRes.limits.ucl,
            lcl: seriesRes.limits.lcl,
            mean: seriesRes.limits.mean,
            sigma: seriesRes.limits.sigma
          }
          setLimits(newLimits)
          setLimitsLoaded(true)
        } else {
          setLimits(null)
          setLimitsLoaded(true)
        }

        if (seriesRes.stats) {
          setStats(seriesRes.stats)
        } else {
          setStats(null)
        }

        setLoading(false)
      } catch (err) {
        logger.error('Failed to fetch SPC series:', err)
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
    if (!dataBuffer) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return


    // Create chart with initial data - new references will be provided via handleDataUpdate
    const chartData: ChartData = {
      datasets: buildSpcDatasets({
        data: dataBuffer,
        name,
        unit,
        limits,
        stats,
      }),
    }

    // Initialize dataRef with initial data
    dataRef.current = dataBuffer

    if (DEBUG_TIMING && dataBuffer.length > 0) {
      const firstPoint = dataBuffer[0]
      const lastPoint = dataBuffer[dataBuffer.length - 1]
      const timeSpanMs = lastPoint.x - firstPoint.x
      logger.debug('[SPCChart] Chart init data', {
        field,
        deviceId,
        count: dataBuffer.length,
        first: {
          x: firstPoint.x,
          xISO: new Date(firstPoint.x).toISOString(),
          y: firstPoint.y,
        },
        last: {
          x: lastPoint.x,
          xISO: new Date(lastPoint.x).toISOString(),
          y: lastPoint.y,
        },
        timeSpanMs,
        timeSpanMinutes: timeSpanMs / 60000,
        xType: typeof firstPoint.x,
        avgIntervalMs: dataBuffer.length > 1 ? timeSpanMs / (dataBuffer.length - 1) : 0,
      })
    }

    debugLog('Chart initialized with datasets:', chartData.datasets.length)
    debugLog('Chart instance created')

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

    if (DEBUG_TIMING && typeof window !== 'undefined' && chartRef.current) {
      const debugKey = `${deviceId}:${field}`
      const debugStore = (window as typeof window & { __spcChartDebug?: Record<string, unknown> }).__spcChartDebug ?? {}
      debugStore[debugKey] = chartRef.current
      ;(window as typeof window & { __spcChartDebug?: Record<string, unknown> }).__spcChartDebug = debugStore
    }

    return () => {
      if (chartRef.current) {
        debugLog('Destroying chart instance')
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [loading, limitsLoaded, dataBuffer, name, unit, field, deviceId, timeWindow, limits, stats])

  // Sync datasets when limits/stats change to avoid missing metric lines
  useEffect(() => {
    if (!chartRef.current || !dataLoaded || !limitsLoaded) return

    chartRef.current.data.datasets = buildSpcDatasets({
      data: dataRef.current,
      name,
      unit,
      limits,
      stats,
    })
    chartRef.current.update('none')
  }, [dataLoaded, limitsLoaded, limits, stats, name, unit])

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
          const lastPoint = data[data.length - 1]
          const val = lastPoint.y
          chart.data.datasets[datasetIndex].data = [{ x: lastPoint.x, y: val }]
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
  const coverage = inferSpcCoverage({
    window: series?.window,
    series: series?.series,
    coverage: series?.coverage ?? null,
  })
  const show24hCoverageWarning = currentWindow === 'last_24h' && shouldWarnPartialCoverage({
    coverage,
    minCoverageRatio: MIN_24H_COVERAGE_RATIO,
    intervalMs: series?.sampling?.intervalMs,
  })
  const showNoDataCard = shouldShowNoDataCard({
    loading,
    dataLoaded,
    error,
    historyHadNoData,
    hasVisibleData,
  })
  debugLog('Stats data ready:', hasStatsData)

  return (
    <section className="w-full space-y-4">
      {show24hCoverageWarning && coverage && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Partial 24h data: {formatHours(coverage.requestedSpanMs * coverage.coverageRatio)} covered,{' '}
            {formatHours(coverage.requestedSpanMs - (coverage.requestedSpanMs * coverage.coverageRatio))} missing
            (most recent gap {formatHours(coverage.tailGapMs)})
          </span>
        </div>
      )}

      {/* Chart Section - Fixed Height */}
      <div className="relative h-80 w-full">
        <canvas ref={canvasRef} className="h-full w-full" />
        {showNoDataCard && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-background/85 px-4 text-center text-sm text-muted-foreground">
            No data in selected window yet. Waiting for live updates.
          </div>
        )}
      </div>

      {/* Stats Panel - Collapsible */}
      {hasStatsData && (
        <div className="border-t border-border/60 pt-4">
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
            sigma={limits.sigma ?? 0}
            method={series.limits?.method || ''}
            dataPoints={initialData.map(p => ({
              ts: new Date(p.x).toISOString(),
              value: p.y
            }))}
          />
        </div>
      )}
    </section>
  )
})
