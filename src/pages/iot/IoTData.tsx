import { useEffect, useState, useCallback } from 'react'
import { fetchIoTMessages } from '@/services/iotService'
import { socketService } from '@/services/socket'
import { useTranslation } from 'react-i18next'
import type { ParsedIoTMessage } from '@/types/iot'
import { IoTMessageTable } from '@/components/iot/IoTMessageTable'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { AlertTriangle } from 'lucide-react'
import type { RealtimeUpdateEvent, SPCUpdateEvent } from '@/types/api'

export default function IoTData() {
  const { t } = useTranslation()
  const [data, setData] = useState<ParsedIoTMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Handle real-time WebSocket updates
  const handleRealtimeUpdate = useCallback((payload: RealtimeUpdateEvent) => {
    console.log('[IoTData] Received realtime-update:', payload)

    // Extract device_id and _time from the data object
    const deviceId = payload.data?.device_id || payload.deviceId
    const timestamp = payload.data?._time || payload.timestamp || new Date().toISOString()

    // Convert WebSocket event to ParsedIoTMessage format
    const newMessage: ParsedIoTMessage = {
      deviceId: deviceId,
      topic: payload.data?.topic || 'realtime',
      msgType: 'realtime',
      payload: payload.data || {},
      ts: timestamp,
    }

    console.log('[IoTData] Parsed message:', newMessage)

    // Add new message to the beginning of the array
    setData((prevData) => {
      // Avoid duplicates based on timestamp and deviceId
      const exists = prevData.some(
        msg => msg.deviceId === newMessage.deviceId && msg.ts === newMessage.ts
      )
      if (exists) {
        console.log('[IoTData] Duplicate message, skipping')
        return prevData
      }

      // Keep only the most recent 100 messages
      const updated = [newMessage, ...prevData]
      console.log('[IoTData] Added new message, total:', updated.length)
      return updated.slice(0, 100)
    })
  }, [])

  const handleSPCUpdate = useCallback((payload: SPCUpdateEvent) => {
    console.log('[IoTData] Received spc-update:', payload)

    // Extract device_id and _time from the data object
    const deviceId = payload.data?.device_id || payload.deviceId
    const timestamp = payload.data?._time || payload.timestamp || new Date().toISOString()

    // Convert WebSocket event to ParsedIoTMessage format
    const newMessage: ParsedIoTMessage = {
      deviceId: deviceId,
      topic: payload.data?.topic || 'spc',
      msgType: 'spc',
      payload: payload.data || {},
      ts: timestamp,
    }

    console.log('[IoTData] Parsed message:', newMessage)

    // Add new message to the beginning of the array
    setData((prevData) => {
      // Avoid duplicates
      const exists = prevData.some(
        msg => msg.deviceId === newMessage.deviceId && msg.ts === newMessage.ts
      )
      if (exists) {
        console.log('[IoTData] Duplicate message, skipping')
        return prevData
      }

      const updated = [newMessage, ...prevData]
      console.log('[IoTData] Added new message, total:', updated.length)
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
        console.log('[IoTData] Loaded', sortedMessages.length, 'initial messages')
      } catch (err) {
        console.error(err)
        setError(t('iot.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Subscribe to WebSocket events for real-time updates
    console.log('[IoTData] Subscribing to WebSocket events...')
    socketService.on('realtime-update', handleRealtimeUpdate)
    socketService.on('spc-update', handleSPCUpdate)

    return () => {
      console.log('[IoTData] Unsubscribing from WebSocket events')
      socketService.off('realtime-update', handleRealtimeUpdate)
      socketService.off('spc-update', handleSPCUpdate)
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
