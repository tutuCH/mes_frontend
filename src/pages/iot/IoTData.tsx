import { useEffect, useState, useCallback } from 'react'
import { fetchIoTMessages } from '@/services/iotService'
import { sseService } from '@/services/sse'
import { useTranslation } from 'react-i18next'
import type { ParsedIoTMessage } from '@/types/iot'
import { IoTMessageTable } from '@/components/iot/IoTMessageTable'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { AlertTriangle } from 'lucide-react'
import type { RealtimeUpdateEvent, SPCUpdateEvent } from '@/types/api'
import { createLogger } from '@/utils/logger'

const logger = createLogger('IoTData')

export default function IoTData() {
  const { t } = useTranslation()
  const [data, setData] = useState<ParsedIoTMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Handle real-time stream updates
  const handleRealtimeUpdate = useCallback((payload: RealtimeUpdateEvent) => {
    const rawData = (payload.data ?? {}) as Record<string, unknown>
    const deviceId = (typeof rawData.device_id === 'string' ? rawData.device_id : undefined) || payload.deviceId
    const timestamp = (typeof rawData._time === 'string' ? rawData._time : undefined)
      || payload.timestamp
      || new Date().toISOString()
    const qos = rawData.qos !== undefined ? String(rawData.qos) : '0'
    const retain = rawData.retain !== undefined ? String(rawData.retain) : 'false'
    const topic = typeof rawData.topic === 'string' ? rawData.topic : 'realtime'
    const payloadData = rawData.payload ?? (Object.keys(rawData).length > 0 ? rawData : payload.Data ?? {})

    // Convert stream event to ParsedIoTMessage format
    const newMessage: ParsedIoTMessage = {
      deviceId: deviceId,
      topic,
      msgType: 'realtime',
      payload: payloadData,
      qos,
      retain,
      ts: timestamp,
    }

    // Add new message to the beginning of the array
    setData((prevData) => {
      // Avoid duplicates based on timestamp and deviceId
      const exists = prevData.some(
        msg => msg.deviceId === newMessage.deviceId && msg.ts === newMessage.ts
      )
      if (exists) {
        return prevData
      }

      // Keep only the most recent 100 messages
      const updated = [newMessage, ...prevData]
      return updated.slice(0, 100)
    })
  }, [])

  const handleSPCUpdate = useCallback((payload: SPCUpdateEvent) => {
    const rawData = (payload.data ?? {}) as Record<string, unknown>
    const deviceId = (typeof rawData.device_id === 'string' ? rawData.device_id : undefined) || payload.deviceId
    const timestamp = (typeof rawData._time === 'string' ? rawData._time : undefined)
      || payload.timestamp
      || new Date().toISOString()
    const qos = rawData.qos !== undefined ? String(rawData.qos) : '0'
    const retain = rawData.retain !== undefined ? String(rawData.retain) : 'false'
    const topic = typeof rawData.topic === 'string' ? rawData.topic : 'spc'
    const payloadData = rawData.payload ?? (Object.keys(rawData).length > 0 ? rawData : payload.Data ?? {})

    // Convert stream event to ParsedIoTMessage format
    const newMessage: ParsedIoTMessage = {
      deviceId: deviceId,
      topic,
      msgType: 'spc',
      payload: payloadData,
      qos,
      retain,
      ts: timestamp,
    }

    // Add new message to the beginning of the array
    setData((prevData) => {
      // Avoid duplicates
      const exists = prevData.some(
        msg => msg.deviceId === newMessage.deviceId && msg.ts === newMessage.ts
      )
      if (exists) {
        return prevData
      }

      const updated = [newMessage, ...prevData]
      return updated.slice(0, 100)
    })
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const messages = await fetchIoTMessages()
        // Sort by timestamp descending
        const sortedMessages = messages.sort((a, b) =>
          new Date(b.ts).getTime() - new Date(a.ts).getTime()
        )
        setData(sortedMessages)
      } catch (err) {
        logger.error('Failed to load IoT messages', err)
        setError(t('iot.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Subscribe to stream events for real-time updates
    sseService.on('realtime-update', handleRealtimeUpdate)
    sseService.on('spc-update', handleSPCUpdate)

    return () => {
      sseService.off('realtime-update', handleRealtimeUpdate)
      sseService.off('spc-update', handleSPCUpdate)
    }
  }, [handleRealtimeUpdate, handleSPCUpdate])

  if (loading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold">{t('iot.errorLoading')}</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('iot.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('iot.subtitle')}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {t('spc.lastUpdated', { time: new Date().toLocaleTimeString() })}
        </div>
      </div>

      <IoTMessageTable data={data} />
    </div>
  )
}
