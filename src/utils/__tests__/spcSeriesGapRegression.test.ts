import { describe, it, expect } from 'vitest'
import { mapSeriesToChartPoints } from '@/utils/spcSeriesTransform'

describe('spc series gap regression', () => {
  it('keeps last point within interval for downsampled windows', () => {
    const windowEndMs = Date.parse('2026-01-29T21:44:20.116Z')
    const intervalMs = 864000
    const points = mapSeriesToChartPoints({
      series: [{ ts: '2026-01-29T21:17:21.259Z', value: 60 }],
      intervalMs,
      windowEndMs,
    })

    expect(windowEndMs - points[0].x).toBeLessThanOrEqual(intervalMs)
  })
})
