import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { type MachineState } from '@/types/machine'
import { api } from '@/services/api'
import { mapToOpMode } from '@/utils/fieldMapping'

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

// Helper function to find machine by backend device_id
const findMachineByDeviceId = (state: MachinesState, deviceId: string): string | null => {
  const machineEntry = Object.entries(state.machines).find(
    ([_, m]) => m.deviceId === deviceId
  )
  return machineEntry ? machineEntry[0] : null
}

export const fetchMachines = createAsyncThunk(
  'machines/fetchMachines',
  async () => {
    const factories = await api.getFactoriesAndMachines()
    const machines: Record<string, MachineState> = {}

    // Fetch real-time data for each machine in parallel
    await Promise.all(
      factories.map(async (factory: any) => {
        await Promise.all(
          factory.machines.map(async (machine: any) => {
            // Fetch latest history data
            let historyData
            try {
              console.log(`[fetchMachines] Fetching history for machine ${machine.machineId} (${machine.machineName})`)
              const historyRes = await api.getRealtimeHistory(machine.machineId, { limit: 1 })
              historyData = historyRes.data[0]
              console.log(`[fetchMachines] History data for ${machine.machineId}:`, historyData)
            } catch (error) {
              console.warn(`[fetchMachines] Failed to fetch history for machine ${machine.machineId}:`, error)
            }

            machines[machine.machineId] = {
              id: machine.machineId.toString(),
              deviceId: machine.machineName,  // Store backend device_id for WebSocket mapping
              name: machine.machineName,
              status: machine.status,
              // Use history data if available, otherwise 0
              temperature: historyData?.temp_1 ?? 0,
              oilTemp: historyData?.oil_temp ?? 0,
              cycleTime: historyData?.cycle_time ?? 0,
              opMode: historyData?.operate_mode
                ? mapToOpMode(historyData.operate_mode)
                : 'manual',
              cycleCount: 0,
              efficiency: 0,
              lastUpdate: historyData?.time ?? new Date().toISOString()
            }

            console.log(`[fetchMachines] Initialized machine ${machine.machineId}:`, {
              id: machines[machine.machineId].id,
              deviceId: machines[machine.machineId].deviceId,
              temperature: machines[machine.machineId].temperature,
              oilTemp: machines[machine.machineId].oilTemp,
              cycleTime: machines[machine.machineId].cycleTime
            })
          })
        )
      })
    )

    return machines
  }
)

const machineSlice = createSlice({
  name: 'machines',
  initialState,
  reducers: {
    updateMachineStatus: (state, action: PayloadAction<{ deviceId?: string; id?: string; data: Partial<MachineState> }>) => {
      const { deviceId, id, data } = action.payload

      // Try deviceId first (from WebSocket), fall back to id (internal)
      const machineId = deviceId
        ? findMachineByDeviceId(state, deviceId)
        : id

      if (machineId && state.machines[machineId]) {
        state.machines[machineId] = { ...state.machines[machineId], ...data }
      } else {
        console.warn('[updateMachineStatus] Machine not found:', {
          deviceId,
          id,
          resolvedMachineId: machineId,
          availableMachineIds: Object.keys(state.machines),
          availableDeviceIds: Object.values(state.machines).map(m => m.deviceId)
        })
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
        console.log('[fetchMachines] Successfully loaded machines:', Object.keys(state.machines))
      })
      .addCase(fetchMachines.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch machines'
      })
  }
})

export const { updateMachineStatus, setMachines } = machineSlice.actions
export default machineSlice.reducer
