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

describe('InventoryDashboard', () => {
  beforeEach(() => {
    __resetInventoryMocks()
  })

  it('renders inventory summary rows', async () => {
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

    await waitForCondition(() => container.textContent?.includes('ABS') ?? false)

    const rows = container.querySelectorAll('[data-testid^="inventory-row-"]')
    expect(rows.length).toBeGreaterThan(0)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('edits a material name inline', async () => {
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

    await waitForCondition(() => container.textContent?.includes('ABS') ?? false)

    const editButton = container.querySelector('[data-testid="inventory-edit-mat_001"]')
    expect(editButton).toBeTruthy()
    await act(async () => {
      ;(editButton as HTMLButtonElement | null)?.click()
    })

    // console.log('After edit click:', container.innerHTML)

    await waitForCondition(() => !!container.querySelector('[data-testid="material-name-input"]'))

    const nameInput = container.querySelector('[data-testid="material-name-input"]') as HTMLInputElement | null
    expect(nameInput).toBeTruthy()
    if (nameInput) {
      await act(async () => {
        setNativeValue(nameInput, 'ABS Prime')
      })
    }

    const saveButton = container.querySelector('[data-testid="inventory-save-mat_001"]')
    expect(saveButton).toBeTruthy()
    await act(async () => {
      ;(saveButton as HTMLButtonElement | null)?.click()
    })

    await waitForCondition(() => container.textContent?.includes('ABS Prime') ?? false)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('adds a new material via dialog', async () => {
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

    const addButton = container.querySelector('[data-testid="inventory-add-material"]')
    expect(addButton).toBeTruthy()
    await act(async () => {
      ;(addButton as HTMLButtonElement | null)?.click()
    })

    // console.log('After add click:', document.body.innerHTML)

    await waitForCondition(() => !!document.querySelector('[data-testid="material-dialog-name"]'))

    const nameInput = document.querySelector('[data-testid="material-dialog-name"]') as HTMLInputElement | null
    expect(nameInput).toBeTruthy()
    if (nameInput) {
      await act(async () => {
        setNativeValue(nameInput, 'Nylon')
      })
    }

    const typeSelect = document.querySelector('[data-testid="material-dialog-type"]') as HTMLSelectElement | null
    expect(typeSelect).toBeTruthy()
    if (typeSelect) {
      await act(async () => {
        setNativeValue(typeSelect, 'virgin')
      })
    }

    const createButton = document.querySelector('[data-testid="material-dialog-submit"]')
    expect(createButton).toBeTruthy()
    await act(async () => {
      ;(createButton as HTMLButtonElement | null)?.click()
    })

    await waitForCondition(() => container.textContent?.includes('Nylon') ?? false)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
