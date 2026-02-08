import { describe, expect, it } from 'vitest'

import { inferSpcCoverage, shouldWarnPartialCoverage } from '@/utils/spcCoverage'

describe('spcCoverage', () => {
  it('infers partial coverage when tail gap is large', () => {
    const coverage = inferSpcCoverage({
      window: {
        start: '2026-02-06T17:03:35.111Z',
        end: '2026-02-07T17:03:35.111Z',
      },
      series: [
        { ts: '2026-02-06T21:00:05.740Z', value: 58.42 },
        { ts: '2026-02-06T21:58:22.797Z', value: 55.03 },
      ],
    })

    expect(coverage).not.toBeNull()
    expect(coverage?.isPartial).toBe(true)
    expect(coverage?.tailGapMs).toBeGreaterThan(18 * 60 * 60 * 1000)
    expect(coverage?.coverageRatio).toBeLessThan(0.8)
  })

  it('uses provided backend coverage when available', () => {
    const fallback = inferSpcCoverage({
      window: {
        start: '2026-02-06T17:03:35.111Z',
        end: '2026-02-07T17:03:35.111Z',
      },
      series: [],
      coverage: {
        firstTs: '2026-02-07T12:00:00.000Z',
        lastTs: '2026-02-07T17:00:00.000Z',
        requestedSpanMs: 24 * 60 * 60 * 1000,
        observedSpanMs: 5 * 60 * 60 * 1000,
        headGapMs: 19 * 60 * 60 * 1000,
        tailGapMs: 3 * 60 * 1000,
        coverageRatio: 0.21,
        isPartial: true,
      },
    })

    expect(fallback?.coverageRatio).toBe(0.21)
    expect(fallback?.tailGapMs).toBe(3 * 60 * 1000)
  })

  it('warns when coverage ratio is below threshold', () => {
    const shouldWarn = shouldWarnPartialCoverage({
      coverage: {
        firstTs: '2026-02-07T12:00:00.000Z',
        lastTs: '2026-02-07T17:00:00.000Z',
        requestedSpanMs: 24 * 60 * 60 * 1000,
        observedSpanMs: 5 * 60 * 60 * 1000,
        headGapMs: 19 * 60 * 60 * 1000,
        tailGapMs: 3 * 60 * 1000,
        coverageRatio: 0.21,
        isPartial: true,
      },
      minCoverageRatio: 0.8,
      intervalMs: 864000,
    })

    expect(shouldWarn).toBe(true)
  })
})
