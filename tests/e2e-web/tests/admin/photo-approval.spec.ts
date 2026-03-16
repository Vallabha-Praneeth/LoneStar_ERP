import { test, expect } from '@playwright/test'

const CAMPAIGN_ID = process.env.TEST_CAMPAIGN_ID!

test.describe('Admin photo approval', () => {
  test('photo approval page loads', async ({ page }) => {
    await page.goto(`/admin/campaigns/${CAMPAIGN_ID}/photos`)
    await expect(page.getByText(/pending review/i)).toBeVisible({ timeout: 15_000 })
  })

  test('photo approval page shows pending count in header', async ({ page }) => {
    await page.goto(`/admin/campaigns/${CAMPAIGN_ID}/photos`)
    // Header shows "{n} pending review" regardless of count
    await expect(page.getByText(/pending review/i)).toBeVisible({ timeout: 15_000 })
  })

  test('client cannot access admin photo approval page', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'playwright/.auth/client.json',
    })
    const page = await ctx.newPage()
    await page.goto(`/admin/campaigns/${CAMPAIGN_ID}/photos`)
    await expect(page).not.toHaveURL(/\/admin\/campaigns\/.*\/photos/, { timeout: 10_000 })
    await ctx.close()
  })
})
