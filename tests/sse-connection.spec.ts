import { test, expect } from '@playwright/test'

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3000'
const email = process.env.E2E_EMAIL ?? 'tuchenhsien@gmail.com'
const password = process.env.E2E_PASSWORD ?? 'abc123'

async function loginAndSeedToken(request: typeof test['request']) {
  const response = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
  })

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()}`)
  }

  const payload = await response.json()
  if (!payload?.access_token) {
    throw new Error('Login response missing access_token')
  }

  return payload.access_token as string
}

test('single SSE connection per device on SPC page', async ({ page, request }) => {
  const token = await loginAndSeedToken(request)

  await page.addInitScript((authToken) => {
    window.localStorage.setItem('auth_token', authToken)
  }, token)

  const baselineStatus = await request.get(`${apiUrl}/sse/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const baselinePayload = await baselineStatus.json()
  const baselineDataConnections = baselinePayload.connections.data as number

  await page.goto(`${baseUrl}/spc`, { waitUntil: 'domcontentloaded' })

  await page.waitForTimeout(1500)

  await expect.poll(async () => {
    const statusAfterLoad = await request.get(`${apiUrl}/sse/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const statusPayload = await statusAfterLoad.json()
    return statusPayload.connections.data as number
  }).toBeLessThanOrEqual(baselineDataConnections + 1)
})
