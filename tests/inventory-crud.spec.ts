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

test('inventory CRUD flow and charts', async ({ page, request }) => {
  const token = await loginAndSeedToken(request)

  await page.addInitScript((authToken) => {
    window.localStorage.setItem('auth_token', authToken)
  }, token)

  await page.goto(`${baseUrl}/inventory`, { waitUntil: 'domcontentloaded' })

  await expect(page.getByTestId('inventory-row-mat_001')).toBeVisible()

  await page.getByTestId('inventory-edit-mat_001').click()
  await page.getByTestId('material-name-input').fill('ABS Prime')
  await page.getByTestId('inventory-save-mat_001').click()
  await expect(page.getByTestId('inventory-row-mat_001')).toContainText('ABS Prime')

  await page.getByTestId('inventory-add-material').click()
  await page.getByTestId('material-dialog-name').fill('Nylon')
  await page.getByTestId('material-dialog-type').selectOption('virgin')
  await page.getByTestId('material-dialog-submit').click()
  await expect(page.getByText('Nylon')).toBeVisible()

  await expect(page.getByTestId('inventory-trend-chart')).toBeVisible()
  await expect(page.getByTestId('inventory-stock-chart')).toBeVisible()

  await page.getByRole('link', { name: 'ABS Prime' }).click()

  await expect(page.getByTestId('material-consumption-chart')).toBeVisible()
  await expect(page.getByTestId('material-lot-stock-chart')).toBeVisible()

  await page.getByTestId('inventory-add-lot').click()
  await page.getByTestId('lot-dialog-batch').fill('ABS-2026-99')
  await page.getByTestId('lot-dialog-quantity').fill('250')
  await page.getByTestId('lot-dialog-status').selectOption('available')
  await page.getByTestId('lot-dialog-submit').click()
  await expect(page.getByText('ABS-2026-99')).toBeVisible()
})
