import { inferSpcCoverage } from '@/utils/spcCoverage'
import type { SpcSeriesResponse } from '@/types/api'

const DEFAULT_SPC_SERIES_LIMIT = 240
const MIN_SPC_SERIES_LIMIT = 20
const LONG_WINDOWS = ['last_6h', 'last_24h', 'last_3d', 'last_7d'] as const
const RAW_FALLBACK_MIN_POINTS = 10
const RAW_FALLBACK_MAX_LIMIT_RATIO = 0.2
const RAW_FALLBACK_MIN_COVERAGE_IMPROVEMENT = 0.05

export const MIN_24H_COVERAGE_RATIO = 0.8

type FallbackInput = {
  response: SpcSeriesResponse
  preferredDownsample: string
  requestedLimit: number
  currentWindow: string
}

type NoDataCardInput = {
  loading: boolean
  dataLoaded: boolean
  error: string | null
  historyHadNoData: boolean
  hasVisibleData: boolean
}

function inferCoverage(response: SpcSeriesResponse) {
  return inferSpcCoverage({
    window: response.window,
    series: response.series,
    coverage: response.coverage ?? null,
  })
}

export function resolveSpcSeriesLimit(rawValue: string | undefined): number {
  const configured = Number(rawValue)
  if (!Number.isFinite(configured)) {
    return DEFAULT_SPC_SERIES_LIMIT
  }

  return Math.max(Math.floor(configured), MIN_SPC_SERIES_LIMIT)
}

export function formatHours(ms: number): string {
  return `${(ms / (60 * 60 * 1000)).toFixed(1)}h`
}

export function shouldAttemptRawFallback({
  response,
  preferredDownsample,
  requestedLimit,
  currentWindow,
}: FallbackInput): boolean {
  if (!LONG_WINDOWS.includes(currentWindow as (typeof LONG_WINDOWS)[number])) {
    return false
  }

  if (preferredDownsample === 'none') {
    return false
  }

  if (response.sampling?.downsample === 'none') {
    return false
  }

  const coverage = inferCoverage(response)
  if (!coverage || coverage.coverageRatio >= MIN_24H_COVERAGE_RATIO) {
    return false
  }

  const threshold = Math.max(
    RAW_FALLBACK_MIN_POINTS,
    Math.floor(requestedLimit * RAW_FALLBACK_MAX_LIMIT_RATIO),
  )
  return response.sampling.returned < threshold
}

export function pickBetterSeriesResponse(
  primary: SpcSeriesResponse,
  rawFallback: SpcSeriesResponse,
): SpcSeriesResponse {
  if (!rawFallback.series?.length) {
    return primary
  }

  const primaryCoverage = inferCoverage(primary)
  const rawCoverage = inferCoverage(rawFallback)
  const hasMaterialCountGain =
    rawFallback.sampling.returned > Math.max(primary.sampling.returned * 1.5, primary.sampling.returned + 5)
  const hasMaterialCoverageGain =
    !!primaryCoverage &&
    !!rawCoverage &&
    rawCoverage.coverageRatio > primaryCoverage.coverageRatio + RAW_FALLBACK_MIN_COVERAGE_IMPROVEMENT

  if (hasMaterialCountGain || hasMaterialCoverageGain) {
    return rawFallback
  }

  return primary
}

export function shouldShowNoDataCard({
  loading,
  dataLoaded,
  error,
  historyHadNoData,
  hasVisibleData,
}: NoDataCardInput): boolean {
  if (loading || !dataLoaded || !!error) {
    return false
  }

  return historyHadNoData && !hasVisibleData
}
