import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { type MachineState } from '@/types/machine'
import { api } from '@/services/api'

interface MachinesState {
  machines: Record<string, MachineState>
  loading: boolean
  error: string | null
}

const initialState: MachinesState = {
  machines: {},
  loading: false,
  error: null
}

export const fetchMachines = createAsyncThunk(
  'machines/fetchMachines',
  async () => {
    const factories = await api.getFactoriesAndMachines()
    // Flatten machines from factories
    const machines: Record<string, MachineState> = {}
    factories.forEach((factory: any) => {
      factory.machines.forEach((machine: any) => {
        machines[machine.machineId] = {
          id: machine.machineId.toString(),
          name: machine.machineName,
          status: machine.status,
          // Default values for now, will be updated by realtime data
          temperature: 0,
          cycleTime: 0,
          efficiency: 0,
          opMode: 'manual',
          cycleCount: 0,
          oilTemp: 0,
          lastUpdate: new Date().toISOString()
        }
      })
    })
    return machines
  }
)

const machineSlice = createSlice({
  name: 'machines',
  initialState,
  reducers: {
    updateMachineStatus: (state, action: PayloadAction<{ id: string; data: Partial<MachineState> }>) => {
      const { id, data } = action.payload
      if (state.machines[id]) {
        state.machines[id] = { ...state.machines[id], ...data }
      }
    },
    setMachines: (state, action: PayloadAction<Record<string, MachineState>>) => {
      state.machines = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMachines.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMachines.fulfilled, (state, action) => {
        state.loading = false
        state.machines = action.payload
      })
      .addCase(fetchMachines.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch machines'
      })
  }
})

export const { updateMachineStatus, setMachines } = machineSlice.actions
export default machineSlice.reducer
