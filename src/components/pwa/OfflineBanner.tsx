import { WifiOff } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export function OfflineBanner() {
  const isOnline = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 pointer-events-none border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="mx-auto flex items-center justify-center gap-2 px-4 py-2 text-sm pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Some data may be unavailable.</span>
      </div>
    </div>
  )
}
