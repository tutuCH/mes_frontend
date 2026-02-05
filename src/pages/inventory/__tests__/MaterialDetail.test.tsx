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

function setNativeValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const valueSetter =
    Object.getOwnPropertyDescriptor(element, 'value')?.set ||
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set
  if (valueSetter) {
    valueSetter.call(element, value)
  } else {
    element.value = value
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('MaterialDetail', () => {
  beforeEach(() => {
    __resetInventoryMocks()
  })

  it('renders material detail with lots and consumption', async () => {
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

    await waitForCondition(() => container.textContent?.includes('ABS') ?? false)

    const lotRows = container.querySelectorAll('[data-testid^="lot-row-"]')
    expect(lotRows.length).toBeGreaterThan(0)

    await waitForCondition(() => container.querySelector('[data-testid="consumption-count"]') !== null)

    const countNode = container.querySelector('[data-testid="consumption-count"]')
    expect(countNode?.textContent).toContain('6')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('edits and deletes lots, and adds a new lot', async () => {
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

    await waitForCondition(() => container.textContent?.includes('ABS') ?? false)

    const editButton = container.querySelector('[data-testid="lot-edit-lot_001"]')
    expect(editButton).toBeTruthy()
    await act(async () => {
      ;(editButton as HTMLButtonElement | null)?.click()
    })

    await waitForCondition(() => !!container.querySelector('[data-testid="lot-quantity-input"]'))

    const quantityInput = container.querySelector('[data-testid="lot-quantity-input"]') as HTMLInputElement | null
    expect(quantityInput).toBeTruthy()
    if (quantityInput) {
      await act(async () => {
        setNativeValue(quantityInput, '550')
      })
    }

    const saveButton = container.querySelector('[data-testid="lot-save-lot_001"]')
    expect(saveButton).toBeTruthy()
    await act(async () => {
      ;(saveButton as HTMLButtonElement | null)?.click()
    })

    await waitForCondition(() => container.textContent?.includes('550 kg') ?? false)

    const addButton = container.querySelector('[data-testid="inventory-add-lot"]')
    expect(addButton).toBeTruthy()
    await act(async () => {
      ;(addButton as HTMLButtonElement | null)?.click()
    })

    await waitForCondition(() => !!document.querySelector('[data-testid="lot-dialog-quantity"]'))

    const batchInput = document.querySelector('[data-testid="lot-dialog-batch"]') as HTMLInputElement | null
    const dialogQuantity = document.querySelector('[data-testid="lot-dialog-quantity"]') as HTMLInputElement | null
    const statusSelect = document.querySelector('[data-testid="lot-dialog-status"]') as HTMLSelectElement | null

    expect(batchInput).toBeTruthy()
    expect(dialogQuantity).toBeTruthy()
    expect(statusSelect).toBeTruthy()

    if (batchInput) {
      await act(async () => {
        setNativeValue(batchInput, 'ABS-2026-99')
      })
    }

    if (dialogQuantity) {
      await act(async () => {
        setNativeValue(dialogQuantity, '250')
      })
    }

    if (statusSelect) {
      await act(async () => {
        setNativeValue(statusSelect, 'available')
      })
    }

    const createButton = document.querySelector('[data-testid="lot-dialog-submit"]')
    expect(createButton).toBeTruthy()
    await act(async () => {
      ;(createButton as HTMLButtonElement | null)?.click()
    })

    await waitForCondition(() => container.textContent?.includes('ABS-2026-99') ?? false)

    const deleteButton = container.querySelector('[data-testid="lot-delete-lot_002"]')
    expect(deleteButton).toBeTruthy()
    await act(async () => {
      ;(deleteButton as HTMLButtonElement | null)?.click()
    })

    await waitForCondition(() => container.querySelector('[data-testid="lot-row-lot_002"]') === null)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
