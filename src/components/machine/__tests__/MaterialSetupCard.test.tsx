import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import '@/i18n/config'
import inventoryReducer from '@/store/slices/inventorySlice'
import machineReducer from '@/store/slices/machineSlice'
import { __resetInventoryMocks } from '@/services/inventoryService'
import { MaterialSetupCard } from '@/components/machine/MaterialSetupCard'

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

describe('MaterialSetupCard', () => {
  beforeEach(() => {
    __resetInventoryMocks()
  })

  it('updates material assignment for a machine', async () => {
    const store = createStore()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <Provider store={store}>
          <MaterialSetupCard machineId={1} />
        </Provider>
      )
    })

    await waitForCondition(() => container.querySelector('[data-testid="material-setup-save"]') !== null)

    const materialSelect = container.querySelector('[data-testid="material-select"]') as HTMLSelectElement | null
    const lotSelect = container.querySelector('[data-testid="lot-select"]') as HTMLSelectElement | null
    const shotWeightInput = container.querySelector('[data-testid="shot-weight-input"]') as HTMLInputElement | null
    const scrapInput = container.querySelector('[data-testid="scrap-input"]') as HTMLInputElement | null
    const cavitiesInput = container.querySelector('[data-testid="cavities-input"]') as HTMLInputElement | null

    expect(materialSelect).toBeTruthy()
    expect(lotSelect).toBeTruthy()
    expect(shotWeightInput).toBeTruthy()
    expect(scrapInput).toBeTruthy()
    expect(cavitiesInput).toBeTruthy()

    if (materialSelect) {
      await act(async () => {
        setNativeValue(materialSelect, 'mat_002')
      })
    }

    if (lotSelect) {
      await act(async () => {
        setNativeValue(lotSelect, 'lot_003')
      })
    }

    if (shotWeightInput) {
      await act(async () => {
        setNativeValue(shotWeightInput, '110')
      })
    }

    if (scrapInput) {
      await act(async () => {
        setNativeValue(scrapInput, '5')
      })
    }

    if (cavitiesInput) {
      await act(async () => {
        setNativeValue(cavitiesInput, '2')
      })
    }

    const saveButton = container.querySelector('[data-testid="material-setup-save"]')
    expect(saveButton).toBeTruthy()
    await act(async () => {
      ;(saveButton as HTMLButtonElement | null)?.click()
    })

    await waitForCondition(() => {
      const assignment = store.getState().inventory.assignments.find(item => item.machineId === 1)
      return assignment?.materialId === 'mat_002' && assignment?.activeLotId === 'lot_003'
    })

    const assignment = store.getState().inventory.assignments.find(item => item.machineId === 1)
    expect(assignment?.shotWeightG).toBe(110)
    expect(assignment?.scrapPercent).toBeCloseTo(0.05)
    expect(assignment?.cavities).toBe(2)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
