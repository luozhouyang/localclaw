// Integration test setup - runs before test imports

// Minimal Web Worker polyfill for Turso WASM
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  onmessageerror: ((e: MessageEvent) => void) | null = null

  constructor(public url: string | URL) {
    // Mock worker - sufficient for Turso WASM initialization check
  }

  postMessage(_message: unknown, _transfer?: Transferable[]): void {
    // Mock implementation
  }

  terminate(): void {
    // Mock implementation
  }

  addEventListener(_type: string, _listener: EventListener): void {
    // Mock implementation
  }

  removeEventListener(_type: string, _listener: EventListener): void {
    // Mock implementation
  }

  dispatchEvent(_event: Event): boolean {
    return true
  }

  // Node.js-style event emitter API (needed by emnapi)
  on(_event: string, _listener: (...args: unknown[]) => void): this {
    return this
  }

  once(_event: string, _listener: (...args: unknown[]) => void): this {
    return this
  }

  emit(_event: string, ..._args: unknown[]): boolean {
    return true
  }

  removeListener(_event: string, _listener: (...args: unknown[]) => void): this {
    return this
  }

  off(_event: string, _listener: (...args: unknown[]) => void): this {
    return this
  }
}

// Mock MessageChannel
class MockMessageChannel {
  port1 = {
    postMessage: () => {},
    onmessage: null as ((e: MessageEvent) => void) | null,
    close: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    start: () => {},
  }
  port2 = {
    postMessage: () => {},
    onmessage: null as ((e: MessageEvent) => void) | null,
    close: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    start: () => {},
  }
}

// Apply polyfills immediately (before any imports)
// @ts-expect-error - polyfill for Turso WASM
globalThis.Worker = MockWorker
// @ts-expect-error - polyfill for Turso WASM
globalThis.MessageChannel = MockMessageChannel

// Polyfill Blob.arrayBuffer if missing (jsdom doesn't implement it)
const OriginalBlob = globalThis.Blob
globalThis.Blob = class BlobWithArrayBuffer extends OriginalBlob {
  async arrayBuffer(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read blob as array buffer'))
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(this)
    })
  }
} as typeof Blob

// Now import vitest
import { beforeAll, afterAll } from 'vitest'

beforeAll(() => {
  // Additional setup before all integration tests
})

afterAll(() => {
  // Cleanup after all integration tests
})
