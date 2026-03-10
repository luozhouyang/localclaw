import { createStart, createMiddleware } from '@tanstack/react-start'

// Global middleware to add COOP/COEP headers for SharedArrayBuffer support (required for OPFS)
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
const crossOriginIsolationMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next()

  // Add COOP/COEP headers for SharedArrayBuffer support
  result.response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  result.response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')

  return result
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [crossOriginIsolationMiddleware],
  }
})
