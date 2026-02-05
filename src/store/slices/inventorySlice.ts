import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type {
  Material,
  MaterialType,
  InventoryLot,
  InventoryLotStatus,
  MaterialAssignment,
  MaterialSummary,
  MaterialConsumptionPoint,
} from '@/types/api'
import {
  getMaterials,
  createMaterial as createMaterialRequest,
  updateMaterial as updateMaterialRequest,
  deleteMaterial as deleteMaterialRequest,
  getInventoryLots,
  createInventoryLot as createInventoryLotRequest,
  updateInventoryLot as updateInventoryLotRequest,
  deleteInventoryLot as deleteInventoryLotRequest,
  getMaterialAssignments,
  getInventorySummary,
  getMaterialConsumption,
} from '@/services/inventoryService'

interface InventoryLoadingState {
  materials: boolean
  lots: boolean
  assignments: boolean
  summary: boolean
  consumption: Record<string, boolean>
}

interface InventoryState {
  materials: Material[]
  lots: InventoryLot[]
  assignments: MaterialAssignment[]
  summary: MaterialSummary[]
  consumptionByMaterial: Record<string, MaterialConsumptionPoint[]>
  loading: InventoryLoadingState
  error: string | null
}

const initialState: InventoryState = {
  materials: [],
  lots: [],
  assignments: [],
  summary: [],
  consumptionByMaterial: {},
  loading: {
    materials: false,
    lots: false,
    assignments: false,
    summary: false,
    consumption: {},
  },
  error: null,
}

export const fetchMaterials = createAsyncThunk('inventory/fetchMaterials', async () => {
  return await getMaterials()
})

export const createMaterial = createAsyncThunk(
  'inventory/createMaterial',
  async (input: {
    name: string
    materialType: MaterialType
    densityKgPerM3?: number
    defaultCostPerKg?: number
  }) => {
    return await createMaterialRequest(input)
  }
)

export const updateMaterial = createAsyncThunk(
  'inventory/updateMaterial',
  async ({ materialId, patch }: { materialId: string; patch: Partial<Material> }) => {
    return await updateMaterialRequest(materialId, patch)
  }
)

export const deleteMaterial = createAsyncThunk(
  'inventory/deleteMaterial',
  async (materialId: string) => {
    await deleteMaterialRequest(materialId)
    return materialId
  }
)

export const fetchInventoryLots = createAsyncThunk(
  'inventory/fetchInventoryLots',
  async (filter?: { materialId?: string; status?: InventoryLotStatus; factoryId?: number }) => {
    return await getInventoryLots(filter)
  }
)

export const createInventoryLot = createAsyncThunk(
  'inventory/createInventoryLot',
  async (input: Omit<InventoryLot, 'lotId'>) => {
    return await createInventoryLotRequest(input)
  }
)

export const updateInventoryLot = createAsyncThunk(
  'inventory/updateInventoryLot',
  async ({ lotId, patch }: { lotId: string; patch: Partial<InventoryLot> }) => {
    return await updateInventoryLotRequest(lotId, patch)
  }
)

export const deleteInventoryLot = createAsyncThunk(
  'inventory/deleteInventoryLot',
  async (lotId: string) => {
    await deleteInventoryLotRequest(lotId)
    return lotId
  }
)

export const fetchMaterialAssignments = createAsyncThunk(
  'inventory/fetchMaterialAssignments',
  async () => {
    return await getMaterialAssignments()
  }
)

export const fetchInventorySummary = createAsyncThunk(
  'inventory/fetchInventorySummary',
  async () => {
    return await getInventorySummary()
  }
)

export const fetchMaterialConsumption = createAsyncThunk(
  'inventory/fetchMaterialConsumption',
  async ({ materialId, start, end }: { materialId: string; start?: string; end?: string }) => {
    const points = await getMaterialConsumption(materialId, { start, end })
    return { materialId, points }
  }
)

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearInventoryError: (state) => {
      state.error = null
    },
    setConsumptionForMaterial: (state, action: PayloadAction<{ materialId: string; points: MaterialConsumptionPoint[] }>) => {
      state.consumptionByMaterial[action.payload.materialId] = action.payload.points
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaterials.pending, (state) => {
        state.loading.materials = true
        state.error = null
      })
      .addCase(fetchMaterials.fulfilled, (state, action) => {
        state.loading.materials = false
        state.materials = action.payload
      })
      .addCase(fetchMaterials.rejected, (state, action) => {
        state.loading.materials = false
        state.error = action.error.message || 'Failed to fetch materials'
      })
      .addCase(createMaterial.fulfilled, (state, action) => {
        state.materials.push(action.payload)
      })
      .addCase(updateMaterial.fulfilled, (state, action) => {
        const index = state.materials.findIndex(m => m.materialId === action.payload.materialId)
        if (index !== -1) {
          state.materials[index] = action.payload
        }
      })
      .addCase(deleteMaterial.fulfilled, (state, action) => {
        state.materials = state.materials.filter(m => m.materialId !== action.payload)
        state.lots = state.lots.filter(l => l.materialId !== action.payload)
      })
      .addCase(fetchInventoryLots.pending, (state) => {
        state.loading.lots = true
        state.error = null
      })
      .addCase(fetchInventoryLots.fulfilled, (state, action) => {
        state.loading.lots = false
        state.lots = action.payload
      })
      .addCase(fetchInventoryLots.rejected, (state, action) => {
        state.loading.lots = false
        state.error = action.error.message || 'Failed to fetch inventory lots'
      })
      .addCase(createInventoryLot.fulfilled, (state, action) => {
        state.lots.push(action.payload)
      })
      .addCase(updateInventoryLot.fulfilled, (state, action) => {
        const index = state.lots.findIndex(l => l.lotId === action.payload.lotId)
        if (index !== -1) {
          state.lots[index] = action.payload
        }
      })
      .addCase(deleteInventoryLot.fulfilled, (state, action) => {
        state.lots = state.lots.filter(l => l.lotId !== action.payload)
      })
      .addCase(fetchMaterialAssignments.pending, (state) => {
        state.loading.assignments = true
        state.error = null
      })
      .addCase(fetchMaterialAssignments.fulfilled, (state, action) => {
        state.loading.assignments = false
        state.assignments = action.payload
      })
      .addCase(fetchMaterialAssignments.rejected, (state, action) => {
        state.loading.assignments = false
        state.error = action.error.message || 'Failed to fetch material assignments'
      })
      .addCase(fetchInventorySummary.pending, (state) => {
        state.loading.summary = true
        state.error = null
      })
      .addCase(fetchInventorySummary.fulfilled, (state, action) => {
        state.loading.summary = false
        state.summary = action.payload
      })
      .addCase(fetchInventorySummary.rejected, (state, action) => {
        state.loading.summary = false
        state.error = action.error.message || 'Failed to fetch inventory summary'
      })
      .addCase(fetchMaterialConsumption.pending, (state, action) => {
        state.loading.consumption[action.meta.arg.materialId] = true
        state.error = null
      })
      .addCase(fetchMaterialConsumption.fulfilled, (state, action) => {
        state.loading.consumption[action.payload.materialId] = false
        state.consumptionByMaterial[action.payload.materialId] = action.payload.points
      })
      .addCase(fetchMaterialConsumption.rejected, (state, action) => {
        if (action.meta.arg.materialId) {
          state.loading.consumption[action.meta.arg.materialId] = false
        }
        state.error = action.error.message || 'Failed to fetch material consumption'
      })
  },
})

export const { clearInventoryError, setConsumptionForMaterial } = inventorySlice.actions

export default inventorySlice.reducer
