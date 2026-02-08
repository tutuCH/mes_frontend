import { describe, expect, it } from 'vitest'

import { createDataLine, defaultChartOptions } from '@/lib/chartConfig'

describe('chartConfig', () => {
  it('uses time scale on x-axis', () => {
    expect(defaultChartOptions.scales?.x?.type).toBe('time')
  })

  it('disables parsing for datasets that provide x/y points', () => {
    const dataset = createDataLine([{ x: Date.now(), y: 1 }], 'Test')

    expect(dataset.parsing).toBe(false)
  })

  it('does not bridge NaN/null gaps in the main line', () => {
    const dataset = createDataLine([{ x: Date.now(), y: 1 }], 'Test')

    expect(dataset.spanGaps).toBe(false)
  })
})
