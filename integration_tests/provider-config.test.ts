import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the fs module before importing provider
const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('@/infra/fs', () => ({
  getKV: vi.fn(() => Promise.resolve({
    get: mockGet,
    set: mockSet,
    delete: vi.fn(),
    has: vi.fn(),
    getKeys: vi.fn(() => Promise.resolve([])),
    trackKey: vi.fn(),
    untrackKey: vi.fn(),
  })),
}))

// Import after mocking
import { providerConfigs } from '@/config/provider'

describe('provider config integration', () => {
  beforeEach(async () => {
    // Reset mocks
    mockGet.mockReset()
    mockSet.mockReset()
  })

  afterEach(async () => {
    // Clean up after test
    vi.clearAllMocks()
  })

  it('should save and retrieve provider config', async () => {
    const mockConfig = {
      id: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1',
      models: ['anthropic/claude-3.5-sonnet'],
      defaultModel: 'anthropic/claude-3.5-sonnet',
      encryptedApiKey: 'encrypted-api-key-here',
    }

    // Always return the mock config for get calls
    mockGet.mockResolvedValue(mockConfig)

    const config = await providerConfigs.saveProviderConfig(
      'openrouter',
      'https://openrouter.ai/api/v1',
      ['anthropic/claude-3.5-sonnet'],
      'anthropic/claude-3.5-sonnet',
      'encrypted-api-key-here'
    )

    expect(config.id).toBe('openrouter')
    expect(config.baseURL).toBe('https://openrouter.ai/api/v1')
    expect(config.defaultModel).toBe('anthropic/claude-3.5-sonnet')

    // Verify set was called
    expect(mockSet).toHaveBeenCalledWith('llm:provider:config', expect.objectContaining({
      id: 'openrouter',
      encryptedApiKey: 'encrypted-api-key-here',
    }))

    const retrieved = await providerConfigs.getProviderConfig()
    expect(retrieved).not.toBeNull()
    expect(retrieved?.id).toBe('openrouter')
  })

  it('should return null when no config exists', async () => {
    mockGet.mockResolvedValueOnce(null)

    const config = await providerConfigs.getProviderConfig()
    expect(config).toBeNull()
  })

  it('should delete provider config', async () => {
    mockSet.mockResolvedValueOnce(undefined)

    await providerConfigs.deleteProvider()

    expect(mockSet).toHaveBeenCalledWith('llm:provider:config', null)
  })

  it('should check if provider config exists', async () => {
    mockGet.mockResolvedValueOnce({ id: 'openrouter' })

    const exists = await providerConfigs.hasProviderConfig()
    expect(exists).toBe(true)
  })
})
