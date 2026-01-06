import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { api } from '@/services/api'
import type { Factory, CreateFactoryRequest, UpdateFactoryRequest } from '@/types/api'

interface FactoriesState {
  factories: Factory[]
  selectedFactory: Factory | null
  loading: boolean
  error: string | null
}

const initialState: FactoriesState = {
  factories: [],
  selectedFactory: null,
  loading: false,
  error: null,
}

export const fetchFactories = createAsyncThunk(
  'factories/fetchFactories',
  async () => {
    return await api.getFactories()
  }
)

export const fetchFactoriesWithMachines = createAsyncThunk(
  'factories/fetchFactoriesWithMachines',
  async () => {
    return await api.getFactoriesAndMachines()
  }
)

export const fetchFactory = createAsyncThunk(
  'factories/fetchFactory',
  async (id: number) => {
    return await api.getFactory(id)
  }
)

export const createFactory = createAsyncThunk(
  'factories/createFactory',
  async (data: CreateFactoryRequest) => {
    return await api.createFactory(data)
  }
)

export const updateFactory = createAsyncThunk(
  'factories/updateFactory',
  async ({ id, data }: { id: number; data: UpdateFactoryRequest }) => {
    return await api.updateFactory(id, data)
  }
)

export const deleteFactory = createAsyncThunk(
  'factories/deleteFactory',
  async (id: number) => {
    await api.deleteFactory(id)
    return id
  }
)

const factorySlice = createSlice({
  name: 'factories',
  initialState,
  reducers: {
    setSelectedFactory: (state, action: PayloadAction<Factory | null>) => {
      state.selectedFactory = action.payload
    },
    clearFactoryError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Factories
      .addCase(fetchFactories.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFactories.fulfilled, (state, action) => {
        state.loading = false
        state.factories = action.payload
      })
      .addCase(fetchFactories.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch factories'
      })
      // Fetch Factories with Machines
      .addCase(fetchFactoriesWithMachines.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFactoriesWithMachines.fulfilled, (state, action) => {
        state.loading = false
        state.factories = action.payload
      })
      .addCase(fetchFactoriesWithMachines.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch factories'
      })
      // Fetch Single Factory
      .addCase(fetchFactory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFactory.fulfilled, (state, action) => {
        state.loading = false
        state.selectedFactory = action.payload
      })
      .addCase(fetchFactory.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch factory'
      })
      // Create Factory
      .addCase(createFactory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createFactory.fulfilled, (state, action) => {
        state.loading = false
        state.factories.push(action.payload)
      })
      .addCase(createFactory.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to create factory'
      })
      // Update Factory
      .addCase(updateFactory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateFactory.fulfilled, (state, action) => {
        state.loading = false
        const index = state.factories.findIndex(f => f.factoryId === action.payload.factoryId)
        if (index !== -1) {
          state.factories[index] = action.payload
        }
        if (state.selectedFactory?.factoryId === action.payload.factoryId) {
          state.selectedFactory = action.payload
        }
      })
      .addCase(updateFactory.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to update factory'
      })
      // Delete Factory
      .addCase(deleteFactory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteFactory.fulfilled, (state, action) => {
        state.loading = false
        state.factories = state.factories.filter(f => f.factoryId !== action.payload)
        if (state.selectedFactory?.factoryId === action.payload) {
          state.selectedFactory = null
        }
      })
      .addCase(deleteFactory.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to delete factory'
      })
  },
})

export const { setSelectedFactory, clearFactoryError } = factorySlice.actions
export default factorySlice.reducer
