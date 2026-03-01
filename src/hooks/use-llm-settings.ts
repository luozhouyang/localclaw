import { useCallback, useEffect, useState } from 'react'
import { providerConfigs } from '@/config/provider'
import {
  decryptWithPassword,
  getSessionMasterPassword,
  getCachedDecryptedValue,
  cacheDecryptedValue,
} from '@/lib/crypto'
import {
  type LLMProvider,
  type ProviderType,
  OPENROUTER_CONFIG,
} from '@/types/llm'

const API_KEY_CACHE_KEY = 'provider:apikey'

export function useLLMSettings() {
  const [provider, setProvider] = useState<LLMProvider | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load provider from storage
  const loadProvider = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const config = await providerConfigs.getProviderConfig()
      if (!config) {
        setProvider(null)
        setIsLoading(false)
        return
      }

      // Check if we have encrypted API key
      if (!config.encryptedApiKey) {
        setProvider(null)
        setIsLoading(false)
        return
      }

      // Check session cache first
      const cachedKey = getCachedDecryptedValue(API_KEY_CACHE_KEY)
      if (cachedKey) {
        setProvider(providerConfigs.buildProvider(config, cachedKey))
        setIsLoading(false)
        return
      }

      // Check session master password
      const sessionPassword = getSessionMasterPassword()
      if (sessionPassword) {
        try {
          const decryptedKey = await decryptWithPassword(config.encryptedApiKey, sessionPassword)
          cacheDecryptedValue(API_KEY_CACHE_KEY, decryptedKey)
          setProvider(providerConfigs.buildProvider(config, decryptedKey))
          setIsLoading(false)
          return
        } catch {
          // Session password invalid, will need to unlock
        }
      }

      // We have config but need password to decrypt API key
      setProvider(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider')
      console.error('Failed to load provider:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadProvider()
  }, [loadProvider])

  // Unlock provider with master password
  const unlockProvider = useCallback(async (password: string) => {
    try {
      const config = await providerConfigs.getProviderConfig()
      if (!config) return null

      if (!config.encryptedApiKey) return null

      const decryptedKey = await decryptWithPassword(config.encryptedApiKey, password)
      cacheDecryptedValue(API_KEY_CACHE_KEY, decryptedKey)

      const provider = providerConfigs.buildProvider(config, decryptedKey)
      setProvider(provider)
      return provider
    } catch (err) {
      console.error('Failed to unlock provider:', err)
      throw new Error('Invalid master password')
    }
  }, [])

  // Delete provider
  const deleteProvider = useCallback(async () => {
    try {
      await providerConfigs.deleteProvider()
      setProvider(null)
    } catch (err) {
      console.error('Failed to delete provider:', err)
      throw err
    }
  }, [])

  // Get available models from OpenRouter
  const fetchOpenRouterModels = useCallback(async (apiKey: string) => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'LocalClaw',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }

      const data = await response.json() as { data: Array<{ id: string; name?: string }> }
      return data.data.map((m) => ({
        id: m.id,
        name: m.name || m.id,
      }))
    } catch (err) {
      console.error('Failed to fetch OpenRouter models:', err)
      throw err
    }
  }, [])

  return {
    provider,
    isLoading,
    error,
    reload: loadProvider,
    unlockProvider,
    deleteProvider,
    fetchOpenRouterModels,
  }
}
