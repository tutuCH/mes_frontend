import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
}))

vi.mock('chart.js', () => ({
  Chart: { register: mocks.register },
  BarElement: 'BarElement',
  CategoryScale: 'CategoryScale',
  LinearScale: 'LinearScale',
  Tooltip: 'Tooltip',
  Legend: 'Legend',
  BarController: 'BarController',
}))

describe('InventoryBarChart registration', () => {
  it('registers BarController with Chart.js', async () => {
    await import('@/components/inventory/charts/InventoryBarChart')

    const registeredArgs = mocks.register.mock.calls.flat()
    expect(registeredArgs).toContain('BarController')
  })
})
