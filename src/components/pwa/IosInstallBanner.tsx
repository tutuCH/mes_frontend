import { useEffect, useState } from 'react'
import { Share2, X } from 'lucide-react'
import { shouldShowIosInstallBanner } from '@/utils/pwa'

const STORAGE_KEY = 'pwa-ios-install-dismissed'

export function IosInstallBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return
    } catch {
      // Ignore storage access errors
    }

    const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false
    const navigatorStandalone = (navigator as { standalone?: boolean }).standalone === true

    if (
      shouldShowIosInstallBanner({
        userAgent: navigator.userAgent,
        navigatorStandalone,
        displayModeStandalone,
      })
    ) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Ignore storage access errors
    }
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-elevated">
      <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Share2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Install NEXUS MES</p>
          <p className="text-xs text-muted-foreground">
            Tap the Share icon and choose "Add to Home Screen".
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
