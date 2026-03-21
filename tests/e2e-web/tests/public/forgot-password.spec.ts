import { test, expect } from '@playwright/test'

test.describe('Forgot password flow', () => {
  test('admin login shows "Forgot your password?" link', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByText('Forgot your password?')).toBeVisible({ timeout: 10_000 })
  })

  test('client login shows "Forgot your password?" link', async ({ page }) => {
    await page.goto('/client/login')
    await expect(page.getByText('Forgot your password?')).toBeVisible({ timeout: 10_000 })
  })

  test('driver login does NOT show "Forgot your password?" link', async ({ page }) => {
    await page.goto('/driver/login')
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Forgot your password?')).not.toBeVisible()
  })

  test('clicking "Forgot your password?" shows reset form on admin login', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByText('Forgot your password?').click()

    // Reset form elements should appear
    await expect(page.getByPlaceholder('Email address')).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
  })

  test('cancel button dismisses reset form', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByText('Forgot your password?').click()
    await expect(page.getByPlaceholder('Email address')).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByPlaceholder('Email address')).not.toBeVisible()
  })

  test('submitting reset form shows success message', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByText('Forgot your password?').click()

    await page.getByPlaceholder('Email address').fill('admin@adtruck.com')
    await page.getByRole('button', { name: /send reset link/i }).click()

    await expect(page.getByText(/password reset email sent/i)).toBeVisible({ timeout: 10_000 })
  })
})
