import { test, expect } from '@playwright/test'

test.describe('Unauthenticated redirects', () => {
  test('redirects /admin/campaigns to /admin/login', async ({ page }) => {
    await page.goto('/admin/campaigns')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('redirects /client/campaign to /client/login', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page).toHaveURL(/\/client\/login/)
  })

  test('redirects /driver/campaign to /driver/login', async ({ page }) => {
    await page.goto('/driver/campaign')
    await expect(page).toHaveURL(/\/driver\/login/)
  })

  test('home page is accessible without auth', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/driver|admin|client/i).first()).toBeVisible()
  })

  test('admin login page renders', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('client login page renders', async ({ page }) => {
    await page.goto('/client/login')
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('driver login page renders with username field', async ({ page }) => {
    await page.goto('/driver/login')
    await expect(page.getByPlaceholder(/username/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})
