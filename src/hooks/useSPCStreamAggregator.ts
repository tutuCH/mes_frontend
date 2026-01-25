/**
 * useSPCStreamAggregator Hook
 * Aggregates real-time SPC and realtime data from WebSocket events
 * Maintains a sliding window buffer for chart rendering
 */

import { useEffect, useRef, useCallback } from 'react'
import { socketService } from '@/services/socket'
import { normalizeRealtimeData, normalizeSPCData } from '@/utils/fieldMapping'
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

const MAX_BUFFER_SIZE = 300 // Maximum data points to keep (sliding window)
const SPC_DEBUG = true

/**
 * Hook to aggregate real-time data from WebSocket for a specific field
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

  // Add data point to buffer (sliding window)
  const addDataPoint = useCallback(
    (point: DataPoint) => {
      if (isPaused) return

      const buffer = dataBufferRef.current
      const beforeLength = buffer.length

      // Enforce monotonic timestamps - only append if new timestamp is greater than last
      const lastPoint = buffer[buffer.length - 1]
      if (lastPoint && point.x <= lastPoint.x) {
        // Drop out-of-order point to prevent line connection issues
        console.warn(`[SPC] Dropping out-of-order point for field "${field}": new x=${point.x} <= last x=${lastPoint.x}`)
        return
      }

      const didShift = buffer.length >= maxPoints
      if (didShift) {
        buffer.shift()
      }

      buffer.push(point)

      if (SPC_DEBUG) {
        const firstPoint = buffer[0]
        const latestPoint = buffer[buffer.length - 1]
        console.log('[SPC-DEBUG] buffer update', {
          deviceId,
          field,
          dataSource,
          beforeLength,
          afterLength: buffer.length,
          maxPoints,
          shifted: didShift,
          firstX: firstPoint?.x,
          lastX: latestPoint?.x,
        })
      }

      // Notify parent with new array reference to force Chart.js to detect changes
      // Option A1: Spread creates new reference, JavaScript GC handles cleanup
      if (onDataUpdate) {
        const snapshot = [...dataBufferRef.current]
        if (SPC_DEBUG) {
          ;(snapshot as any)._spcDebug = true
        }
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

      if (SPC_DEBUG) {
        const firstPoint = dataBufferRef.current[0]
        const lastPoint = dataBufferRef.current[dataBufferRef.current.length - 1]
        console.log('[SPC-DEBUG] buffer init', {
          deviceId,
          field,
          dataSource,
          length: dataBufferRef.current.length,
          firstX: firstPoint?.x,
          lastX: lastPoint?.x,
        })
      }

      if (onDataUpdate) {
        const snapshot = [...dataBufferRef.current]
        if (SPC_DEBUG) {
          ;(snapshot as any)._spcDebug = true
        }
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

        if (typeof value === 'number' && !isNaN(value)) {
          addDataPoint({
            x: new Date(event.timestamp).getTime(),
            y: value,
          })
        }
      } catch (error) {
        console.warn('[SPC] Error processing realtime update:', error)
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

        if (typeof value === 'number' && !isNaN(value)) {
          addDataPoint({
            x: new Date(event.timestamp).getTime(),
            y: value,
          })
        }
      } catch (error) {
        console.warn('[SPC] Error processing SPC update:', error)
      }
    },
    [deviceId, field, dataSource, addDataPoint]
  )

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!deviceId || isSubscribedRef.current) return

    // Subscribe to machine
    socketService.subscribeToMachine(deviceId)
    isSubscribedRef.current = true

    // Listen for updates
    socketService.on('realtime-update', handleRealtimeUpdate)
    socketService.on('spc-update', handleSPCUpdate)

    // Cleanup
    return () => {
      socketService.off('realtime-update', handleRealtimeUpdate)
      socketService.off('spc-update', handleSPCUpdate)
      socketService.unsubscribeFromMachine(deviceId)
      isSubscribedRef.current = false
    }
  }, [deviceId, handleRealtimeUpdate, handleSPCUpdate])

  // Clear buffer when device or field changes
  useEffect(() => {
    dataBufferRef.current = []
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
