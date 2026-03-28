import { test, expect } from '@playwright/test'

test.describe('Client campaign view', () => {
  test('campaign page loads with header', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page.getByText('Campaign Portal')).toBeVisible({ timeout: 15_000 })
  })

  test('photos section visible to client', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page.getByText('Campaign Portal')).toBeVisible({ timeout: 15_000 })
    // Photos are shown directly — no approval controls
    await expect(page.getByText('Campaign Photos')).toBeVisible()
  })

  test('client cannot access admin routes', async ({ page }) => {
    await page.goto('/admin/campaigns')
    await expect(page).not.toHaveURL(/\/admin\/campaigns/, { timeout: 10_000 })
  })
})
