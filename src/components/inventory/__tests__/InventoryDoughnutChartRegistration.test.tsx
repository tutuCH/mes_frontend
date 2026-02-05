import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
}))

vi.mock('chart.js', () => ({
  Chart: { register: mocks.register },
  ArcElement: 'ArcElement',
  Tooltip: 'Tooltip',
  Legend: 'Legend',
  DoughnutController: 'DoughnutController',
}))

describe('InventoryDoughnutChart registration', () => {
  it('registers DoughnutController with Chart.js', async () => {
    await import('@/components/inventory/charts/InventoryDoughnutChart')

    const registeredArgs = mocks.register.mock.calls.flat()
    expect(registeredArgs).toContain('DoughnutController')
  })
})
