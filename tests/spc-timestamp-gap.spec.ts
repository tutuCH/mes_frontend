import { test, expect } from '@playwright/test'

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

test('SPC chart aligns live point after history', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as any).__SPC_DEBUG_TIMING__ = true

    class MockEventSource {
      static instances: MockEventSource[] = []
      url: string
      readyState = 1
      onopen: (() => void) | null = null
      onerror: (() => void) | null = null
      private listeners = new Map<string, Array<(event: { data: string }) => void>>()

      constructor(url: string) {
        this.url = url
        MockEventSource.instances.push(this)
        setTimeout(() => {
          if (this.onopen) this.onopen()
        }, 0)
      }

      addEventListener(type: string, listener: (event: { data: string }) => void) {
        const list = this.listeners.get(type) ?? []
        list.push(listener)
        this.listeners.set(type, list)
      }

      close() {
        this.readyState = 2
      }

      emit(type: string, payload: unknown) {
        const event = { data: JSON.stringify(payload) }
        const list = this.listeners.get(type) ?? []
        list.forEach(listener => listener(event))
      }
    }

    ;(window as any).EventSource = MockEventSource
    ;(window as any).__emitSSE = (eventName: string, payload: unknown) => {
      MockEventSource.instances.forEach(instance => instance.emit(eventName, payload))
    }
  })

  await page.route('**/auth/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 1,
        username: 'Test User',
        email: 'test@example.com',
        accessLevel: 'admin',
      }),
    })
  })

  await page.route('**/machines/factories-machines', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          factoryId: 1,
          factoryName: 'Factory A',
          factoryIndex: 'F01',
          factoryWidth: 10,
          factoryHeight: 10,
          createdAt: '2026-01-29T00:00:00.000Z',
          machines: [
            {
              machineId: 1,
              machineName: 'C02',
              machineIndex: 'M01',
              status: 'RUN',
              createdAt: '2026-01-29T00:00:00.000Z',
              factoryId: 1,
            },
          ],
        },
      ]),
    })
  })

  await page.route('**/machines/1/realtime-history**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            time: '2026-01-29T20:10:00.000Z',
            temp_1: 0,
            oil_temp: 0,
            cycle_time: 45,
            operate_mode: 1,
          },
        ],
        pagination: { total: 1, limit: 1, offset: 0 },
      }),
    })
  })

  await page.route('**/machines/1/spc-history**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        pagination: { total: 0, limit: 50, offset: 0 },
      }),
    })
  })

  await page.route('**/api/spc/series**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        machineId: 1,
        field: 'cycle_time',
        unit: 's',
        window: {
          mode: 'last_1h',
          start: '2026-01-29T19:15:00.000Z',
          end: '2026-01-29T20:15:33.166Z',
        },
        sampling: {
          limit: 100,
          returned: 2,
          downsample: 'none',
          intervalMs: 60000,
        },
        series: [
          { ts: '2026-01-29T20:15:00.000Z', value: 40 },
          { ts: '2026-01-29T20:15:33.166Z', value: 42 },
        ],
        stats: null,
        limits: null,
        meta: { source: 'test', generatedAt: '2026-01-29T20:15:35.000Z' },
      }),
    })
  })

  await page.route('**/sse/stream-ticket', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ticket: 'test-ticket', expiresInSeconds: 300 }),
    })
  })

  await page.addInitScript(() => {
    window.localStorage.setItem('auth_token', 'test-token')
  })

  await page.goto(`${baseUrl}/spc`, { waitUntil: 'domcontentloaded' })

  await page.waitForFunction(() => {
    const store = (window as any).__spcChartDebug
    const chart = store?.['C02:cycle_time'] as any
    return Boolean(chart?.data?.datasets?.[0]?.data?.length)
  })

  await page.evaluate(() => {
    ;(window as any).__emitSSE('spc-update', {
      deviceId: 'C02',
      timestamp: '2026-01-29T20:29:08.577Z',
      data: { timestamp: 1769718546425 },
      Data: { ECYCT: '38.88' },
    })
  })

  await page.waitForFunction(() => {
    const store = (window as any).__spcChartDebug
    const chart = store?.['C02:cycle_time'] as any
    return (chart?.data?.datasets?.[0]?.data?.length ?? 0) >= 3
  })

  const deltaMs = await page.evaluate(() => {
    const store = (window as any).__spcChartDebug
    const chart = store?.['C02:cycle_time'] as any
    const data = chart.data.datasets[0].data
    const lastTwo = data.slice(-2)
    return lastTwo[1].x - lastTwo[0].x
  })

  expect(deltaMs).toBeGreaterThan(10 * 60 * 1000)
  expect(deltaMs).toBeLessThan(20 * 60 * 1000)
})
