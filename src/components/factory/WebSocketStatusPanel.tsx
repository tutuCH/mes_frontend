import { useSelector } from 'react-redux'
import { Activity, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type RootState } from '@/store'

export function WebSocketStatusPanel() {
  const { t } = useTranslation()
  const factories = useSelector((state: RootState) => state.factories.factories)
  const realtimeEventCount = useSelector((state: RootState) => state.factories.realtimeEventCount)
  const spcEventCount = useSelector((state: RootState) => state.factories.spcEventCount)
  const lastRealtimeData = useSelector((state: RootState) => state.factories.lastRealtimeData)
  const lastSpcData = useSelector((state: RootState) => state.factories.lastSpcData)
  const subscribedMachines = useSelector((state: RootState) => state.factories.subscribedMachines)
  const websocketError = useSelector((state: RootState) => state.factories.websocketError)

  // Collect all machine names from factories
  const allMachines = factories.flatMap(f => f.machines || [])
  const subscribedCount = subscribedMachines.length

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Event Counters - Connection status is shown in header */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-green-500" />
          <span className="text-muted-foreground">{t('factoryView.realtimeCount', { count: realtimeEventCount })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-blue-500" />
          <span className="text-muted-foreground">{t('factoryView.spcCount', { count: spcEventCount })}</span>
        </div>
      </div>

      {/* Error Alert */}
      {websocketError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-red-900">WebSocket Error</div>
            <div className="text-xs text-red-700">{websocketError}</div>
          </div>
        </div>
      )}

      {/* Debug Grid - Last Data Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Last Realtime Card */}
        {lastRealtimeData && (
          <div className="p-2 bg-green-50 rounded border border-green-200">
            <div className="text-xs font-medium text-green-900 mb-1">
              🔄 {t('factoryView.lastRealtime')} (Device {lastRealtimeData.devId})
            </div>
            <div className="text-xs text-green-700 space-y-0.5">
              <div>STS: {lastRealtimeData.Data.STS} | T1: {lastRealtimeData.Data.T1 ?? '-'}°C | OT: {lastRealtimeData.Data.OT ?? '-'}°C</div>
              <div className="text-[10px] text-green-600">
                {formatTimestamp(lastRealtimeData.timestamp)}
              </div>
            </div>
          </div>
        )}

        {/* Last SPC Card */}
        {lastSpcData && (
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <div className="text-xs font-medium text-blue-900 mb-1">
              📊 {t('factoryView.lastSpc')} (Device {lastSpcData.devId})
            </div>
            <div className="text-xs text-blue-700 space-y-0.5">
              <div>CYCN: {lastSpcData.Data.CYCN ?? '-'} | ECYCT: {lastSpcData.Data.ECYCT ?? '-'}s</div>
              <div className="text-[10px] text-blue-600">
                {formatTimestamp(lastSpcData.timestamp)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subscription List */}
      {subscribedMachines.length > 0 && (
        <div className="p-2 bg-gray-50 rounded border border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">
            🏭 {t('factoryView.factoryMachines', { count: subscribedCount })}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {subscribedMachines.map((deviceId) => {
              // Find machine name for this device ID
              const machine = allMachines.find(m => m.machineName === deviceId)
              return (
                <div key={deviceId} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2 w-2 rounded-full bg-green-500 ring-2 ring-green-200" />
                  <span className="text-gray-600 truncate">{machine?.machineName || deviceId}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
