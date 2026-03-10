import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { MasterKeyProvider, useMasterPasswordContext, CREDENTIAL_ID, __resetSessionPasswordForTest } from '@/contexts/master-key-context'
import { providerConfigs } from '@/config/provider'
import type { StoredProviderConfig } from '@/config/provider'

// Mock crypto functions
vi.mock('@/lib/crypto', () => ({
  encryptWithPassword: vi.fn(async (data: string) => `encrypted:${data}`),
  decryptWithPassword: vi.fn(async (encrypted: string, password: string) => {
    if (encrypted.startsWith('encrypted:')) {
      return encrypted.replace('encrypted:', '')
    }
    if (encrypted.startsWith('valid-encrypted:') && password === 'correctpassword') {
      return 'decrypted-api-key'
    }
    if (encrypted.startsWith('valid-encrypted:') && password === 'correct-password') {
      return 'decrypted-api-key'
    }
    if (encrypted.startsWith('valid-encrypted:') && password === 'validpassword') {
      return 'decrypted-api-key'
    }
    throw new Error('Invalid password')
  }),
  generateSaltAndIV: vi.fn(() => ({
    salt: new Uint8Array(16),
    iv: new Uint8Array(12),
  })),
}))

// Mock provider configs
vi.mock('@/config/provider', () => ({
  providerConfigs: {
    getProviderConfig: vi.fn(),
    saveProviderConfig: vi.fn(),
    deleteProvider: vi.fn(),
    hasProviderConfig: vi.fn(),
    hasEncryptedApiKey: vi.fn(),
    buildProvider: vi.fn(),
  },
}))

// Mock Credential Management API
const mockCredentialStore = vi.fn()
const mockCredentialGet = vi.fn()

// Mock PasswordCredential constructor
class MockPasswordCredential {
  id: string
  password: string
  type = 'password' as const

  constructor(data: { id: string; password: string }) {
    this.id = data.id
    this.password = data.password
  }
}

beforeEach(() => {
  // Reset session password to avoid state leakage between tests
  __resetSessionPasswordForTest()

  // Mock secure context for Credential Management API
  Object.defineProperty(global.window, 'isSecureContext', {
    value: true,
    writable: true,
    configurable: true,
  })

  // Mock PasswordCredential
  Object.defineProperty(global, 'PasswordCredential', {
    value: MockPasswordCredential,
    writable: true,
    configurable: true,
  })

  // Setup mock navigator.credentials
  Object.defineProperty(global.navigator, 'credentials', {
    value: {
      store: mockCredentialStore,
      get: mockCredentialGet,
    },
    writable: true,
  })
})

/**
 * Helper to render hook within MasterKeyProvider
 */
function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <MasterKeyProvider>{children}</MasterKeyProvider>
  )
}

