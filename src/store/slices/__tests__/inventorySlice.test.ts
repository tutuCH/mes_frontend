import { describe, expect, it, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import inventoryReducer, {
  fetchInventorySummary,
  createMaterialAssignment,
  updateMaterialAssignment,
  fetchInventoryTrend,
} from '@/store/slices/inventorySlice'
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

  it('creates and updates material assignments via thunks', async () => {
    const store = createStore()

    const created = await store.dispatch(createMaterialAssignment({
      machineId: 4,
      materialId: 'mat_001',
      activeLotId: 'lot_001',
      shotWeightG: 120,
      scrapPercent: 0.02,
      cavities: 1,
      effectiveAt: new Date().toISOString(),
    })).unwrap()

    expect(store.getState().inventory.assignments.find(item => item.assignmentId === created.assignmentId)).toBeTruthy()

    const updated = await store.dispatch(updateMaterialAssignment({
      assignmentId: created.assignmentId,
      patch: { activeLotId: null, cavities: 3 },
    })).unwrap()

    expect(updated.activeLotId).toBeNull()
    expect(updated.cavities).toBe(3)
  })

  it('loads inventory trend via thunk', async () => {
    const store = createStore()

    await store.dispatch(fetchInventoryTrend())
    const state = store.getState().inventory
    expect(state.inventoryTrend.length).toBeGreaterThan(0)
  })
})
