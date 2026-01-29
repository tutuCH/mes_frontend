import { describe, it, expect } from 'vitest'
import { mapSeriesToChartPoints } from '@/utils/spcSeriesTransform'

describe('mapSeriesToChartPoints', () => {
  it('aligns the last bucket to window end when gap <= 1.5 intervals', () => {
    const points = mapSeriesToChartPoints({
      series: [
        { ts: '2026-01-29T21:02:57.000Z', value: 51 },
        { ts: '2026-01-29T21:17:21.259Z', value: 60 },
      ],
      intervalMs: 864000,
      windowEndMs: Date.parse('2026-01-29T21:44:20.116Z'),
    })

    expect(points[points.length - 1].x).toBe(Date.parse('2026-01-29T21:44:20.116Z'))
  })

  it('keeps bucket end when data is stale', () => {
    const points = mapSeriesToChartPoints({
      series: [{ ts: '2026-01-29T18:00:00.000Z', value: 60 }],
      intervalMs: 864000,
      windowEndMs: Date.parse('2026-01-29T21:44:20.116Z'),
    })

    expect(points[0].x).toBe(Date.parse('2026-01-29T18:00:00.000Z') + 864000)
  })

  it('uses raw timestamp when intervalMs is missing', () => {
    const points = mapSeriesToChartPoints({
      series: [{ ts: '2026-01-29T21:45:43.388Z', value: 52 }],
      intervalMs: null,
      windowEndMs: Date.parse('2026-01-29T21:46:00.000Z'),
    })

    expect(points[0].x).toBe(Date.parse('2026-01-29T21:45:43.388Z'))
  })
})