describe('MasterKeyContext', () => {
  describe('initialization', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockCredentialStore.mockReset()
      mockCredentialGet.mockReset()
    })

    it('should start with checking state', async () => {
      // Mock no provider config
      vi.mocked(providerConfigs.getProviderConfig).mockResolvedValue(null)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Initial state should be checking
      expect(result.current.status.state).toBe('checking')
      expect(result.current.isLoading).toBe(true)
    })

    it('should transition to not_set when no provider config exists', async () => {
      // Mock no provider config
      vi.mocked(providerConfigs.getProviderConfig).mockResolvedValue(null)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.status.state).toBe('not_set')
    })

    it('should transition to not_set when provider config exists but no encrypted API key', async () => {
      // Mock provider config without encrypted API key
      vi.mocked(providerConfigs.getProviderConfig).mockResolvedValue({
        id: 'openrouter' as const,
        baseURL: 'https://openrouter.ai/api/v1',
        models: ['openai/gpt-4'],
        defaultModel: 'openai/gpt-4',
        encryptedApiKey: '',
      } as StoredProviderConfig)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.status.state).toBe('not_set')
    })

    it('should transition to locked when provider config with encrypted API key exists', async () => {
      // Mock provider config with encrypted API key
      vi.mocked(providerConfigs.getProviderConfig).mockResolvedValue({
        id: 'openrouter' as const,
        baseURL: 'https://openrouter.ai/api/v1',
        models: ['openai/gpt-4'],
        defaultModel: 'openai/gpt-4',
        encryptedApiKey: 'valid-encrypted:api-key',
      } as StoredProviderConfig)

      // Mock credential manager returns nothing
      mockCredentialGet.mockResolvedValue({ type: 'password', id: 'other-id', password: '' })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 6000 })

      expect(result.current.status.state).toBe('locked')
      expect(result.current.status.hasProviderConfig).toBe(true)
    })

    it('should auto-unlock when credential manager returns valid password', async () => {
      // Mock provider config with encrypted API key
      vi.mocked(providerConfigs.getProviderConfig).mockResolvedValue({
        id: 'openrouter' as const,
        baseURL: 'https://openrouter.ai/api/v1',
        models: ['openai/gpt-4'],
        defaultModel: 'openai/gpt-4',
        encryptedApiKey: 'valid-encrypted:api-key',
      } as StoredProviderConfig)

      // Mock credential manager returns valid password with correct ID
      mockCredentialGet.mockResolvedValue({
        type: 'password',
        id: CREDENTIAL_ID,
        password: 'correct-password',
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.status.state).toBe('unlocked')
      }, { timeout: 8000 })

      expect(result.current.status.state).toBe('unlocked')
      expect(result.current.currentPassword).toBe('correct-password')
    }, 10000)
  })

  describe('timeout handling', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockCredentialStore.mockReset()
      mockCredentialGet.mockReset()
    })

    it('should handle timeout gracefully and transition to locked state', async () => {
      // Mock provider config to never resolve (simulate hang)
      vi.mocked(providerConfigs.getProviderConfig).mockImplementation(
        () => new Promise(() => {
          // Never resolve - simulate timeout
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for timeout (5 seconds) + buffer
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 8000, interval: 500 })

      // Should fall back to locked state on timeout
      expect(result.current.status.state).toBe('locked')
    }, 10000)

    it('should handle errors gracefully and transition to locked state', async () => {
      // Mock provider config to throw error
      vi.mocked(providerConfigs.getProviderConfig).mockRejectedValue(
        new Error('Database connection failed')
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should fall back to locked state on error
      expect(result.current.status.state).toBe('locked')
      expect(result.current.status.lastError).toContain('Database connection failed')
    })
  })

  describe('setMasterKey', () => {
    beforeEach(() => {
      // Reset all mocks
      vi.clearAllMocks()
      mockCredentialStore.mockReset()
      mockCredentialGet.mockReset()

      // Mock provider config with encrypted API key (provider already setup)
      vi.mocked(providerConfigs.getProviderConfig).mockResolvedValue({
        id: 'openrouter' as const,
        baseURL: 'https://openrouter.ai/api/v1',
        models: ['openai/gpt-4'],
        defaultModel: 'openai/gpt-4',
        encryptedApiKey: 'valid-encrypted:api-key',
      } as StoredProviderConfig)

      // Mock credential manager returns nothing (force locked state)
      mockCredentialGet.mockResolvedValue({ type: 'password', id: 'other-id', password: '' })

      // Mock credential store success
      mockCredentialStore.mockResolvedValue(undefined)
    })

    it('should reject when passwords do not match', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Call setMasterKey
      const success = await result.current.setMasterKey('password1', 'password2')

      expect(success).toBe(false)
      // Error is set but may need to wait for state update
      await waitFor(() => {
        expect(result.current.error).toBe('Passwords do not match')
      })
    })

    it('should reject when password is too short', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const success = await result.current.setMasterKey('short', 'short')

      expect(success).toBe(false)
      await waitFor(() => {
        expect(result.current.error).toBe('Password must be at least 8 characters')
      })
    })

    it('should accept valid password and transition to unlocked', async () => {
      mockCredentialStore.mockResolvedValue(undefined)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const success = await result.current.setMasterKey('validpassword', 'validpassword')

      expect(success).toBe(true)
      await waitFor(() => {
        expect(result.current.status.state).toBe('unlocked')
      })
      expect(result.current.currentPassword).toBe('validpassword')
      expect(mockCredentialStore).toHaveBeenCalled()
    })
  })

  describe('unlock', () => {
    beforeEach(() => {
      // Reset all mocks
      vi.clearAllMocks()
      mockCredentialStore.mockReset()
      mockCredentialGet.mockReset()

      // Mock provider config with encrypted API key
      vi.mocked(providerConfigs.getProviderConfig).mockResolvedValue({
        id: 'openrouter' as const,
        baseURL: 'https://openrouter.ai/api/v1',
        models: ['openai/gpt-4'],
        defaultModel: 'openai/gpt-4',
        encryptedApiKey: 'valid-encrypted:api-key',
      } as StoredProviderConfig)

      // Mock credential manager returns nothing (no saved password)
      mockCredentialGet.mockResolvedValue({ type: 'password', id: 'other-id', password: '' })

      // Mock credential store success
      mockCredentialStore.mockResolvedValue(undefined)
    })

    it('should reject invalid password', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 6000 })

      expect(result.current.status.state).toBe('locked')

      const success = await result.current.unlock('wrongpassword')

      expect(success).toBe(false)
      await waitFor(() => {
        expect(result.current.error).toBe('Invalid password')
      })
    })

    it('should accept valid password and transition to unlocked', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 6000 })

      expect(result.current.status.state).toBe('locked')

      const success = await result.current.unlock('correctpassword', true)

      expect(success).toBe(true)
      await waitFor(() => {
        expect(result.current.status.state).toBe('unlocked')
      })
      expect(mockCredentialStore).toHaveBeenCalled()
    })
  })

  describe('lock', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      __resetSessionPasswordForTest()
      mockCredentialStore.mockReset()
      mockCredentialGet.mockReset()

      // Mock provider config with encrypted API key
      vi.mocked(providerConfigs.getProviderConfig).mockResolvedValue({
        id: 'openrouter' as const,
        baseURL: 'https://openrouter.ai/api/v1',
        models: ['openai/gpt-4'],
        defaultModel: 'openai/gpt-4',
        encryptedApiKey: 'valid-encrypted:api-key',
      } as StoredProviderConfig)

      // Mock credential store success
      mockCredentialStore.mockResolvedValue(undefined)
    })

    it('should transition to locked state and clear session password', async () => {
      // Mock credential manager returns valid password for auto-unlock
      mockCredentialGet.mockResolvedValue({
        type: 'password',
        id: CREDENTIAL_ID,
        password: 'correct-password',
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for auto-unlock
      await waitFor(() => {
        expect(result.current.status.state).toBe('unlocked')
      }, { timeout: 8000 })

      // Lock
      act(() => {
        result.current.lock()
      })

      expect(result.current.status.state).toBe('locked')
      expect(result.current.currentPassword).toBeNull()
    }, 10000)
  })

  describe('reset', () => {
    beforeEach(() => {
      // Reset all mocks
      vi.clearAllMocks()
      mockCredentialStore.mockReset()
      mockCredentialGet.mockReset()
    })

    it('should delete provider config and transition to not_set', async () => {
      // Mock provider config with encrypted API key
      vi.mocked(providerConfigs.getProviderConfig).mockResolvedValue({
        id: 'openrouter' as const,
        baseURL: 'https://openrouter.ai/api/v1',
        models: ['openai/gpt-4'],
        defaultModel: 'openai/gpt-4',
        encryptedApiKey: 'valid-encrypted:api-key',
      } as StoredProviderConfig)

      vi.mocked(providerConfigs.deleteProvider).mockResolvedValue()

      // Mock credential manager returns nothing
      mockCredentialGet.mockResolvedValue({ type: 'password', id: 'other-id', password: '' })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useMasterPasswordContext(), { wrapper })

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Reset
      await result.current.reset()

      expect(providerConfigs.deleteProvider).toHaveBeenCalled()
      await waitFor(() => {
        expect(result.current.status.state).toBe('not_set')
      })
    })
  })
})
