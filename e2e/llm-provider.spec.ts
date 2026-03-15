import { test, expect } from '@playwright/test'

// Helper to setup master password if needed
async function setupMasterPasswordIfNeeded(page: any) {
  // Check if we're on the welcome/setup page
  const welcomeHeading = page.locator('h1', { hasText: 'Welcome to LocalClaw' })
  if (await welcomeHeading.isVisible().catch(() => false)) {
    // Click "Get Started" to setup master password
    await page.getByRole('button', { name: 'Get Started' }).click()
    await page.waitForTimeout(500)

    // Fill in master password setup form
    const passwordInputs = page.locator('input[type="password"]')
    await passwordInputs.first().fill('testpass123')
    await passwordInputs.nth(1).fill('testpass123')

    // Submit the form
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(2000)
  }

  // Check if we need to unlock
  const unlockButton = page.locator('button', { hasText: 'Unlock' })
  if (await unlockButton.isVisible().catch(() => false)) {
    await page.locator('input[type="password"]').fill('testpass123')
    await unlockButton.click()
    await page.waitForTimeout(2000)
  }
}

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await setupMasterPasswordIfNeeded(page)
  })

  test('should display dashboard heading', async ({ page }) => {
    // Verify dashboard heading (LOCALCLAW)
    await expect(page.locator('h1', { hasText: 'LOCALCLAW' })).toBeVisible({ timeout: 15000 })
  })
})

test.describe('LLM Provider Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await setupMasterPasswordIfNeeded(page)

    // Navigate to Settings tab (CONFIG tab)
    await page.locator('[role="tab"]:has-text("Settings")').click()
    await page.waitForTimeout(500)
  })

  test('should display LLM Provider section', async ({ page }) => {
    // Verify LLM Provider heading is visible
    await expect(page.getByRole('heading', { name: 'LLM PROVIDER' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Configure OpenRouter or a custom OpenAI-compatible provider')).toBeVisible()
  })

  test('should validate custom provider fields', async ({ page }) => {
    // Select Custom provider type from dropdown
    await page.getByRole('combobox').first().click()
    await page.waitForTimeout(500)
    await page.locator('[role="option"]:has-text("Custom")').first().click()

    // Try to save without Base URL
    await page.getByRole('button', { name: 'SAVE' }).click()

    // Verify validation error
    await expect(page.getByText('Base URL is required')).toBeVisible({ timeout: 10000 })
  })
})
