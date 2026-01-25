/**
 * SPCChart Component
 * Real-time SPC chart using Chart.js with control limits
 */

import { useEffect, useRef, memo, useState, useCallback } from 'react'
import { ChartJS, defaultChartOptions, createControlLimitLine, createDataLine } from '@/lib/chartConfig'
import type { ChartOptions, ChartData } from '@/lib/chartConfig'
import { useSPCStreamAggregator, type DataPoint } from '@/hooks/useSPCStreamAggregator'
import { getFieldControlLimits, type ControlLimits } from '@/services/spcLimitsService'
import { api } from '@/services/api'
import { Loader2 } from 'lucide-react'

interface SPCChartProps {
  machineId: number | string  // Numeric ID for REST API calls
  deviceId: string  // Device name for WebSocket subscriptions
  field: string
  name: string
  unit: string
  dataSource: 'spc' | 'realtime'
  isPaused?: boolean
}

const RENDER_INTERVAL_MS = 100 // Update chart at 10 FPS
const SPC_DEBUG = true

export const SPCChart = memo(function SPCChart({
  machineId,
  deviceId,
  field,
  name,
  unit,
  dataSource,
  isPaused = false
}: SPCChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartJS<'line'> | null>(null)
  const dataRef = useRef<DataPoint[]>([])
  const limitsRef = useRef<ControlLimits | null>(null)
  const renderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const renderLoopStartedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<DataPoint[]>([])
  const [limitsLoaded, setLimitsLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Handle data updates from WebSocket
  const handleDataUpdate = useCallback((newData: DataPoint[]) => {
    dataRef.current = newData

    if (SPC_DEBUG && newData.length > 0) {
      const firstPoint = newData[0]
      const lastPoint = newData[newData.length - 1]
      console.log('[SPC-DEBUG] chart data update', {
        field,
        length: newData.length,
        firstX: firstPoint?.x,
        lastX: lastPoint?.x,
      })
    }
  }, [field])

  // Use the stream aggregator hook - capture the returned buffer
  const { dataBuffer } = useSPCStreamAggregator({
    deviceId,
    field,
    dataSource,
    initialData,
    onDataUpdate: handleDataUpdate,
    isPaused,
  })

  // Fetch historical data on mount
  useEffect(() => {
    if (!machineId || !field) return

    const fetchHistoricalData = async () => {
      try {
        const historyRes = await api.getSPCHistory(machineId, { limit: 50 })

        // Transform historical data to DataPoint format
        // Cast to Record<string, unknown>[] to handle dynamic InfluxDB metadata fields
        const rawData = historyRes.data as unknown as Record<string, unknown>[]
        const historicalPoints: DataPoint[] = rawData
          // Strip InfluxDB metadata fields BEFORE processing
          .map((item: Record<string, unknown>) => {
            // Destructure and remove InfluxDB metadata fields
            const { result, table, _start, _stop, _measurement, application, device_id, topic, ...data } = item as any
            void result; void table; void _start; void _stop; void _measurement; void application; void device_id; void topic // Mark as intentionally unused
            return data as Record<string, unknown>
          })
          .filter((item: Record<string, unknown>) => {
            // Filter to records that have the requested field
            const value = item[field]
            // Accept numbers or numeric strings
            const isValid = value !== undefined && value !== null
              && (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value))))
            return isValid
          })
          .map((item: Record<string, unknown>) => {
            const rawValue = item[field]
            // Convert to number if it's a string
            const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue))
            // Support both InfluxDB format (_time) and standard format (time)
            const timestamp = (item._time || item.time) as string

            const timestampMs = new Date(timestamp).getTime()
            // Skip if timestamp is invalid
            if (isNaN(timestampMs)) {
              return null
            }

            return {
              x: timestampMs,
              y: value
            }
          })
          .filter((point): point is DataPoint => point !== null && !isNaN(point.y))
          // Sort by timestamp to ensure chronological order (oldest first)
          .sort((a, b) => a.x - b.x)

        setInitialData(historicalPoints)
        setDataLoaded(true)
      } catch (error) {
        console.warn('Failed to fetch historical SPC data:', error)
      }
    }

    fetchHistoricalData()
  }, [machineId, field, dataSource])

  // Fetch control limits on mount
  useEffect(() => {
    let mounted = true

    const fetchLimits = async () => {
      setLoading(true)
      setError(null)

      try {
        const limits = await getFieldControlLimits(machineId, field)
        if (mounted) {
          limitsRef.current = limits
          setLimitsLoaded(true)
          setLoading(false)
          // Don't set error if limits are not available - chart will work without them
        }
      } catch (err) {
        // Chart should still work without limits, just won't show UCL/LCL/Mean lines
        console.warn(`Failed to fetch limits for ${field}:`, err)
        if (mounted) {
          limitsRef.current = null
          setLimitsLoaded(true) // Still mark as loaded so chart can initialize
          setLoading(false)
        }
      }
    }

    fetchLimits()

    return () => {
      mounted = false
    }
  }, [machineId, field])

  // Initialize chart - wait for data to be loaded
  useEffect(() => {
    if (!canvasRef.current) return
    // Use dataBuffer for initial data - new references will be provided by the aggregator
    if (!dataBuffer || dataBuffer.length === 0) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    if (SPC_DEBUG && dataBuffer.length > 0) {
      const firstPoint = dataBuffer[0]
      const lastPoint = dataBuffer[dataBuffer.length - 1]
      console.log('[SPC-DEBUG] chart init', {
        field,
        length: dataBuffer.length,
        firstX: firstPoint?.x,
        lastX: lastPoint?.x,
      })
    }

    // Create chart with initial data - new references will be provided via handleDataUpdate
    const chartData: ChartData = {
      datasets: [
        createDataLine(dataBuffer, `${name} (${unit})`),
      ],
    }

    // Initialize dataRef with initial data
    dataRef.current = dataBuffer

    // Add control limit lines if available
    if (limitsRef.current) {
      const { ucl, lcl, mean } = limitsRef.current
      void ucl; void lcl; void mean // Values used in render loop
      chartData.datasets.push(
        createControlLimitLine([], 'rgb(239, 68, 68)', 'UCL', [5, 5]), // red-500
        createControlLimitLine([], 'rgb(239, 68, 68)', 'LCL', [5, 5]), // red-500
        createControlLimitLine([], 'rgb(34, 197, 94)', 'Mean', [3, 3]) // green-500
      )
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
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [loading, limitsLoaded, dataBuffer, name, unit, field])

  // Update control limits when they load (fallback for edge cases)
  // Note: With limitsLoaded in the chart init dependencies, this is primarily defensive
  useEffect(() => {
    if (!chartRef.current || !limitsLoaded || !limitsRef.current) return

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
  }, [limitsLoaded])

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
    const prevLength = (updateChart as any)._prevLength || 0
    const lengthChanged = data.length !== prevLength

    // Update main data line - new reference triggers Chart.js change detection
    chart.data.datasets[0].data = data

    if (lengthChanged) {
      if (SPC_DEBUG && data.length > 0) {
        const firstPoint = data[0]
        const lastPoint = data[data.length - 1]
        console.log('[SPC-DEBUG] render update', {
          field,
          length: data.length,
          firstX: firstPoint?.x,
          lastX: lastPoint?.x,
        })
      }
      ;(updateChart as any)._prevLength = data.length
    }



      // Update control limit lines if available
      if (limitsRef.current && data.length > 0 && chart.data.datasets.length > 1) {
        const { ucl, lcl, mean } = limitsRef.current
        const firstX = data[0].x
        const lastX = data[data.length - 1].x

        // UCL line
        chart.data.datasets[1].data = [
          { x: firstX, y: ucl },
          { x: lastX, y: ucl },
        ]

        // LCL line
        chart.data.datasets[2].data = [
          { x: firstX, y: lcl },
          { x: lastX, y: lcl },
        ]

        // Mean line
        chart.data.datasets[3].data = [
          { x: firstX, y: mean },
          { x: lastX, y: mean },
        ]
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
  }, [dataLoaded, limitsLoaded, field])

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

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} />
    </div>
  )
})
