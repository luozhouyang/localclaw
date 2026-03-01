import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
// import { fileURLToPath } from 'url'
// import path from 'path'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

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
