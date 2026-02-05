import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import inventoryReducer from '@/store/slices/inventorySlice'
import { __resetInventoryMocks } from '@/services/inventoryService'
import { useInventoryState } from '@/hooks/useInventoryState'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function createStore() {
  return configureStore({
    reducer: {
      inventory: inventoryReducer,
    },
  })
}

function Harness() {
  const { summary } = useInventoryState()
  return <div data-testid="summary">summary:{summary.length}</div>
}

async function waitForCondition(condition: () => boolean, timeout = 1000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (condition()) return
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error('Timed out waiting for condition')
}

describe('useInventoryState', () => {
  beforeEach(() => {
    __resetInventoryMocks()
  })

  it('loads inventory summary on mount', async () => {
    const store = createStore()
    const container = document.createElement('div')
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <Provider store={store}>
          <Harness />
        </Provider>
      )
    })

    await waitForCondition(() => container.textContent?.includes('summary:3') ?? false)

    expect(container.textContent).toContain('summary:3')

    await act(async () => {
      root.unmount()
    })
  })
})
