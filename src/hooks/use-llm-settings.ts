import { useCallback, useEffect, useState } from 'react'
import { providerConfigs } from '@/config/provider'
import { decryptWithPassword } from '@/lib/crypto'
import { useMasterPasswordContext } from '@/contexts/master-key-context'
import type { LLMProvider } from '@/types/llm'

const API_KEY_CACHE_KEY = 'provider:apikey'

// Session cache for decrypted API key
const sessionCache = new Map<string, string>()

export interface ProviderState {
  /** Provider 当前状态 */
  status: 'loading' | 'no_config' | 'ready'
  /** 已解锁的 provider */
  provider: LLMProvider | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
}

export function useLLMSettings() {
  const { status: mpStatus, currentPassword } = useMasterPasswordContext()

  const [state, setState] = useState<{
    provider: LLMProvider | null
    hasConfig: boolean
    isLoading: boolean
    error: string | null
  }>({
    provider: null,
    hasConfig: false,
    isLoading: true,
    error: null,
  })

  // Load provider config when master password is unlocked
  useEffect(() => {
    const loadProvider = async () => {
      // Wait for master password check
      if (mpStatus.state === 'checking') {
        setState(prev => ({ ...prev, isLoading: true }))
        return
      }

      // If not unlocked, we can't decrypt provider
      if (mpStatus.state !== 'unlocked') {
        setState({
          provider: null,
          hasConfig: false,
          isLoading: false,
          error: null,
        })
        return
      }

      setState(prev => ({ ...prev, isLoading: true }))

      try {
        const config = await providerConfigs.getProviderConfig()

        if (!config) {
          setState({
            provider: null,
            hasConfig: false,
            isLoading: false,
            error: null,
          })
          return
        }

        if (!config.encryptedApiKey) {
          setState({
            provider: null,
            hasConfig: true,
            isLoading: false,
            error: 'No API key configured',
          })
          return
        }

        // Try to get from session cache first
        let apiKey = sessionCache.get(API_KEY_CACHE_KEY)

        // If not cached, decrypt with master password
        if (!apiKey && currentPassword) {
          try {
            apiKey = await decryptWithPassword(config.encryptedApiKey, currentPassword)
            sessionCache.set(API_KEY_CACHE_KEY, apiKey)
          } catch {
            setState({
              provider: null,
              hasConfig: true,
              isLoading: false,
              error: 'Failed to decrypt API key',
            })
            return
          }
        }

        if (apiKey) {
          setState({
            provider: providerConfigs.buildProvider(config, apiKey),
            hasConfig: true,
            isLoading: false,
            error: null,
          })
        } else {
          setState({
            provider: null,
            hasConfig: true,
            isLoading: false,
            error: 'Failed to unlock provider',
          })
        }
      } catch (err) {
        setState({
          provider: null,
          hasConfig: false,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load provider',
        })
      }
    }

    loadProvider()
  }, [mpStatus, currentPassword])

  // Save provider config
  const saveProvider = useCallback(async (
    type: 'openrouter' | 'custom',
    baseURL: string,
    models: string[],
    defaultModel: string,
    apiKey: string,
    masterPassword: string
  ) => {
    // Encrypt API key with master password
    const encryptedKey = await decryptWithPassword(apiKey, masterPassword)
      .then(() => apiKey) // If we can "decrypt" (it was plaintext), use as-is
      .catch(() => encryptWithPassword(apiKey, masterPassword)) // Otherwise encrypt

    const config = await providerConfigs.saveProviderConfig(
      type,
      baseURL,
      models,
      defaultModel,
      encryptedKey
    )

    // Update state
    setState({
      provider: providerConfigs.buildProvider(config, apiKey),
      hasConfig: true,
      isLoading: false,
      error: null,
    })

    return config
  }, [])

  // Delete provider
  const deleteProvider = useCallback(async () => {
    try {
      await providerConfigs.deleteProvider()
      sessionCache.delete(API_KEY_CACHE_KEY)
      setState({
        provider: null,
        hasConfig: false,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      console.error('Failed to delete provider:', err)
      throw err
    }
  }, [])

  // Fetch OpenRouter models
  const fetchOpenRouterModels = useCallback(async (apiKey: string) => {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'LocalClaw',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch models')
    }

    const data = (await response.json()) as {
      data: Array<{ id: string; name?: string }>
    }
    return data.data.map((m) => ({
      id: m.id,
      name: m.name || m.id,
    }))
  }, [])

  const combinedStatus: ProviderState['status'] =
    state.isLoading || mpStatus.state === 'checking'
      ? 'loading'
      : !state.hasConfig
        ? 'no_config'
        : 'ready'

  return {
    status: combinedStatus,
    provider: state.provider,
    hasConfig: state.hasConfig,
    isLoading: state.isLoading || mpStatus.state === 'checking',
    error: state.error,
    saveProvider,
    deleteProvider,
    fetchOpenRouterModels,
  }
}

// Import for encryptWithPassword
import { encryptWithPassword } from '@/lib/crypto'
