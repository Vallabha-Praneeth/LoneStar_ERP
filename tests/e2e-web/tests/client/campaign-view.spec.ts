import { test, expect } from '@playwright/test'

test.describe('Client campaign view', () => {
  test('campaign page loads with header', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page.getByText('Campaign Portal')).toBeVisible({ timeout: 15_000 })
  })

  test('no approve/reject controls visible to client', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page.getByText('Campaign Portal')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /approve/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /reject/i })).not.toBeVisible()
  })

  test('only approved photos visible to client', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page.getByText('Campaign Portal')).toBeVisible({ timeout: 15_000 })
    // Rejected status badges must not appear in photo list
    await expect(page.getByText(/rejected/i)).not.toBeVisible()
  })

  test('client cannot access admin routes', async ({ page }) => {
    await page.goto('/admin/campaigns')
    await expect(page).not.toHaveURL(/\/admin\/campaigns/, { timeout: 10_000 })
  })
})
