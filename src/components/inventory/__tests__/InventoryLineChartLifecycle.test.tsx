import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { InventoryLineChart } from '@/components/inventory/charts/InventoryLineChart'

const mocks = vi.hoisted(() => ({
  destroyExisting: vi.fn(),
  getChartMock: vi.fn(),
}))

vi.mock('@/lib/chartConfig', () => {
  class MockChart {
    static getChart = mocks.getChartMock
    constructor() {}
    destroy() {}
  }

  return {
    ChartJS: MockChart,
    defaultChartOptions: {},
  }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('InventoryLineChart lifecycle', () => {
  it('destroys existing chart before reusing canvas', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    mocks.getChartMock.mockReturnValueOnce(null)
    await act(async () => {
      root.render(
        <InventoryLineChart
          points={[{ timestamp: new Date().toISOString(), consumedKg: 10 }]}
        />
      )
    })

    mocks.getChartMock.mockReturnValueOnce({ destroy: mocks.destroyExisting })
    await act(async () => {
      root.render(
        <InventoryLineChart
          points={[{ timestamp: new Date().toISOString(), consumedKg: 20 }]}
        />
      )
    })

    expect(mocks.destroyExisting).toHaveBeenCalled()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
