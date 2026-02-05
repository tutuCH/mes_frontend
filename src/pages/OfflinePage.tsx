import { useNavigate } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export default function OfflinePage() {
  const navigate = useNavigate()
  const isOnline = useNetworkStatus()

  return (
    <div className="min-h-dvh safe-area-padding bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WifiOff className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">You're offline</h1>
          <p className="text-sm text-muted-foreground">
            Check your connection. Core pages will load once you are back online.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          {isOnline && (
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to app
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
