import { test, expect } from '@playwright/test'

const CAMPAIGN_ID = process.env.TEST_CAMPAIGN_ID!

test.describe('Admin photo management', () => {
  test('photo management page loads', async ({ page }) => {
    await page.goto(`/admin/campaigns/${CAMPAIGN_ID}/photos`)
    await expect(page.getByText('Photo Management')).toBeVisible({ timeout: 15_000 })
  })

  test('photo management page shows photo count in header', async ({ page }) => {
    await page.goto(`/admin/campaigns/${CAMPAIGN_ID}/photos`)
    // Header shows "Photo Management" with campaign title and photo count below
    await expect(page.getByText('Photo Management')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/\d+ photos/i)).toBeVisible({ timeout: 10_000 })
  })

  test('client cannot access admin photo management page', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'playwright/.auth/client.json',
    })
    const page = await ctx.newPage()
    await page.goto(`/admin/campaigns/${CAMPAIGN_ID}/photos`)
    await expect(page).not.toHaveURL(/\/admin\/campaigns\/.*\/photos/, { timeout: 10_000 })
    await ctx.close()
  })
})
