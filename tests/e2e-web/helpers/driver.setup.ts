import { test as setup, expect } from '@playwright/test'
import { mkdir } from 'fs/promises'
import path from 'path'

setup('authenticate as driver', async ({ page }) => {
  await mkdir(path.join(__dirname, '../playwright/.auth'), { recursive: true })

  await page.goto('/driver/login')
  await page.getByLabel('Username').fill(process.env.TEST_DRIVER_USERNAME!)
  await page.getByLabel('Password').fill(process.env.TEST_DRIVER_PASSWORD!)
  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL(/\/driver\/campaign/, { timeout: 30_000 })
  await page.context().storageState({ path: 'playwright/.auth/driver.json' })
})
