import { isIosSafari } from '@/utils/pwa'

export interface IosViewportCheck {
  userAgent: string
  hasVisualViewport: boolean
}

export function shouldEnableIosViewportFix({
  userAgent,
  hasVisualViewport,
}: IosViewportCheck): boolean {
  return hasVisualViewport && isIosSafari(userAgent)
}

export function initIosViewportFix(): () => void {
  if (typeof window === 'undefined') return () => {}

  const hasVisualViewport = typeof window.visualViewport !== 'undefined'
  if (
    !shouldEnableIosViewportFix({
      userAgent: navigator.userAgent,
      hasVisualViewport,
    })
  ) {
    return () => {}
  }

  const root = document.documentElement
  let rafId: number | null = null

  const updateHeight = () => {
    rafId = null
    const height = window.visualViewport?.height ?? window.innerHeight
    root.style.setProperty('--app-height', `${Math.round(height)}px`)
  }

  const scheduleUpdate = () => {
    if (rafId !== null) return
    rafId = window.requestAnimationFrame(updateHeight)
  }

  scheduleUpdate()

  const visualViewport = window.visualViewport
  visualViewport?.addEventListener('resize', scheduleUpdate, { passive: true })
  visualViewport?.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate, { passive: true })

  return () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId)
    }
    visualViewport?.removeEventListener('resize', scheduleUpdate)
    visualViewport?.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('orientationchange', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
  }
}
