import { test as setup, expect } from '@playwright/test'
import { mkdir } from 'fs/promises'
import path from 'path'

setup('authenticate as admin', async ({ page }) => {
  await mkdir(path.join(__dirname, '../playwright/.auth'), { recursive: true })

  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(process.env.TEST_ADMIN_EMAIL!)
  await page.getByLabel('Password').fill(process.env.TEST_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL(/\/admin\/campaigns/, { timeout: 15_000 })
  await page.context().storageState({ path: 'playwright/.auth/admin.json' })
})
