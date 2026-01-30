import { useEffect, useRef } from 'react'
import { AlertsStreamCoordinator, type AlertsEventKey } from '@/services/alertsStreamCoordinator'
import { sseService } from '@/services/sse'

type AlertsPayload = Parameters<typeof sseService.receiveExternalEvent>[1]

export function useAlertsStreamCoordinator() {
  const coordinatorRef = useRef<AlertsStreamCoordinator | null>(null)

  useEffect(() => {
    const coordinator = new AlertsStreamCoordinator({
      setAlertsEnabled: (enabled) => sseService.setAlertsEnabled(enabled),
      onAlertsEvent: (callback) => sseService.onAlertsEvent((eventName, payload) => {
        callback(eventName as AlertsEventKey, payload)
      }),
      receiveExternalEvent: (eventName, payload) => sseService.receiveExternalEvent(eventName, payload as AlertsPayload),
    })

    coordinatorRef.current = coordinator
    coordinator.start()

    const notify = () => coordinator.notifyUserInteraction()

    window.addEventListener('pointerdown', notify, { passive: true })
    window.addEventListener('keydown', notify)
    window.addEventListener('focus', notify)

    return () => {
      window.removeEventListener('pointerdown', notify)
      window.removeEventListener('keydown', notify)
      window.removeEventListener('focus', notify)
      coordinator.stop()
      coordinatorRef.current = null
    }
  }, [])
}
