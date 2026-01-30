import { describe, expect, it } from 'vitest'
import type { SpcSeriesStats } from '@/types/api'
import { buildSpcDatasets } from '@/utils/spcChartDatasets'

const limits = { ucl: 10, lcl: 2, mean: 6, sigma: 3 }
const stats: SpcSeriesStats = {
  count: 100,
  mean: 6,
  stdDev: 1,
  min: 1,
  max: 11,
  median: 6,
  p95: 9.5,
  source: 'raw',
}

const data = [{ x: 1, y: 5 }]

describe('buildSpcDatasets', () => {
  it('returns only the data line when limits are missing', () => {
    const datasets = buildSpcDatasets({
      data,
      name: 'Cycle Time',
      unit: 's',
      limits: null,
      stats: null,
    })

    expect(datasets.map((d) => d.label)).toEqual(['Cycle Time (s)'])
  })

  it('includes control + stats lines in deterministic order', () => {
    const datasets = buildSpcDatasets({
      data,
      name: 'Cycle Time',
      unit: 's',
      limits,
      stats,
    })

    expect(datasets.map((d) => d.label)).toEqual([
      'Cycle Time (s)',
      'UCL',
      'LCL',
      'Mean',
      'P95',
      'Median',
      '+1σ',
      '-1σ',
      '+2σ',
      '-2σ',
      'Current',
    ])
  })
})
