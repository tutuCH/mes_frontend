import { describe, it, expect } from 'vitest'
import { summarizeSeriesTiming, summarizeLiveTiming } from '@/utils/spcTimingDebug'

describe('spcTimingDebug', () => {
  it('summarizes series timing window and last point', () => {
    const summary = summarizeSeriesTiming({
      window: 'last_24h',
      sampling: { intervalMs: 864000, downsample: 'avg' },
      series: [{ ts: '2026-01-29T20:15:33.166Z', value: 55 }],
    })

    expect(summary.window).toBe('last_24h')
    expect(summary.lastRaw).toBe('2026-01-29T20:15:33.166Z')
    expect(summary.lastEpochMs).toBe(Date.parse('2026-01-29T20:15:33.166Z'))
  })

  it('summarizes live timing with source and delta', () => {
    const summary = summarizeLiveTiming({
      lastHistoricX: 1769717733166,
      liveX: 1769718548577,
      source: 'outer.timestamp',
      raw: '2026-01-29T20:29:08.577Z',
    })

    expect(summary.source).toBe('outer.timestamp')
    expect(summary.deltaMs).toBe(1769718548577 - 1769717733166)
  })
})
