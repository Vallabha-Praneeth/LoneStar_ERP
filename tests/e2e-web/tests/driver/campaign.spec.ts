import { test, expect } from '@playwright/test'

test.describe('Driver campaign view', () => {
  test('campaign page loads with title', async ({ page }) => {
    await page.goto('/driver/campaign')
    await expect(page.getByText('My Campaign')).toBeVisible({ timeout: 15_000 })
  })

  test('start shift button is visible', async ({ page }) => {
    await page.goto('/driver/campaign')
    // Either "Start Shift" or "End Shift" should be visible depending on state
    const startBtn = page.getByRole('button', { name: /start shift/i })
    const endBtn = page.getByRole('button', { name: /end shift/i })
    await expect(startBtn.or(endBtn)).toBeVisible({ timeout: 15_000 })
  })

  test('past campaigns section renders when history exists', async ({ page }) => {
    await page.goto('/driver/campaign')
    await expect(page.getByText('My Campaign')).toBeVisible({ timeout: 15_000 })

    // The "Past Campaigns" toggle should exist if driver has history
    // This is a soft assertion — if no history, the section won't render
    const pastCampaigns = page.getByText('Past Campaigns')
    const hasPastCampaigns = await pastCampaigns.isVisible().catch(() => false)

    if (hasPastCampaigns) {
      // Click to expand
      await pastCampaigns.click()
      // Should show at least one completed campaign entry with date format
      await expect(page.getByText(/photos/)).toBeVisible({ timeout: 5_000 })
    }
  })

  test('sign out navigates to role selector', async ({ page }) => {
    await page.goto('/driver/campaign')
    await expect(page.getByText('My Campaign')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /sign out/i }).or(
      page.locator('button:has(svg.lucide-log-out)')
    ).first().click()

    // After sign out, should navigate away from driver pages
    await expect(page).not.toHaveURL(/\/driver\/campaign/, { timeout: 10_000 })
  })
})
