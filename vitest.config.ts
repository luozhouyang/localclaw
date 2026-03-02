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
    include: ['tests/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'e2e',           // E2E tests
      'integration_tests', // Integration tests
    ],
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './src/'),
    },
  },
})
