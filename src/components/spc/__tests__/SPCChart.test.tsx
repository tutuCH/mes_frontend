import { describe, expect, it } from 'vitest'

import type { SpcSeriesResponse } from '@/types/api'
import {
  pickBetterSeriesResponse,
  shouldAttemptRawFallback,
  shouldShowNoDataCard,
} from '@/components/spc/spcChartHelpers'

function buildResponse(overrides: Partial<SpcSeriesResponse> = {}): SpcSeriesResponse {
  return {
    machineId: 1,
    field: 'injection_time',
    unit: 'seconds',
    window: {
      mode: 'last_24h',
      start: '2026-02-06T17:03:35.111Z',
      end: '2026-02-07T17:03:35.111Z',
    },
    sampling: {
      limit: 240,
      returned: 3,
      downsample: 'avg',
      intervalMs: 864000,
    },
    series: [
      { ts: '2026-02-07T17:16:48.000Z', value: 10.01 },
      { ts: '2026-02-07T17:31:12.000Z', value: 9.9 },
      { ts: '2026-02-07T17:35:17.000Z', value: 10.85 },
    ],
    coverage: {
      firstTs: '2026-02-07T17:16:48.000Z',
      lastTs: '2026-02-07T17:35:17.000Z',
      requestedSpanMs: 24 * 60 * 60 * 1000,
      observedSpanMs: 18 * 60 * 1000,
      headGapMs: 23 * 60 * 60 * 1000,
      tailGapMs: 28 * 60 * 1000,
      coverageRatio: 0.0125,
      isPartial: true,
    },
    stats: null,
    limits: null,
    meta: {
      source: 'influxdb',
      generatedAt: '2026-02-07T17:35:20.000Z',
    },
    ...overrides,
  }
}

describe('SPCChart fallback helpers', () => {
  it('attempts raw fallback for sparse, partial long-window avg responses', () => {
    const shouldFallback = shouldAttemptRawFallback({
      response: buildResponse(),
      preferredDownsample: 'avg',
      requestedLimit: 240,
      currentWindow: 'last_24h',
    })

    expect(shouldFallback).toBe(true)
  })

  it('does not attempt fallback when long-window response is already dense', () => {
    const shouldFallback = shouldAttemptRawFallback({
      response: buildResponse({
        sampling: {
          limit: 240,
          returned: 120,
          downsample: 'avg',
          intervalMs: 360000,
        },
        coverage: {
          firstTs: '2026-02-06T18:00:00.000Z',
          lastTs: '2026-02-07T17:03:00.000Z',
          requestedSpanMs: 24 * 60 * 60 * 1000,
          observedSpanMs: 23 * 60 * 60 * 1000,
          headGapMs: 0,
          tailGapMs: 35_000,
          coverageRatio: 0.95,
          isPartial: true,
        },
      }),
      preferredDownsample: 'avg',
      requestedLimit: 240,
      currentWindow: 'last_24h',
    })

    expect(shouldFallback).toBe(false)
  })

  it('prefers raw fallback when it returns materially more points', () => {
    const primary = buildResponse()
    const rawFallback = buildResponse({
      sampling: {
        limit: 240,
        returned: 42,
        downsample: 'none',
        intervalMs: 864000,
      },
      series: Array.from({ length: 42 }, (_, index) => ({
        ts: new Date(Date.parse('2026-02-07T17:03:12.746Z') + (index * 60 * 1000)).toISOString(),
        value: 10 + index / 100,
      })),
      coverage: {
        firstTs: '2026-02-07T17:03:12.746Z',
        lastTs: '2026-02-07T17:45:12.746Z',
        requestedSpanMs: 24 * 60 * 60 * 1000,
        observedSpanMs: 42 * 60 * 1000,
        headGapMs: 23 * 60 * 60 * 1000,
        tailGapMs: 18 * 60 * 1000,
        coverageRatio: 0.029,
        isPartial: true,
      },
    })

    const selected = pickBetterSeriesResponse(primary, rawFallback)
    expect(selected.sampling.downsample).toBe('none')
    expect(selected.sampling.returned).toBe(42)
  })
})

describe('SPCChart no-data helper', () => {
  it('shows no-data card only after successful empty history load', () => {
    expect(
      shouldShowNoDataCard({
        loading: false,
        dataLoaded: true,
        error: null,
        historyHadNoData: true,
        hasVisibleData: false,
      }),
    ).toBe(true)
  })

  it('hides no-data card while loading, on error, or once data appears', () => {
    expect(
      shouldShowNoDataCard({
        loading: true,
        dataLoaded: false,
        error: null,
        historyHadNoData: true,
        hasVisibleData: false,
      }),
    ).toBe(false)

    expect(
      shouldShowNoDataCard({
        loading: false,
        dataLoaded: true,
        error: 'Failed to load',
        historyHadNoData: true,
        hasVisibleData: false,
      }),
    ).toBe(false)

    expect(
      shouldShowNoDataCard({
        loading: false,
        dataLoaded: true,
        error: null,
        historyHadNoData: true,
        hasVisibleData: true,
      }),
    ).toBe(false)
  })
})
