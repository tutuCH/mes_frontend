import type { DataPoint } from '@/hooks/useSPCStreamAggregator'
import type { SpcSeriesPoint } from '@/types/api'

type TransformInput = {
  series: SpcSeriesPoint[]
  intervalMs: number | null
  windowEndMs: number
}

const STALE_INTERVAL_MULTIPLIER = 2

export function mapSeriesToChartPoints({ series, intervalMs, windowEndMs }: TransformInput): DataPoint[] {
  return series.map((point, index) => {
    const base = Date.parse(point.ts)

    if (!Number.isFinite(base) || !intervalMs) {
      return { x: base, y: point.value }
    }

    const bucketEnd = base + intervalMs
    const isLast = index === series.length - 1

    if (isLast) {
      const gap = windowEndMs - base
      if (gap <= intervalMs * STALE_INTERVAL_MULTIPLIER) {
        return { x: windowEndMs, y: point.value }
      }
    }

    return { x: bucketEnd, y: point.value }
  })
}
