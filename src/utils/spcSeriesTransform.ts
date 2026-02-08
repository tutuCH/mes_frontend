import type { DataPoint } from '@/hooks/useSPCStreamAggregator'
import type { SpcSeriesPoint } from '@/types/api'

type TransformInput = {
  series: SpcSeriesPoint[]
  downsample?: string | null
  intervalMs: number | null
  windowEndMs: number
  debug?: boolean
  field?: string
  logger?: {
    debug: (...args: unknown[]) => void
  }
}

const STALE_INTERVAL_MULTIPLIER = 2

export function mapSeriesToChartPoints({ 
  series, 
  downsample,
  intervalMs, 
  windowEndMs, 
  debug = false,
  field,
  logger 
}: TransformInput): DataPoint[] {
  if (debug && logger && series.length > 0) {
    logger.debug('[mapSeriesToChartPoints] Starting transformation', {
      field,
      seriesCount: series.length,
      intervalMs,
      windowEndMs: new Date(windowEndMs).toISOString(),
      firstRawTs: series[0].ts,
      lastRawTs: series[series.length - 1].ts,
    })
  }

  const result = series.map((point, index) => {
    const base = Date.parse(point.ts)

    if (!Number.isFinite(base)) {
      if (debug && logger) {
        logger.debug('[mapSeriesToChartPoints] Invalid timestamp', {
          field,
          index,
          rawTs: point.ts,
          parsed: base,
        })
      }
      return { x: base, y: point.value }
    }

    const shouldAlignByBucket = downsample === 'avg' || downsample === 'minmax'
    if (!intervalMs || !shouldAlignByBucket) {
      // Raw/non-aggregated data should keep source timestamps.
      if (debug && logger && (index === 0 || index === series.length - 1)) {
        logger.debug('[mapSeriesToChartPoints] Using raw timestamp', {
          field,
          index,
          isLast: index === series.length - 1,
          downsample,
          rawTs: point.ts,
          x: base,
          xISO: new Date(base).toISOString(),
        })
      }
      return { x: base, y: point.value }
    }

    const bucketEnd = base + intervalMs
    const isLast = index === series.length - 1

    if (isLast) {
      const gap = windowEndMs - base
      const threshold = intervalMs * STALE_INTERVAL_MULTIPLIER
      const useWindowEnd = gap <= threshold
      
      if (debug && logger) {
        logger.debug('[mapSeriesToChartPoints] Last point alignment', {
          field,
          index,
          rawTs: point.ts,
          base: new Date(base).toISOString(),
          bucketEnd: new Date(bucketEnd).toISOString(),
          windowEndMs: new Date(windowEndMs).toISOString(),
          gap,
          gapMinutes: gap / 60000,
          threshold,
          useWindowEnd,
          finalX: useWindowEnd ? windowEndMs : bucketEnd,
          finalXISO: new Date(useWindowEnd ? windowEndMs : bucketEnd).toISOString(),
        })
      }
      
      if (useWindowEnd) {
        return { x: windowEndMs, y: point.value }
      }
    }

    if (debug && logger && (index === 0 || index === series.length - 1)) {
      logger.debug('[mapSeriesToChartPoints] Point transformation', {
        field,
        index,
        isLast,
        rawTs: point.ts,
        base: new Date(base).toISOString(),
        bucketEnd: new Date(bucketEnd).toISOString(),
        value: point.value,
      })
    }

    return { x: bucketEnd, y: point.value }
  })

  if (debug && logger && result.length > 0) {
    const first = result[0]
    const last = result[result.length - 1]
    logger.debug('[mapSeriesToChartPoints] Transformation complete', {
      field,
      count: result.length,
      firstX: new Date(first.x).toISOString(),
      lastX: new Date(last.x).toISOString(),
      timeSpanMs: last.x - first.x,
      timeSpanMinutes: (last.x - first.x) / 60000,
    })
  }

  return result
}
