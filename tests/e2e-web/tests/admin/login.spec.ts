import { test, expect } from '@playwright/test'

// These tests run WITHOUT saved auth state (fresh context)
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Admin login', () => {
  test('valid credentials → redirect to campaigns', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel('Email').fill(process.env.TEST_ADMIN_EMAIL!)
    await page.getByLabel('Password').fill(process.env.TEST_ADMIN_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/admin\/campaigns/, { timeout: 15_000 })
  })

  test('invalid credentials → shows error, stays on login', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel('Email').fill('nobody@nowhere.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 10_000 })
  })
})
