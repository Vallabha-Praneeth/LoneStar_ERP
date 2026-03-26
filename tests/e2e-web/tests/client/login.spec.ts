import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Client login', () => {
  test('valid credentials → redirect to campaign view', async ({ page }) => {
    await page.goto('/client/login')
    await page.getByLabel('Email').fill(process.env.TEST_CLIENT_EMAIL!)
    await page.getByLabel('Password').fill(process.env.TEST_CLIENT_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/client\/campaign/, { timeout: 30_000 })
  })

  test('invalid credentials → shows error, stays on login', async ({ page }) => {
    await page.goto('/client/login')
    await page.getByLabel('Email').fill('nobody@nowhere.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/client\/login/)
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 10_000 })
  })
})
