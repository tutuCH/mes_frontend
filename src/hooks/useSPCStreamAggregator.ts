/**
 * useSPCStreamAggregator Hook
 * Aggregates real-time SPC and realtime data from stream events
 * Maintains a sliding window buffer for chart rendering
 */

import { useEffect, useRef, useCallback } from 'react'
import { sseService } from '@/services/sse'
import { normalizeRealtimeData, normalizeSPCData } from '@/utils/fieldMapping'
import { createLogger } from '@/utils/logger'
import { summarizeLiveTiming } from '@/utils/spcTimingDebug'
import { evaluateGapDelta, selectEventTimestamp } from '@/utils/streamTimestamps'
import type { RealtimeUpdateEvent, SPCUpdateEvent } from '@/types/api'

export interface DataPoint {
  x: number // timestamp in milliseconds
  y: number // field value
}

interface StreamAggregatorOptions {
  deviceId: string
  field: string
  dataSource: 'spc' | 'realtime'
  maxPoints?: number
  initialData?: DataPoint[]  // Allow pre-seeding data
  onDataUpdate?: (data: DataPoint[]) => void
  isPaused?: boolean
}

interface StreamAggregatorReturn {
  dataBuffer: DataPoint[]  // The current buffer array (same reference throughout lifecycle)
  clearBuffer: () => void
}

const MAX_BUFFER_SIZE = 100 // Maximum data points to keep (sliding window)
const logger = createLogger('useSPCStreamAggregator')
const DEBUG_TIMING = import.meta.env.VITE_DEBUG_SPC_TIMING === 'true' ||
  (typeof window !== 'undefined' && (window as typeof window & { __SPC_DEBUG_TIMING__?: boolean }).__SPC_DEBUG_TIMING__ === true)
const GAP_WARNING_THRESHOLD_MS = 2 * 60 * 1000
const GAP_BREAK_EPSILON_MS = 1

/**
 * Hook to aggregate real-time data from the stream for a specific field
 */
