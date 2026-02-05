import type { ReactNode } from 'react'
import { useAlertsStreamCoordinator } from '@/hooks/useAlertsStreamCoordinator'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { useInventoryState } from '@/hooks/useInventoryState'

/**
 * GlobalSSEManager
 *
 * This component ensures the SSE connection is established once and persists
 * across the entire application, regardless of route changes.
 *
 * Key behaviors:
 * - Connects to the stream on mount
 * - Fetches and subscribes to all machines
 * - Does NOT disconnect on unmount (connection persists across navigation)
 * - Handles stream events for realtime updates
 */
export function GlobalSSEManager({ children }: { children: ReactNode }) {
  useAlertsStreamCoordinator()
  // Initialize stream connection and fetch machines
  // This will run once when the app starts and persist across all pages
  useRealtimeData()
  useInventoryState()

  return <>{children}</>
}
