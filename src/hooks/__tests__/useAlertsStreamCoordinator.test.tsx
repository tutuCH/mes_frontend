import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { useAlertsStreamCoordinator } from '@/hooks/useAlertsStreamCoordinator'

const startSpy = vi.fn()
const stopSpy = vi.fn()
const notifySpy = vi.fn()

vi.mock('@/services/sse', () => ({
  sseService: {
    setAlertsEnabled: vi.fn(),
    onAlertsEvent: vi.fn(() => () => undefined),
    receiveExternalEvent: vi.fn(),
  }
}))

vi.mock('@/services/alertsStreamCoordinator', () => {
  return {
    AlertsStreamCoordinator: class {
      start = startSpy
      stop = stopSpy
      notifyUserInteraction = notifySpy
    }
  }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('useAlertsStreamCoordinator', () => {
  it('initializes the coordinator and wires user interaction', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    function Harness() {
      useAlertsStreamCoordinator()
      return null
    }

    await act(async () => {
      root.render(<Harness />)
    })

    expect(startSpy).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event('pointerdown'))
    expect(notifySpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      root.unmount()
    })
    expect(stopSpy).toHaveBeenCalledTimes(1)
  })
})
