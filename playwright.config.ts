import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL,
  },
  webServer: process.env.E2E_SKIP_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: true,
      },
})
