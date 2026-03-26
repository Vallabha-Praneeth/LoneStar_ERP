import { test as setup, expect } from '@playwright/test'
import { mkdir } from 'fs/promises'
import path from 'path'

setup('authenticate as client', async ({ page }) => {
  await mkdir(path.join(__dirname, '../playwright/.auth'), { recursive: true })

  await page.goto('/client/login')
  await page.getByLabel('Email').fill(process.env.TEST_CLIENT_EMAIL!)
  await page.getByLabel('Password').fill(process.env.TEST_CLIENT_PASSWORD!)
  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL(/\/client\/campaign/, { timeout: 30_000 })
  await page.context().storageState({ path: 'playwright/.auth/client.json' })
})
