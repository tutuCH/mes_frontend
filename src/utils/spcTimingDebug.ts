import type { SpcSeriesResponse } from '@/types/api'

type SeriesTimingInput = {
  window: string
  sampling?: SpcSeriesResponse['sampling']
  series: Array<{ ts: string; value: number }>
}

export function summarizeSeriesTiming(input: SeriesTimingInput) {
  const last = input.series[input.series.length - 1]
  const lastRaw = last?.ts ?? null
  const lastEpochMs = lastRaw ? Date.parse(lastRaw) : null

  return {
    window: input.window,
    sampling: input.sampling,
    lastRaw,
    lastEpochMs,
    count: input.series.length,
  }
}

type LiveTimingInput = {
  lastHistoricX: number | null
  liveX: number
  source: string
  raw: unknown
}

export function summarizeLiveTiming(input: LiveTimingInput) {
  const deltaMs = input.lastHistoricX === null ? null : input.liveX - input.lastHistoricX
  const deltaMinutes = deltaMs === null ? null : Math.round((deltaMs / 60000) * 100) / 100

  return {
    source: input.source,
    raw: input.raw,
    liveX: input.liveX,
    lastHistoricX: input.lastHistoricX,
    deltaMs,
    deltaMinutes,
  }
}
