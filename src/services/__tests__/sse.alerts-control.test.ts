import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sseService } from '@/services/sse'

type EventListener = (event: Event) => void

class MockEventSource {
  static instances: MockEventSource[] = []
  readyState = 0
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  private listeners = new Map<string, EventListener[]>()

  constructor(public url: string) {
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: EventListener) {
    const list = this.listeners.get(type) ?? []
    list.push(listener)
    this.listeners.set(type, list)
  }

  close() {
    this.readyState = 2
  }
}

describe('sseService alerts control', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    sseService.disconnect()
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ ticket: 'test-ticket', expiresInSeconds: 300 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
  })

  it('does not open alerts stream when alerts are disabled', async () => {
    sseService.setAlertsEnabled(false)
    sseService.connect()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const alertStreams = MockEventSource.instances.filter((instance) =>
      instance.url.includes('/sse/alerts')
    )
    expect(alertStreams.length).toBe(0)
  })

  it('emits externally received alerts events to listeners', () => {
    const handler = vi.fn()
    sseService.on('machine-alert', handler)

    sseService.receiveExternalEvent('machine-alert', {
      deviceId: 'C02',
      alertType: 'critical',
      message: 'Overheat',
      timestamp: new Date().toISOString()
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })
})
