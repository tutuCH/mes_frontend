import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { api } from '@/services/api'
import type { Factory, CreateFactoryRequest, UpdateFactoryRequest } from '@/types/api'

/**
 * WebSocket event data types
 */
export interface RealtimeUpdateEvent {
  devId: string
  topic: 'realtime'
  timestamp: number
  Data: {
    STS: number
    OT?: number
    OPM?: number
    T1?: number
    T2?: number
    T3?: number
    T4?: number
    T5?: number
    T6?: number
    T7?: number
  }
}

export interface SPCUpdateEvent {
  devId: string
  topic: 'spc'
  timestamp: number
  Data: {
    CYCN?: number
    ECYCT?: number
  }
}

interface FactoriesState {
  factories: Factory[]
  selectedFactory: Factory | null
  loading: boolean
  error: string | null
  // WebSocket state
  websocketStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  realtimeEventCount: number
  spcEventCount: number
  lastRealtimeData: RealtimeUpdateEvent | null
  lastSpcData: SPCUpdateEvent | null
  subscribedMachines: string[]
  websocketError: string | null
}

const initialState: FactoriesState = {
  factories: [],
  selectedFactory: null,
  loading: false,
  error: null,
  // WebSocket state
  websocketStatus: 'disconnected',
  realtimeEventCount: 0,
  spcEventCount: 0,
  lastRealtimeData: null,
  lastSpcData: null,
  subscribedMachines: [],
  websocketError: null,
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
    // WebSocket actions
    setWebSocketStatus: (state, action: PayloadAction<'connecting' | 'connected' | 'disconnected' | 'error'>) => {
      state.websocketStatus = action.payload
    },
    incrementRealtimeCount: (state) => {
      state.realtimeEventCount += 1
    },
    incrementSpcCount: (state) => {
      state.spcEventCount += 1
    },
    setLastRealtime: (state, action: PayloadAction<RealtimeUpdateEvent>) => {
      state.lastRealtimeData = action.payload
    },
    setLastSpc: (state, action: PayloadAction<SPCUpdateEvent>) => {
      state.lastSpcData = action.payload
    },
    addSubscribedMachine: (state, action: PayloadAction<string>) => {
      const deviceId = action.payload
      if (!state.subscribedMachines.includes(deviceId)) {
        state.subscribedMachines.push(deviceId)
      }
    },
    removeSubscribedMachine: (state, action: PayloadAction<string>) => {
      state.subscribedMachines = state.subscribedMachines.filter(id => id !== action.payload)
    },
    setWebSocketError: (state, action: PayloadAction<string | null>) => {
      state.websocketError = action.payload
    },
    resetWebSocketCounts: (state) => {
      state.realtimeEventCount = 0
      state.spcEventCount = 0
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

export const {
  setSelectedFactory,
  clearFactoryError,
  setWebSocketStatus,
  incrementRealtimeCount,
  incrementSpcCount,
  setLastRealtime,
  setLastSpc,
  addSubscribedMachine,
  removeSubscribedMachine,
  setWebSocketError,
  resetWebSocketCounts,
} = factorySlice.actions

export default factorySlice.reducer
