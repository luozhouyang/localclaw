import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    // Integration tests are in integration_tests/ directory
    include: ['integration_tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
})
