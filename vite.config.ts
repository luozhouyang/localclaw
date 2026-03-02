/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'
import { fileURLToPath } from 'url'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Plugin to add COOP/COEP headers for SharedArrayBuffer support
const crossOriginIsolation = () => ({
  name: 'cross-origin-isolation',
  configureServer: (server: any) => {
    server.middlewares.use((_req: any, res: any, next: any) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
      next()
    })
  },
})


// Plugin to copy AlmostNode worker file to public directory for build
const copyAlmostNodeWorker = () => ({
  name: 'copy-almostnode-worker',
  async buildStart() {
    const fs = await import('fs/promises')
    const source = path.resolve(__dirname, 'node_modules/almostnode/dist/assets/runtime-worker-D6Dmsis4.js')
    const destDir = path.resolve(__dirname, 'public/assets')
    const dest = path.join(destDir, 'runtime-worker-D6Dmsis4.js')

    try {
      await fs.access(source)
      await fs.mkdir(destDir, { recursive: true })
      await fs.copyFile(source, dest)
      console.log('[vite-plugin] Copied AlmostNode worker to public/assets/')
    } catch (err) {
      console.warn('[vite-plugin] Could not copy AlmostNode worker:', err instanceof Error ? err.message : String(err))
    }
  },
})

const config = defineConfig({
  plugins: [
    // TanStack plugins must come before React for proper JSX transformation
    tanstackStart(),
    devtools({
      // Disable source attribute injection to avoid hydration mismatch
      source: false,
    }),
    // React plugin after TanStack
    viteReact(),
    // Other plugins
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    copyAlmostNodeWorker(),
    crossOriginIsolation(),
  ],
  resolve: {
    alias: [
      { find: 'node:zlib', replacement: 'browserify-zlib' },
    ],
  },
  ssr: {
    noExternal: ['@tanstack/router-core'],
  },
  define: {
    // 'global.Buffer': 'Buffer',
  },
  optimizeDeps: {
    include: ['monaco-editor'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [],
    },
    assetsDir: 'assets',
    // Copy public assets (including the worker file) to dist
    copyPublicDir: true,
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: [],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    deps: {
      optimizer: {
        web: {
          include: ['vitest-canvas-mock'],
        },
      },
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        execArgv: ['--experimental-vm-modules'],
      },
    },
  },
})

export default config
