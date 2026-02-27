# E2E Tests

This directory contains end-to-end tests using Playwright.

## Setup

Install Playwright browsers:

```bash
pnpm exec playwright install
```

## Running Tests

### Run all E2E tests
```bash
pnpm test:e2e
```

### Run tests with UI mode (for debugging)
```bash
pnpm test:e2e:ui
```

### Run tests in debug mode
```bash
pnpm test:e2e:debug
```

### Run specific test file
```bash
pnpm exec playwright test e2e/llm-provider.spec.ts
```

## Test Coverage

### LLM Provider Tests (`llm-provider.spec.ts`)

- **Dashboard Navigation**: Verifies dashboard loads with all tabs
- **Provider Creation**: Tests adding custom providers with valid names
- **Name Validation**: Rejects names with spaces or special characters
- **Provider Activation**: Tests activate/deactivate functionality
- **Model Management**: Add/remove models and set default model
- **Provider Deletion**: Tests deleting providers
- **Duplicate Prevention**: Prevents creating providers with duplicate names

## Test Data

Tests use isolated browser contexts and clean up after themselves. Each test:
1. Navigates to `/dashboard`
2. Interacts with the Settings tab
3. Creates/modifies providers as needed
4. Validates expected behavior

## Troubleshooting

### Tests fail due to timeout
Increase the timeout in `playwright.config.ts` or run with `--timeout` flag:
```bash
pnpm exec playwright test --timeout=60000
```

### Browser not found
Install Playwright browsers:
```bash
pnpm exec playwright install chromium
```

### Tests fail intermittently
Add retries:
```bash
pnpm exec playwright test --retries=2
```