export function useSPCStreamAggregator({
  deviceId,
  field,
  dataSource,
  maxPoints = MAX_BUFFER_SIZE,
  initialData,
  onDataUpdate,
  isPaused = false,
}: StreamAggregatorOptions): StreamAggregatorReturn {
  const dataBufferRef = useRef<DataPoint[]>([])
  const isSubscribedRef = useRef(false)
  const lastHistoricXRef = useRef<number | null>(null)
  const firstLiveLoggedRef = useRef(false)

  // Add data point to buffer (sliding window)
  const addDataPoint = useCallback(
    (point: DataPoint) => {
      if (isPaused) return

      const buffer = dataBufferRef.current

      // Enforce monotonic timestamps - only append if new timestamp is greater than last
      const lastPoint = buffer[buffer.length - 1]
      if (lastPoint && point.x <= lastPoint.x) {
        if (DEBUG_TIMING) {
          logger.debug('[SPC] Dropping out-of-order point', {
            field,
            newX: point.x,
            lastX: lastPoint.x,
          })
        }
        return
      }

      const didShift = buffer.length >= maxPoints
      if (didShift) {
        buffer.shift()
      }

      buffer.push(point)

      // Notify parent with new array reference to force Chart.js to detect changes
      // Option A1: Spread creates new reference, JavaScript GC handles cleanup
      if (onDataUpdate) {
        const snapshot = [...dataBufferRef.current]
        onDataUpdate(snapshot)
      }
    },
    [maxPoints, onDataUpdate, isPaused, field]
  )

  // Initialize buffer with initial data
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      // CRITICAL FIX: Use initialData directly instead of creating a copy
      // This ensures dataBufferRef.current is the SAME array reference that the chart was initialized with
      dataBufferRef.current = initialData
      lastHistoricXRef.current = initialData[initialData.length - 1].x
      firstLiveLoggedRef.current = false

      if (onDataUpdate) {
        const snapshot = [...dataBufferRef.current]
        onDataUpdate(snapshot)  // New reference
      }
    }
  }, [initialData, onDataUpdate, field])

  // Handle realtime update event
  const handleRealtimeUpdate = useCallback(
    (event: RealtimeUpdateEvent) => {
      if (event.deviceId !== deviceId || dataSource !== 'realtime') return

      try {
        const normalized = normalizeRealtimeData(event)
        const value = normalized[field as keyof typeof normalized]
        const selection = selectEventTimestamp(event, {
          sourceHint: 'realtime-update',
          debug: DEBUG_TIMING,
          logger,
        })

        if (typeof value === 'number' && !isNaN(value)) {
          const x = selection.x
          if (!Number.isFinite(x)) {
            logger.warn('[SPC] Invalid realtime timestamp', {
              field,
              source: selection.source,
              raw: selection.raw,
            })
            return
          }

          if (!firstLiveLoggedRef.current && lastHistoricXRef.current !== null) {
            const gapEval = evaluateGapDelta(lastHistoricXRef.current, x, GAP_WARNING_THRESHOLD_MS)
            if (gapEval?.shouldWarn) {
              const breakX = Math.min(x - GAP_BREAK_EPSILON_MS, lastHistoricXRef.current + GAP_BREAK_EPSILON_MS)
              if (breakX > lastHistoricXRef.current && breakX < x) {
                addDataPoint({
                  x: breakX,
                  y: Number.NaN,
                })
              }
            }

            if (DEBUG_TIMING) {
              const summary = summarizeLiveTiming({
                lastHistoricX: lastHistoricXRef.current,
                liveX: x,
                source: selection.source,
                raw: selection.raw,
              })
              logger.debug('[SPC] First live realtime point', {
                field,
                summary,
                rawEvent: event,
                point: { x, y: value },
              })
              if (gapEval?.shouldWarn) {
                logger.warn('[SPC] Large gap between history and live point', {
                  field,
                  summary,
                  thresholdMs: GAP_WARNING_THRESHOLD_MS,
                })
              }
            }

            firstLiveLoggedRef.current = true
          }

          addDataPoint({
            x,
            y: value,
          })
        }
      } catch (error) {
        logger.warn('[SPC] Error processing realtime update:', error)
      }
    },
    [deviceId, field, dataSource, addDataPoint]
  )

  // Handle SPC update event
  const handleSPCUpdate = useCallback(
    (event: SPCUpdateEvent) => {
      if (event.deviceId !== deviceId || dataSource !== 'spc') return

      try {
        const normalized = normalizeSPCData(event)
        const value = normalized[field as keyof typeof normalized]
        const selection = selectEventTimestamp(event, {
          sourceHint: 'spc-update',
          debug: DEBUG_TIMING,
          logger,
        })

        if (typeof value === 'number' && !isNaN(value)) {
          const x = selection.x
          if (!Number.isFinite(x)) {
            logger.warn('[SPC] Invalid SPC timestamp', {
              field,
              source: selection.source,
              raw: selection.raw,
            })
            return
          }

          if (!firstLiveLoggedRef.current && lastHistoricXRef.current !== null) {
            const gapEval = evaluateGapDelta(lastHistoricXRef.current, x, GAP_WARNING_THRESHOLD_MS)
            if (gapEval?.shouldWarn) {
              const breakX = Math.min(x - GAP_BREAK_EPSILON_MS, lastHistoricXRef.current + GAP_BREAK_EPSILON_MS)
              if (breakX > lastHistoricXRef.current && breakX < x) {
                addDataPoint({
                  x: breakX,
                  y: Number.NaN,
                })
              }
            }

            if (DEBUG_TIMING) {
              const summary = summarizeLiveTiming({
                lastHistoricX: lastHistoricXRef.current,
                liveX: x,
                source: selection.source,
                raw: selection.raw,
              })
              logger.debug('[SPC] First live SPC point', {
                field,
                summary,
                rawEvent: event,
                point: { x, y: value },
              })
              if (gapEval?.shouldWarn) {
                logger.warn('[SPC] Large gap between history and live point', {
                  field,
                  summary,
                  thresholdMs: GAP_WARNING_THRESHOLD_MS,
                })
              }
            }

            firstLiveLoggedRef.current = true
          }

          addDataPoint({
            x,
            y: value,
          })
        }
      } catch (error) {
        logger.warn('[SPC] Error processing SPC update:', error)
      }
    },
    [deviceId, field, dataSource, addDataPoint]
  )

  // Subscribe to stream events
  useEffect(() => {
    if (!deviceId || isSubscribedRef.current) return

    // Subscribe to machine
    const unsubscribe = sseService.subscribeToMachine(deviceId)
    if (!sseService.isSubscribed(deviceId)) return
    isSubscribedRef.current = true

    // Listen for updates
    sseService.on('realtime-update', handleRealtimeUpdate)
    sseService.on('spc-update', handleSPCUpdate)

    // Cleanup
    return () => {
      sseService.off('realtime-update', handleRealtimeUpdate)
      sseService.off('spc-update', handleSPCUpdate)
      if (isSubscribedRef.current) {
        unsubscribe()
        isSubscribedRef.current = false
      }
    }
  }, [deviceId, handleRealtimeUpdate, handleSPCUpdate])

  // Clear buffer when device, field, or time window changes
  useEffect(() => {
    dataBufferRef.current = []
    lastHistoricXRef.current = null
    firstLiveLoggedRef.current = false
    if (onDataUpdate) {
      onDataUpdate([])
    }
  }, [deviceId, field])

  return {
    dataBuffer: dataBufferRef.current,  // Return the buffer array for chart initialization
    clearBuffer: () => {
      dataBufferRef.current = []
      if (onDataUpdate) {
        onDataUpdate([])
      }
    },
  }
}
