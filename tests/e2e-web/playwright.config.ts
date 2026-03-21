import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '.env.test') })

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'results/junit.xml' }],
    ...(process.env.CI ? [['github'] as ['github']] : []),
  ],

  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },

  projects: [
    // Auth setup — runs first
    { name: 'setup-admin', testDir: './helpers', testMatch: /.*admin\.setup\.ts/ },
    { name: 'setup-client', testDir: './helpers', testMatch: /.*client\.setup\.ts/ },
    { name: 'setup-driver', testDir: './helpers', testMatch: /.*driver\.setup\.ts/ },

    // Unauthenticated routes (no dependency)
    {
      name: 'public',
      testDir: './tests/public',
      use: { ...devices['Desktop Chrome'] },
    },

    // Admin portal — uses saved session
    {
      name: 'admin',
      testDir: './tests/admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup-admin'],
    },

    // Client portal — uses saved session
    {
      name: 'client',
      testDir: './tests/client',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/client.json',
      },
      dependencies: ['setup-client'],
    },

    // Driver portal — uses saved session
    {
      name: 'driver',
      testDir: './tests/driver',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/driver.json',
      },
      dependencies: ['setup-driver'],
    },

    // RLS tests — no saved session (signs in per test)
    {
      name: 'rls',
      testDir: './tests/rls',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: process.env.CI ? 'http://localhost:4173' : (process.env.BASE_URL ?? 'http://localhost:5173'),
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: path.resolve(__dirname, '../..'),
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL!,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY!,
    },
  },
})
