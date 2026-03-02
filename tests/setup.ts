// Test setup file for vitest
// Add global mocks and setup here

// Mock crypto for tests if needed
if (!globalThis.crypto) {
  throw new Error('Crypto API not available')
}
