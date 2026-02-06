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

describe('MaterialDetail', () => {
  beforeEach(() => {
    __resetInventoryMocks()
  })

  it('renders material detail with lots and consumption', async () => {
    const store = createStore()
    const container = document.createElement('div')
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

    await waitForCondition(() => container.textContent?.includes('ABS') ?? false)

    const lotRows = container.querySelectorAll('[data-testid^="lot-row-"]')
    expect(lotRows.length).toBeGreaterThan(0)

    const lotCards = container.querySelectorAll('[data-testid^="lot-card-"]')
    expect(lotCards.length).toBeGreaterThan(0)

    await waitForCondition(() => container.querySelector('[data-testid="consumption-count"]') !== null)

    const countNode = container.querySelector('[data-testid="consumption-count"]')
    expect(countNode?.textContent).toContain('6')

    await act(async () => {
      root.unmount()
    })
  })
})
