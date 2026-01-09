export interface MachineState {
  id: string              // Internal Redux key (e.g., "1")
  deviceId: string        // Backend device_id for WebSocket mapping (e.g., "postgres machine 1")
  name: string
  status: 'running' | 'idle' | 'alarm' | 'offline'
  opMode: 'manual' | 'semi-auto' | 'auto'
  cycleTime: number
  cycleCount: number
  efficiency: number
  temperature: number
  oilTemp: number
  lastUpdate: string
}
