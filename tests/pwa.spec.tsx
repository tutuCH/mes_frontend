import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { shouldShowIosInstallBanner } from '@/utils/pwa'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

describe('shouldShowIosInstallBanner', () => {
  test('returns true for iOS Safari when not standalone', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

    expect(
      shouldShowIosInstallBanner({
        userAgent,
        navigatorStandalone: false,
        displayModeStandalone: false,
      }),
    ).toBe(true)
  })

  test('returns false for iOS Chrome', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.0.0 Mobile/15E148 Safari/604.1'

    expect(
      shouldShowIosInstallBanner({
        userAgent,
        navigatorStandalone: false,
        displayModeStandalone: false,
      }),
    ).toBe(false)
  })

  test('returns false when already in standalone', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

    expect(
      shouldShowIosInstallBanner({
        userAgent,
        navigatorStandalone: true,
        displayModeStandalone: true,
      }),
    ).toBe(false)
  })
})

describe('useNetworkStatus', () => {
  beforeAll(() => {
    // Silence React act warnings in test environment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  })

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = false
  })

  test('updates when online/offline events fire', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    })

    function Status() {
      const isOnline = useNetworkStatus()
      return <div>{isOnline ? 'online' : 'offline'}</div>
    }

    act(() => {
      root.render(<Status />)
    })

    expect(container.textContent).toBe('online')

    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    })

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(container.textContent).toBe('offline')

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    })

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(container.textContent).toBe('online')

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
