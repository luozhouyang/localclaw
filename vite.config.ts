import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'url'
import path from 'path'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

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

// Plugin to resolve agentfs-sdk to browser version
const resolveAgentFSSDK = () => ({
  name: 'resolve-agentfs-sdk',
  enforce: 'pre',
  resolveId(id: string) {
    if (id === 'agentfs-sdk') {
      return path.resolve(__dirname, 'node_modules/agentfs-sdk/dist/index_browser.js')
    }
    if (id === 'agentfs-sdk/just-bash') {
      return path.resolve(__dirname, 'node_modules/agentfs-sdk/dist/integrations/just-bash/index.js')
    }
    return null
  },
})

// Plugin to resolve @tursodatabase/database to the wasm version
const resolveDatabase = () => ({
  name: 'resolve-database',
  enforce: 'pre',
  resolveId(id: string) {
    if (id === '@tursodatabase/database') {
      return path.resolve(__dirname, 'node_modules/.pnpm/@tursodatabase+database-wasm@0.4.4/node_modules/@tursodatabase/database-wasm/dist/promise-default.js')
    }
    return null
  },
})

// Plugin to resolve buffer to the npm package
const resolveBuffer = () => ({
  name: 'resolve-buffer',
  enforce: 'pre',
  resolveId(id: string) {
    if (id === 'buffer') {
      return path.resolve(__dirname, 'node_modules/.pnpm/buffer@6.0.3/node_modules/buffer/index.js')
    }
    return null
  },
})

const config = defineConfig({
  plugins: [
    // resolveAgentFSSDK(),
    // resolveDatabase(),
    // resolveBuffer(),
    crossOriginIsolation(),
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
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
    // include: ['buffer'],
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
  },
})

export default config
