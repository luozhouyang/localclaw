import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Unit tests are in tests/ directory
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'e2e',           // E2E tests
      'integration_tests', // Integration tests
    ],
    // Suppress act warnings for async state updates in useEffect
    // These are expected and don't affect test correctness
    silent: true,
    onConsoleLog: (log) => {
      // Filter out act warnings from testing-library
      if (log.includes('not wrapped in act')) {
        return false
      }
      return true
    },
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './src/'),
    },
  },
})
