import { defineConfig } from '@playwright/test'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const PORT = process.env.PORT || 3000
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: BASE_URL,
    deviceScaleFactor: 2,
    trace: 'off',
  },
  projects: [
    {
      name: 'setup',
      testDir: './tests/e2e',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'screenshots',
      dependencies: ['setup'],
      testDir: './tests/screenshots',
      testMatch: /capture\.(spec\.)?ts/,
      use: {
        storageState: 'tests/.auth/user.json',
      },
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180000,
  },
})
