import type { SpcSeriesCoverage, SpcSeriesPoint, SpcSeriesWindow } from '@/types/api'

type CoverageInput = {
  window?: Pick<SpcSeriesWindow, 'start' | 'end'> | null
  series?: SpcSeriesPoint[] | null
  coverage?: SpcSeriesCoverage | null
}

type WarnInput = {
  coverage: SpcSeriesCoverage | null
  minCoverageRatio?: number
  intervalMs?: number | null
}

const DEFAULT_MIN_COVERAGE_RATIO = 0.8
const MIN_GAP_INTERVAL_MULTIPLIER = 2

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function inferSpcCoverage({
  window,
  series = [],
  coverage,
}: CoverageInput): SpcSeriesCoverage | null {
  if (coverage) {
    return coverage
  }

  const windowStartMs = Date.parse(window?.start ?? '')
  const windowEndMs = Date.parse(window?.end ?? '')
  if (!Number.isFinite(windowStartMs) || !Number.isFinite(windowEndMs) || windowEndMs <= windowStartMs) {
    return null
  }

  const validSeries = (series ?? [])
    .map((point) => ({
      ts: point.ts,
      ms: Date.parse(point.ts),
    }))
    .filter((point) => Number.isFinite(point.ms))
    .sort((a, b) => a.ms - b.ms)

  const requestedSpanMs = windowEndMs - windowStartMs

  if (validSeries.length === 0) {
    return {
      firstTs: null,
      lastTs: null,
      requestedSpanMs,
      observedSpanMs: 0,
      headGapMs: requestedSpanMs,
      tailGapMs: requestedSpanMs,
      coverageRatio: 0,
      isPartial: true,
    }
  }

  const first = validSeries[0]
  const last = validSeries[validSeries.length - 1]

  const headGapMs = Math.max(first.ms - windowStartMs, 0)
  const tailGapMs = Math.max(windowEndMs - last.ms, 0)
  const observedSpanMs = validSeries.length > 1 ? Math.max(last.ms - first.ms, 0) : 0
  const effectiveCoveredSpanMs = Math.max(requestedSpanMs - headGapMs - tailGapMs, 0)
  const coverageRatio = requestedSpanMs > 0 ? clamp01(effectiveCoveredSpanMs / requestedSpanMs) : 1

  return {
    firstTs: first.ts,
    lastTs: last.ts,
    requestedSpanMs,
    observedSpanMs,
    headGapMs,
    tailGapMs,
    coverageRatio,
    isPartial: coverageRatio < 1,
  }
}

export function shouldWarnPartialCoverage({
  coverage,
  minCoverageRatio = DEFAULT_MIN_COVERAGE_RATIO,
  intervalMs,
}: WarnInput): boolean {
  if (!coverage) {
    return false
  }

  if (coverage.coverageRatio < minCoverageRatio) {
    return true
  }

  if (intervalMs && Number.isFinite(intervalMs)) {
    return coverage.tailGapMs > intervalMs * MIN_GAP_INTERVAL_MULTIPLIER
  }

  return false
}
