import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AlertsStreamCoordinator } from '@/services/alertsStreamCoordinator'

class MockBroadcastChannel {
  static channels: Record<string, MockBroadcastChannel[]> = {}
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(public name: string) {
    MockBroadcastChannel.channels[name] = MockBroadcastChannel.channels[name] ?? []
    MockBroadcastChannel.channels[name].push(this)
  }

  postMessage(data: unknown) {
    for (const channel of MockBroadcastChannel.channels[this.name]) {
      if (channel !== this && channel.onmessage) {
        channel.onmessage({ data } as MessageEvent)
      }
    }
  }

  close() {
    MockBroadcastChannel.channels[this.name] = MockBroadcastChannel.channels[this.name]
      .filter((channel) => channel !== this)
  }
}

describe('AlertsStreamCoordinator', () => {
  beforeEach(() => {
    localStorage.clear()
    MockBroadcastChannel.channels = {}
    globalThis.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel
  })

  it('claims leadership immediately when no lock exists', () => {
    const setAlertsEnabled = vi.fn()
    const receiveExternalEvent = vi.fn()
    const onAlertsEvent = vi.fn(() => () => undefined)

    const coordinator = new AlertsStreamCoordinator({
      setAlertsEnabled,
      onAlertsEvent,
      receiveExternalEvent,
    })

    coordinator.start()

    expect(setAlertsEnabled).toHaveBeenCalledWith(true)
  })

  it('does not take over stale lock until user interaction', () => {
    const setAlertsEnabled = vi.fn()
    const receiveExternalEvent = vi.fn()
    const onAlertsEvent = vi.fn(() => () => undefined)

    const stale = { tabId: 'leader', expiresAt: Date.now() - 1000 }
    localStorage.setItem('mes_alerts_leader', JSON.stringify(stale))

    const coordinator = new AlertsStreamCoordinator({
      setAlertsEnabled,
      onAlertsEvent,
      receiveExternalEvent,
    })

    coordinator.start()
    expect(setAlertsEnabled).toHaveBeenCalledWith(false)

    coordinator.notifyUserInteraction()
    expect(setAlertsEnabled).toHaveBeenCalledWith(true)
  })

  it('relays alert events from leader to followers', () => {
    let emitEvent: ((eventName: 'machine-alert', payload: { deviceId: string; alertType: string; message: string }) => void) | null = null
    const leader = new AlertsStreamCoordinator({
      setAlertsEnabled: vi.fn(),
      onAlertsEvent: (callback) => {
        emitEvent = callback
        return () => undefined
      },
      receiveExternalEvent: vi.fn()
    })

    const followerReceive = vi.fn()
    const follower = new AlertsStreamCoordinator({
      setAlertsEnabled: vi.fn(),
      onAlertsEvent: vi.fn(() => () => undefined),
      receiveExternalEvent: followerReceive
    })

    leader.start()
    follower.start()
    emitEvent?.('machine-alert', { deviceId: 'C02', alertType: 'warning', message: 'Test' })

    expect(followerReceive).toHaveBeenCalled()
  })

  it('disables alerts when an active leader lock exists', () => {
    const setAlertsEnabled = vi.fn()
    const receiveExternalEvent = vi.fn()
    const onAlertsEvent = vi.fn(() => () => undefined)

    localStorage.setItem('mes_alerts_leader', JSON.stringify({
      tabId: 'leader',
      expiresAt: Date.now() + 10_000,
    }))

    const coordinator = new AlertsStreamCoordinator({
      setAlertsEnabled,
      onAlertsEvent,
      receiveExternalEvent,
    })

    coordinator.start()

    expect(setAlertsEnabled).toHaveBeenCalledWith(false)
  })
})
