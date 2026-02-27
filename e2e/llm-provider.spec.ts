import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and wait for page to load
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should display dashboard with tabs', async ({ page }) => {
    // Verify dashboard heading
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Verify all tabs are present
    await expect(page.getByRole('tab', { name: 'Chat' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Files' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Tasks' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible()
  })
})

test.describe('LLM Provider Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Navigate to Settings tab
    await page.getByRole('tab', { name: 'Settings' }).click()
    await page.waitForTimeout(500)
  })

  test('should display LLM Provider section', async ({ page }) => {
    // Verify LLM Provider card is visible
    await expect(page.getByRole('heading', { name: 'LLM Provider' })).toBeVisible()
    await expect(page.getByText('Configure your AI model providers')).toBeVisible()
  })

  test('should add a custom provider with valid name', async ({ page }) => {
    // Click Custom button to add a new provider
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.waitForTimeout(300)

    // Expand the new provider accordion
    await page.getByRole('button', { name: 'Custom Provider', exact: true }).click()
    await page.waitForTimeout(300)

    // Verify validation hint is shown
    await expect(page.getByText('Only letters and numbers allowed (no spaces or special characters)')).toBeVisible()

    // Clear and enter a valid provider name
    const nameInput = page.getByPlaceholder('MyOpenAI')
    await nameInput.clear()
    await nameInput.fill('MyTestProvider123')

    // Add a model
    const modelInput = page.getByPlaceholder('Add new model (e.g., gpt-4o)')
    await modelInput.fill('gpt-4o')
    await modelInput.press('Enter')

    // Verify model is added
    await expect(page.getByText('gpt-4o')).toBeVisible()

    // Save the provider
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForTimeout(500)

    // Verify provider is saved (should show Edit button instead of Save)
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
  })

  test('should validate provider name - reject names with spaces', async ({ page }) => {
    // Click Custom button
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.waitForTimeout(300)

    // Expand the provider
    await page.getByRole('button', { name: 'Custom Provider', exact: true }).click()
    await page.waitForTimeout(300)

    // Try to save with invalid name (with space)
    const nameInput = page.getByPlaceholder('MyOpenAI')
    await nameInput.clear()
    await nameInput.fill('Invalid Name')

    await page.getByRole('button', { name: 'Save', exact: true }).click()

    // Verify error message is shown
    await expect(page.getByText('Provider name must contain only letters and numbers (no spaces or special characters)')).toBeVisible()
  })

  test('should activate and deactivate provider', async ({ page }) => {
    // First add a provider
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.waitForTimeout(300)

    // Expand and save a valid provider
    await page.getByRole('button', { name: 'Custom Provider', exact: true }).click()
    await page.waitForTimeout(300)

    const nameInput = page.getByPlaceholder('MyOpenAI')
    await nameInput.clear()
    await nameInput.fill('ActiveTestProvider')

    // Add model and save
    const modelInput = page.getByPlaceholder('Add new model (e.g., gpt-4o)')
    await modelInput.fill('gpt-4o')
    await modelInput.press('Enter')

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForTimeout(500)

    // Collapse and expand to get fresh state
    await page.getByRole('button', { name: 'ActiveTestProvider' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'ActiveTestProvider' }).click()
    await page.waitForTimeout(300)

    // Activate the provider using the power button in the header
    await page.getByRole('button', { name: 'Activate' }).click()
    await page.waitForTimeout(500)

    // Verify active indicator is shown
    await expect(page.getByText('Active: ActiveTestProvider')).toBeVisible()

    // Verify Active badge is shown on the provider
    await expect(page.getByText('Active').first()).toBeVisible()

    // Deactivate the provider
    await page.getByRole('button', { name: 'Deactivate' }).click()
    await page.waitForTimeout(500)

    // Verify active indicator is removed
    await expect(page.getByText('Active: ActiveTestProvider')).not.toBeVisible()
  })

  test('should manage models in provider', async ({ page }) => {
    // Add a provider
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.waitForTimeout(300)

    // Expand the provider
    await page.getByRole('button', { name: 'Custom Provider', exact: true }).click()
    await page.waitForTimeout(300)

    // Add first model
    const modelInput = page.getByPlaceholder('Add new model (e.g., gpt-4o)')
    await modelInput.fill('gpt-4o')
    await modelInput.press('Enter')
    await page.waitForTimeout(300)

    // Verify first model is added and set as default
    await expect(page.getByText('gpt-4o')).toBeVisible()

    // Add second model
    await modelInput.fill('claude-3-sonnet')
    await modelInput.press('Enter')
    await page.waitForTimeout(300)

    // Verify second model is added
    await expect(page.getByText('claude-3-sonnet')).toBeVisible()

    // Set second model as default
    const modelItems = page.locator('div', { hasText: /^claude-3-sonnet$/ })
    await modelItems.first().getByRole('button').first().click()
    await page.waitForTimeout(300)

    // Verify default badge moved to second model
    await expect(page.getByText('(default)')).toBeVisible()
  })

  test('should delete provider', async ({ page }) => {
    // Add a provider
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.waitForTimeout(300)

    // Verify provider is added
    await expect(page.getByRole('button', { name: 'Custom Provider', exact: true })).toBeVisible()

    // Click delete button in the provider header
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await page.waitForTimeout(500)

    // Verify provider is removed
    await expect(page.getByRole('button', { name: 'Custom Provider', exact: true })).not.toBeVisible()
  })

  test('should prevent duplicate provider names', async ({ page }) => {
    // Add first provider
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.waitForTimeout(300)

    await page.getByRole('button', { name: 'Custom Provider', exact: true }).click()
    await page.waitForTimeout(300)

    const nameInput = page.getByPlaceholder('MyOpenAI')
    await nameInput.clear()
    await nameInput.fill('DuplicateTest')

    const modelInput = page.getByPlaceholder('Add new model (e.g., gpt-4o)')
    await modelInput.fill('gpt-4o')
    await modelInput.press('Enter')

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForTimeout(500)

    // Try to add another provider with same name
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.waitForTimeout(300)

    // Try to save with duplicate name
    await page.getByRole('button', { name: 'Custom Provider', exact: true }).click()
    await page.waitForTimeout(300)

    const newNameInput = page.getByPlaceholder('MyOpenAI').last()
    await newNameInput.clear()
    await newNameInput.fill('DuplicateTest')

    await page.getByRole('button', { name: 'Save', exact: true }).last().click()

    // Verify error message about duplicate
    await expect(page.getByText(/already exists/)).toBeVisible()
  })
})
