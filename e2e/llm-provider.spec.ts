import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and wait for page to load
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should display dashboard with tabs', async ({ page }) => {
    // Verify dashboard heading (LOCALCLAW, not Dashboard)
    await expect(page.getByRole('heading', { name: 'LOCALCLAW' })).toBeVisible()

    // Verify all tabs are present (uppercase labels)
    await expect(page.getByRole('tab', { name: 'CHAT' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'FILES' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'TASKS' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'CONFIG' })).toBeVisible()
  })
})

test.describe('LLM Provider Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Navigate to Settings tab (CONFIG tab)
    await page.getByRole('tab', { name: 'CONFIG' }).click()
    await page.waitForTimeout(1000)
  })

  test('should display LLM Provider section', async ({ page }) => {
    // Verify LLM Provider heading is visible
    await expect(page.getByRole('heading', { name: 'LLM PROVIDER' })).toBeVisible()
    await expect(page.getByText('Configure OpenRouter or a custom OpenAI-compatible provider')).toBeVisible()
  })

  test('should save OpenRouter provider with master password', async ({ page }) => {
    // Select OpenRouter provider type from dropdown
    await page.getByRole('combobox').first().click()
    await page.waitForTimeout(500)
    await page.locator('[role="option"]:has-text("OpenRouter")').click()

    // Enter API Key
    const apiKeyInput = page.locator('input[type="password"]').first()
    await apiKeyInput.fill('sk-or-v1-test-api-key')

    // Add a model - type and press Enter
    const modelInput = page.getByPlaceholder('Add model ID')
    await modelInput.fill('anthropic/claude-3.5-sonnet')
    await modelInput.press('Enter')
    await page.waitForTimeout(500)

    // Verify model appears in the list
    await expect(page.locator('text=anthropic/claude-3.5-sonnet').first()).toBeVisible()

    // Save the provider - this should trigger master password dialog
    await page.getByRole('button', { name: 'SAVE' }).click()

    // Wait for master password dialog to appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })

    // Wait for dialog to be fully rendered
    await page.waitForTimeout(500)

    // Get the dialog and fill in the password fields
    const dialog = page.getByRole('dialog')
    const passwordInputs = dialog.locator('input[type="password"]')

    // Fill both password fields
    await passwordInputs.first().fill('testpass123')
    await passwordInputs.nth(1).fill('testpass123')

    // Click the submit button
    await dialog.locator('button[type="submit"]').click()

    // Wait for dialog to close (indicates successful submission)
    await expect(dialog).not.toBeVisible({ timeout: 15000 })

    // Wait for save to complete
    await page.waitForTimeout(1000)

    // Verify provider is saved - Active Provider badge should appear
    await expect(page.getByText('ACTIVE PROVIDER')).toBeVisible({ timeout: 10000 })
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

    // Enter Base URL
    await page.getByPlaceholder('https://api.example.com/v1').fill('https://api.example.com/v1')

    // Try to save without adding any models
    await page.getByRole('button', { name: 'SAVE' }).click()

    // Verify validation error - now requires at least one model
    await expect(page.getByText('Please add at least one model')).toBeVisible({ timeout: 10000 })

    // Add a model - it will be auto-selected as default
    const modelInput = page.getByPlaceholder('Add model ID')
    await modelInput.fill('gpt-4o-custom')
    await modelInput.press('Enter')
    await page.waitForTimeout(500)

    // Verify model was added and auto-selected
    await expect(page.locator('text=gpt-4o-custom').first()).toBeVisible()
  })

  test('should manage models list', async ({ page }) => {
    // Ensure OpenRouter is selected
    await page.getByRole('combobox').first().click()
    await page.waitForTimeout(500)
    await page.locator('[role="option"]:has-text("OpenRouter")').click()

    // Add first model using Enter key
    const modelInput = page.getByPlaceholder('Add model ID')
    await modelInput.fill('gpt-4o')
    await modelInput.press('Enter')
    await page.waitForTimeout(500)

    // Verify first model appears
    await expect(page.locator('text=gpt-4o').first()).toBeVisible()

    // Add second model
    await modelInput.fill('claude-3-opus')
    await modelInput.press('Enter')
    await page.waitForTimeout(500)

    // Verify both models are visible
    await expect(page.locator('text=gpt-4o').first()).toBeVisible()
    await expect(page.locator('text=claude-3-opus').first()).toBeVisible()
  })

  test('should delete provider', async ({ page }) => {
    // First set up a provider
    await page.getByRole('combobox').first().click()
    await page.waitForTimeout(500)
    await page.locator('[role="option"]:has-text("OpenRouter")').click()

    await page.locator('input[type="password"]').first().fill('sk-or-v1-test-key')

    const modelInput = page.getByPlaceholder('Add model ID')
    await modelInput.fill('gpt-4o')
    await modelInput.press('Enter')
    await page.waitForTimeout(500)

    // Save with master password
    await page.getByRole('button', { name: 'SAVE' }).click()

    // Wait for dialog and fill it
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(500)

    const passwordInputs = dialog.locator('input[type="password"]')
    await passwordInputs.first().fill('testpass123')
    await passwordInputs.nth(1).fill('testpass123')
    await dialog.locator('button[type="submit"]').click()

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)

    // Verify provider is saved
    await expect(page.getByText('ACTIVE PROVIDER')).toBeVisible({ timeout: 10000 })

    // Click delete
    await page.getByRole('button', { name: 'DELETE' }).click()
    await page.waitForTimeout(800)

    // Verify provider is deleted
    await expect(page.getByText('ACTIVE PROVIDER')).not.toBeVisible()
  })

  test('should validate master password length', async ({ page }) => {
    // Select OpenRouter
    await page.getByRole('combobox').first().click()
    await page.waitForTimeout(500)
    await page.locator('[role="option"]:has-text("OpenRouter")').click()

    // Enter API Key
    await page.locator('input[type="password"]').first().fill('sk-or-v1-secret-key')

    // Add model
    const modelInput = page.getByPlaceholder('Add model ID')
    await modelInput.fill('gpt-4o')
    await modelInput.press('Enter')

    // Save
    await page.getByRole('button', { name: 'SAVE' }).click()

    // Master password dialog should appear
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Try short password
    const passwordInputs = dialog.locator('input[type="password"]')
    await passwordInputs.first().fill('short')
    await passwordInputs.nth(1).fill('short')
    await dialog.locator('button[type="submit"]').click()

    // Should show error for short password (validation happens in dialog)
    await expect(dialog.getByText('at least 8 characters')).toBeVisible()
  })

  test('should save custom provider with multiple models', async ({ page }) => {
    // Select Custom provider type
    await page.getByRole('combobox').first().click()
    await page.waitForTimeout(500)
    await page.locator('[role="option"]:has-text("Custom")').first().click()

    // Enter API Key
    await page.locator('input[type="password"]').first().fill('sk-test-custom-key')

    // Enter Base URL
    await page.getByPlaceholder('https://api.example.com/v1').fill('https://api.custom-ai.com/v1')

    // Add first model
    const modelInput = page.getByPlaceholder('Add model ID')
    await modelInput.fill('gpt-4o-custom')
    await modelInput.press('Enter')
    await page.waitForTimeout(500)

    // Add second model
    await modelInput.fill('claude-3-custom')
    await modelInput.press('Enter')
    await page.waitForTimeout(500)

    // Verify both models appear
    await expect(page.locator('text=gpt-4o-custom').first()).toBeVisible()
    await expect(page.locator('text=claude-3-custom').first()).toBeVisible()

    // Select first model as default
    await page.getByRole('combobox').nth(1).click()
    await page.waitForTimeout(300)
    await page.locator('[role="option"]:has-text("gpt-4o-custom")').click()

    // Save the provider
    await page.getByRole('button', { name: 'SAVE' }).click()

    // Wait for master password dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10000 })

    // Fill password fields
    const passwordInputs = dialog.locator('input[type="password"]')
    await passwordInputs.first().fill('testpass123')
    await passwordInputs.nth(1).fill('testpass123')
    await dialog.locator('button[type="submit"]').click()

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1000)

    // Verify provider is saved
    await expect(page.getByText('ACTIVE PROVIDER')).toBeVisible({ timeout: 10000 })
    // Use more specific selector for provider name in the badge
    await expect(page.locator('.font-medium', { hasText: 'Custom' })).toBeVisible()
    await expect(page.getByText('gpt-4o-custom').first()).toBeVisible()
  })
})
