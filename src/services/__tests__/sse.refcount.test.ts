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

describe('sseService refcount', () => {
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

  it('creates one EventSource for two subscribers to same device', async () => {
    const unsubscribe1 = sseService.subscribeToMachine('C02')
    const unsubscribe2 = sseService.subscribeToMachine('C02')

    await new Promise((resolve) => setTimeout(resolve, 0))

    const dataStreams = MockEventSource.instances.filter((instance) =>
      instance.url.includes('/sse/stream')
    )
    expect(dataStreams.length).toBe(1)

    unsubscribe1()
    expect(dataStreams.length).toBe(1)

    unsubscribe2()
    expect(dataStreams[0].readyState).toBe(2)
  })
})
