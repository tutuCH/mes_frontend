import { describe, expect, it, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import inventoryReducer, {
  fetchInventorySummary,
  fetchInventoryTrend,
  fetchMaterialAssignments,
  createMaterialAssignment,
  updateMaterialAssignment,
  deleteMaterialAssignment,
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
    expect(state.trend).toEqual([])
    expect(state.loading.summary).toBe(false)
  })

  it('loads inventory summary via thunk', async () => {
    const store = createStore()

    await store.dispatch(fetchInventorySummary())

    const state = store.getState().inventory
    expect(state.summary.length).toBeGreaterThan(0)
    expect(state.loading.summary).toBe(false)
  })

  it('loads inventory trend via thunk', async () => {
    const store = createStore()

    await store.dispatch(fetchInventoryTrend())

    const state = store.getState().inventory
    expect(state.trend.length).toBeGreaterThan(0)
    expect(state.loading.trend).toBe(false)
  })

  it('creates, updates, and deletes material assignments via thunks', async () => {
    const store = createStore()

    await store.dispatch(fetchMaterialAssignments())
    const initialCount = store.getState().inventory.assignments.length

    const created = await store.dispatch(
      createMaterialAssignment({
        machineId: 3,
        materialId: 'mat_001',
        activeLotId: 'lot_001',
        shotWeightG: 120,
        scrapPercent: 0.03,
        cavities: 2,
        effectiveAt: new Date().toISOString(),
      })
    ).unwrap()

    let state = store.getState().inventory
    expect(state.assignments.length).toBe(initialCount + 1)
    expect(state.assignments.find(a => a.assignmentId === created.assignmentId)).toBeTruthy()

    const updated = await store.dispatch(
      updateMaterialAssignment({ assignmentId: created.assignmentId, patch: { scrapPercent: 0.05 } })
    ).unwrap()

    state = store.getState().inventory
    expect(state.assignments.find(a => a.assignmentId === updated.assignmentId)?.scrapPercent).toBe(0.05)

    await store.dispatch(deleteMaterialAssignment(updated.assignmentId))
    state = store.getState().inventory
    expect(state.assignments.find(a => a.assignmentId === updated.assignmentId)).toBeUndefined()
  })
})
