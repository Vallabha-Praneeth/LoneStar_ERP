import { test, expect } from '@playwright/test'

test.describe('Client multi-campaign switcher', () => {
  test('campaign page shows "Switch Campaign" if client has multiple campaigns', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page.getByText('Campaign Portal')).toBeVisible({ timeout: 15_000 })

    // The switcher only appears when client has 2+ campaigns
    const switcher = page.getByText('Switch Campaign')
    const hasSwitcher = await switcher.isVisible().catch(() => false)

    if (hasSwitcher) {
      // Click to open the dropdown
      await switcher.click()
      // Should show campaign options with dates
      await expect(page.locator('.absolute.z-10')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('campaign info card renders with title, date, and status', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page.getByText('Campaign Portal')).toBeVisible({ timeout: 15_000 })

    // Campaign title heading should be visible
    await expect(page.locator('h1')).toBeVisible()
    // Status badge should be visible
    await expect(page.locator('[class*="badge"], [class*="Badge"], span:has-text("Active"), span:has-text("Completed"), span:has-text("Pending")')).toBeVisible({ timeout: 10_000 })
  })

  test('photo gallery section renders', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page.getByText('Campaign Photos')).toBeVisible({ timeout: 15_000 })
  })

  test('timing sheet link is present', async ({ page }) => {
    await page.goto('/client/campaign')
    await expect(page.getByText('Campaign Portal')).toBeVisible({ timeout: 15_000 })

    // Timing sheet link visible (use first() since both desktop and mobile variants exist)
    await expect(
      page.getByRole('link', { name: /timing sheet/i }).first()
    ).toBeAttached({ timeout: 10_000 })
  })
})
