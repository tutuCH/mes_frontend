import { describe, expect, it, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import inventoryReducer, { fetchInventorySummary } from '@/store/slices/inventorySlice'
import { __resetInventoryMocks } from '@/services/inventoryService'

function createStore() {
  return configureStore({
    reducer: {
      inventory: inventoryReducer,
    },
  })
}

describe('inventorySlice', () => {
  beforeEach(() => {
    __resetInventoryMocks()
  })

  it('starts with empty lists and idle loading flags', () => {
    const store = createStore()
    const state = store.getState().inventory

    expect(state.materials).toEqual([])
    expect(state.lots).toEqual([])
    expect(state.assignments).toEqual([])
    expect(state.summary).toEqual([])
    expect(state.loading.summary).toBe(false)
  })

  it('loads inventory summary via thunk', async () => {
    const store = createStore()

    await store.dispatch(fetchInventorySummary())

    const state = store.getState().inventory
    expect(state.summary.length).toBeGreaterThan(0)
    expect(state.loading.summary).toBe(false)
  })
})
