import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSPCStreamAggregator } from '@/hooks/useSPCStreamAggregator'

type ListenerMap = Record<string, ((payload: unknown) => void)[]>
type TestRealtimeEvent = {
  deviceId: string
  timestamp: string
  data: {
    timestamp: number
    Data: {
      cycle_time: number
    }
  }
}
const {
  listeners,
  subscribeToMachine,
  isSubscribed,
} = vi.hoisted(() => ({
  listeners: {} as ListenerMap,
  subscribeToMachine: vi.fn(() => vi.fn()),
  isSubscribed: vi.fn(() => true),
}))

vi.mock('@/services/sse', () => ({
  sseService: {
    subscribeToMachine,
    isSubscribed,
    on: vi.fn((event: string, cb: (payload: unknown) => void) => {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(cb)
    }),
    off: vi.fn((event: string, cb: (payload: unknown) => void) => {
      listeners[event] = (listeners[event] ?? []).filter((fn) => fn !== cb)
    }),
  },
}))

vi.mock('@/utils/fieldMapping', () => ({
  normalizeRealtimeData: (event: TestRealtimeEvent) => ({
    cycle_time: event.data.Data.cycle_time,
  }),
  normalizeSPCData: (event: TestRealtimeEvent) => ({
    cycle_time: event.data.Data.cycle_time,
  }),
}))

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('useSPCStreamAggregator', () => {
  beforeEach(() => {
    Object.keys(listeners).forEach((key) => {
      delete listeners[key]
    })
    vi.clearAllMocks()
  })

  it('inserts a gap break sentinel before first live point when gap is large', async () => {
    const snapshots: Array<Array<{ x: number; y: number }>> = []

    function Harness({ initialData }: { initialData: Array<{ x: number; y: number }> }) {
      useSPCStreamAggregator({
        deviceId: 'C02',
        field: 'cycle_time',
        dataSource: 'realtime',
        initialData,
        onDataUpdate: (next) => snapshots.push(next),
      })
      return null
    }

    const root = createRoot(document.createElement('div'))
    await act(async () => {
      root.render(<Harness initialData={[]} />)
    })

    await act(async () => {
      root.render(
        <Harness initialData={[{ x: Date.parse('2026-02-06T21:58:22.797Z'), y: 55.03 }]} />
      )
    })

    await act(async () => {
      const payload: TestRealtimeEvent = {
        deviceId: 'C02',
        data: {
          Data: { cycle_time: 49.8 },
          timestamp: Date.parse('2026-02-07T17:02:28.614Z'),
        },
        timestamp: '2026-02-07T17:02:39.922Z',
      }
      listeners['realtime-update']?.forEach((cb) => cb(payload))
    })

    const latest = snapshots[snapshots.length - 1]
    expect(latest).toBeTruthy()
    expect(latest[latest.length - 2].y).toBeNaN()
    expect(latest[latest.length - 1].y).toBe(49.8)
  })
})
