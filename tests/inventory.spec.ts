import { test, expect } from '@playwright/test'

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

test('inventory dashboard loads and navigates to material detail', async ({ page }) => {
  let subscriptionCalls = 0
  await page.addInitScript(() => {
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
    }

    ;(window as any).EventSource = MockEventSource
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

  await page.route('**/api/subscription/**', async (route) => {
    subscriptionCalls += 1
    const url = route.request().url()

    if (url.includes('/api/subscription/current')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: {
            id: 'sub_123',
            status: 'active',
            plan: { id: 'basic' },
            currentPeriodEnd: 1767225600,
            cancelAtPeriodEnd: false,
          },
        }),
      })
      return
    }

    if (url.includes('/api/subscription/plans')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plans: [
            {
              id: 'basic',
              name: 'Basic',
              description: 'Basic plan',
              price: 100,
              currency: 'usd',
              interval: 'month',
              features: [],
            },
          ],
        }),
      })
      return
    }

    if (url.includes('/api/subscription/payment-methods')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', data: { payment_methods: [] } }),
      })
      return
    }

    await route.fulfill({ status: 404, body: 'Not mocked' })
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

  await page.goto(`${baseUrl}/inventory`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(300)
  expect(subscriptionCalls).toBeGreaterThan(0)

  const absRow = page.getByTestId('inventory-row-mat_001')
  await expect(absRow).toBeVisible()

  await page.getByRole('link', { name: 'ABS' }).click()

  await expect(page).toHaveURL(/\/inventory\/mat_001/)
  await expect(page.getByTestId('consumption-count')).toBeVisible()
})
