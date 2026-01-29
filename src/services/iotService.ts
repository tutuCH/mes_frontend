import { api } from './api'
import type { ParsedIoTMessage } from '@/types/iot'
import { createLogger } from '@/utils/logger'

const logger = createLogger('iotService')

export const fetchIoTMessages = async (): Promise<ParsedIoTMessage[]> => {
  try {
    // 1. Get all machines
    const factories = await api.getFactoriesAndMachines()
    const allMachines = factories.flatMap((f: any) => f.machines || [])

    // 2. Fetch history for each machine (limiting to last 1 hour for performance)
    const promises = allMachines.map(async (machine: any) => {
      try {
        // Fetch both realtime and SPC data
        const [realtimeRes, spcRes] = await Promise.all([
          api.getRealtimeHistory(machine.machineId, { limit: 50 }),
          api.getSPCHistory(machine.machineId, { limit: 50 })
        ])

        const realtimeMsgs = (realtimeRes.data || []).map((item: any) => transformToIoTMessage(item, 'realtime'))
        const spcMsgs = (spcRes.data || []).map((item: any) => transformToIoTMessage(item, 'spc'))

        return [...realtimeMsgs, ...spcMsgs]
      } catch (e) {
        logger.warn(`Failed to fetch history for machine ${machine.machineId}`, e)
        return []
      }
    })

    const results = await Promise.all(promises)
    return results.flat().sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  } catch (error) {
    logger.error('Error fetching IoT messages from backend:', error)
    // Fallback to empty array or re-throw depending on requirements. 
    // For now, let's return empty array to avoid breaking the UI completely if backend is down.
    return [] 
  }
}

function transformToIoTMessage(backendItem: any, type: string): ParsedIoTMessage {
  // Backend returns flattened data. We need to reconstruct the "payload" 
  // to match the ParsedIoTMessage interface which expects a payload object.
  
  const { time, devId, topic, ...rest } = backendItem

  return {
    deviceId: devId || 'Unknown',
    ts: time,
    msgType: type,
    topic: topic || `/${type}`,
    qos: '0', // Default
    retain: 'false', // Default
    payload: rest // Treat the rest of the fields as the payload
  }
}
