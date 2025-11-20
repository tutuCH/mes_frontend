export interface MachineState {
  id: string
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
