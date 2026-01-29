import { useEffect, useCallback } from 'react'
import { sseService } from '@/services/sse'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { MachineAlertEvent } from '@/types/api'

/**
 * Hook to handle machine-alert events from the stream.
 * Displays toast notifications for alerts and updates the UI.
 *
 * Call this hook in components that need to show machine alerts.
 */
export function useMachineAlerts() {
  const { t } = useTranslation()

  const handleMachineAlert = useCallback((payload: MachineAlertEvent) => {
    const { deviceId, alertType, message } = payload

    // Map alertType to toast variant
    if (alertType === 'critical') {
      toast.error(`${t('machine.name')}: ${deviceId}`, {
        description: message,
        duration: 10000
      })
    } else if (alertType === 'warning') {
      toast.warning(`${t('machine.name')}: ${deviceId}`, {
        description: message,
        duration: 5000
      })
    } else {
      toast.info(`${t('machine.name')}: ${deviceId}`, {
        description: message,
        duration: 3000
      })
    }
  }, [t])

  useEffect(() => {
    sseService.on('machine-alert', handleMachineAlert)
    return () => sseService.off('machine-alert', handleMachineAlert)
  }, [handleMachineAlert])
}
