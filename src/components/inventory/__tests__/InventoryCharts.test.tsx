import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import '@/i18n/config'
import inventoryReducer from '@/store/slices/inventorySlice'
import machineReducer from '@/store/slices/machineSlice'
import { __resetInventoryMocks } from '@/services/inventoryService'
import { InventoryLineChart } from '@/components/inventory/charts/InventoryLineChart'
import { InventoryBarChart } from '@/components/inventory/charts/InventoryBarChart'
import { InventoryDoughnutChart } from '@/components/inventory/charts/InventoryDoughnutChart'
import InventoryDashboard from '@/pages/inventory/InventoryDashboard'
import MaterialDetail from '@/pages/inventory/MaterialDetail'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function createStore() {
  return configureStore({
    reducer: {
      inventory: inventoryReducer,
      machines: machineReducer,
    },
  })
}

async function waitForCondition(condition: () => boolean, timeout = 1000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (condition()) return
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error('Timed out waiting for condition')
}

describe('InventoryCharts', () => {
  beforeEach(() => {
    __resetInventoryMocks()
  })

  it('renders line, bar, and doughnut charts', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <div>
          <InventoryLineChart
            points={[{ timestamp: new Date().toISOString(), consumedKg: 10 }]}
            testId="inventory-line-chart"
          />
          <InventoryBarChart
            labels={['ABS', 'PP']}
            datasets={[{ label: 'Available', data: [100, 200], backgroundColor: '#38bdf8' }]}
            testId="inventory-bar-chart"
          />
          <InventoryDoughnutChart
            labels={['OK', 'Warning', 'Critical']}
            data={[2, 1, 0]}
            testId="inventory-doughnut-chart"
          />
        </div>
      )
    })

    expect(container.querySelector('[data-testid="inventory-line-chart"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="inventory-bar-chart"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="inventory-doughnut-chart"]')).toBeTruthy()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('renders inventory dashboard charts', async () => {
    const store = createStore()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <Provider store={store}>
          <MemoryRouter>
            <InventoryDashboard />
          </MemoryRouter>
        </Provider>
      )
    })

    await waitForCondition(() => container.querySelector('[data-testid="inventory-trend-chart"]') !== null)
    expect(container.querySelector('[data-testid="inventory-status-chart"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="inventory-stock-chart"]')).toBeTruthy()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('renders material detail charts', async () => {
    const store = createStore()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/inventory/mat_001']}>
            <Routes>
              <Route path="/inventory/:materialId" element={<MaterialDetail />} />
            </Routes>
          </MemoryRouter>
        </Provider>
      )
    })

    await waitForCondition(() => container.querySelector('[data-testid="material-consumption-chart"]') !== null)
    expect(container.querySelector('[data-testid="material-lot-stock-chart"]')).toBeTruthy()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
