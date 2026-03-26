import { test, expect } from '@playwright/test'

test.describe('Admin user management', () => {
  test('users page loads with heading and user list', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 15_000 })
    // At least one user row should be visible (admin account at minimum)
    await expect(page.getByRole('heading', { name: 'Admin User' })).toBeVisible({ timeout: 10_000 })
  })

  test('search filters users by name or email', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 15_000 })

    // Type a search term that matches the admin user
    await page.getByPlaceholder('Search users...').fill('admin')
    // Admin user should still be visible (matched by display name, username, or email)
    await expect(page.getByText(/admin/i).first()).toBeVisible()
  })

  test('role filter narrows results', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 15_000 })

    // Open role filter and select "Driver"
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Driver' }).click()

    // Admin user email should not be visible when filtering by driver
    await expect(page.getByText('admin@adtruck.com')).not.toBeVisible({ timeout: 5_000 })
  })

  test('deactivate button is disabled for admin users', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 15_000 })

    // Filter to admin role to find the admin row
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Admin' }).click()

    // The deactivate button for admin should be disabled
    const deactivateBtn = page.getByRole('button', { name: /deactivate/i }).first()
    await expect(deactivateBtn).toBeDisabled()
  })
})
