import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import '@/i18n/config'
import inventoryReducer from '@/store/slices/inventorySlice'
import machineReducer from '@/store/slices/machineSlice'
import { __resetInventoryMocks } from '@/services/inventoryService'
import InventoryDashboard from '@/pages/inventory/InventoryDashboard'

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

describe('InventoryDashboard', () => {
  beforeEach(() => {
    __resetInventoryMocks()
  })

  it('renders inventory summary rows', async () => {
    const store = createStore()
    const container = document.createElement('div')
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

    await waitForCondition(() => container.textContent?.includes('ABS') ?? false)

    const rows = container.querySelectorAll('[data-testid^="inventory-row-"]')
    expect(rows.length).toBeGreaterThan(0)

    await act(async () => {
      root.unmount()
    })
  })
})
