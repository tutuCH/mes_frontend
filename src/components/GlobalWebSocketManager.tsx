import type { ReactNode } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'

/**
 * GlobalWebSocketManager
 *
 * This component ensures WebSocket connection is established once and persists
 * across the entire application, regardless of route changes.
 *
 * Key behaviors:
 * - Connects to WebSocket on mount
 * - Fetches and subscribes to all machines
 * - Does NOT disconnect on unmount (connection persists across navigation)
 * - Handles WebSocket events for realtime updates
 */
export function GlobalWebSocketManager({ children }: { children: ReactNode }) {
  // Initialize WebSocket connection and fetch machines
  // This will run once when the app starts and persist across all pages
  useRealtimeData()

  return <>{children}</>
}
