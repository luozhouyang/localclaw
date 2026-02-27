import { getSettings, setSettings } from '@/storage/settings'
import {
  getProviderStorageKey,
  type LLMProvider,
  PROVIDER_TEMPLATES,
  STORAGE_KEYS,
} from '@/types/llm'
import { useCallback, useEffect, useState } from 'react'

export function useLLMSettings() {
  const [providers, setProviders] = useState<LLMProvider[]>([])
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all providers from storage
  const loadProviders = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const ids = await getSettings<string[]>(STORAGE_KEYS.PROVIDER_IDS)
      const activeId = await getSettings<string>(STORAGE_KEYS.ACTIVE_PROVIDER_ID)

      if (activeId) {
        setActiveProviderId(activeId)
      }

      if (!ids || ids.length === 0) {
        setProviders([])
      } else {
        const loadedProviders = await Promise.all(
          ids.map(async (id) => {
            const provider = await getSettings<LLMProvider>(getProviderStorageKey(id))
            return provider
          })
        )
        const validProviders = loadedProviders.filter(Boolean) as LLMProvider[]
        // Add isActive flag based on activeProviderId
        const providersWithActive = validProviders.map(p => ({
          ...p,
          isActive: p.id === activeId
        }))
        setProviders(providersWithActive)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers')
      console.error('Failed to load providers:', err)
      setProviders([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load providers on mount
  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  // Get active provider
  const activeProvider = providers.find(p => p.id === activeProviderId) || null

  // Set active provider
  const setActiveProvider = useCallback(async (id: string | null) => {
    try {
      if (id) {
        await setSettings(STORAGE_KEYS.ACTIVE_PROVIDER_ID, id)
      } else {
        await setSettings(STORAGE_KEYS.ACTIVE_PROVIDER_ID, null as unknown as string)
      }

      setActiveProviderId(id)

      // Update local state to reflect active status
      setProviders((prev) =>
        prev.map((p) => ({
          ...p,
          isActive: p.id === id,
        }))
      )

      return true
    } catch (err) {
      console.error('Failed to set active provider:', err)
      throw err
    }
  }, [])

  // Get a single provider by ID
  const getProvider = useCallback(async (id: string): Promise<LLMProvider | null> => {
    return await getSettings<LLMProvider>(getProviderStorageKey(id))
  }, [])

  // Save a provider
  const saveProvider = useCallback(async (provider: LLMProvider) => {
    try {
      // Save the provider
      await setSettings(getProviderStorageKey(provider.id), provider)

      // Update IDs list if it's a new provider
      const ids = (await getSettings<string[]>(STORAGE_KEYS.PROVIDER_IDS)) || []
      if (!ids.includes(provider.id)) {
        await setSettings(STORAGE_KEYS.PROVIDER_IDS, [...ids, provider.id])
      }

      // Update local state
      setProviders((prev) => {
        const index = prev.findIndex((p) => p.id === provider.id)
        const providerWithActive = {
          ...provider,
          isActive: provider.id === activeProviderId
        }
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = providerWithActive
          return updated
        }
        return [...prev, providerWithActive]
      })

      return true
    } catch (err) {
      console.error('Failed to save provider:', err)
      throw err
    }
  }, [activeProviderId])

  // Delete a provider
  const deleteProvider = useCallback(async (id: string) => {
    try {
      // Remove provider data (set to null)
      await setSettings(getProviderStorageKey(id), null as unknown as LLMProvider)

      // Update IDs list
      const ids = (await getSettings<string[]>(STORAGE_KEYS.PROVIDER_IDS)) || []
      await setSettings(
        STORAGE_KEYS.PROVIDER_IDS,
        ids.filter((i) => i !== id)
      )

      // If deleting active provider, clear active provider
      if (activeProviderId === id) {
        await setSettings(STORAGE_KEYS.ACTIVE_PROVIDER_ID, null as unknown as string)
        setActiveProviderId(null)
      }

      // Update local state
      setProviders((prev) => prev.filter((p) => p.id !== id))

      return true
    } catch (err) {
      console.error('Failed to delete provider:', err)
      throw err
    }
  }, [activeProviderId])

  // Create a new provider from template
  const createProviderFromTemplate = useCallback(
    (templateId: string, customId?: string): LLMProvider | null => {
      const template = PROVIDER_TEMPLATES.find((t) => t.id === templateId)
      if (!template) return null

      return {
        id: customId || `${template.id}-${Date.now()}`,
        name: template.name,
        baseURL: template.baseURL,
        apiKey: '',
        models: [...template.models],
        defaultModel: template.defaultModel,
        isActive: false,
      }
    },
    []
  )

  // Create a custom provider
  const createCustomProvider = useCallback((): LLMProvider => {
    return {
      id: `custom-${Date.now()}`,
      name: 'Custom Provider',
      baseURL: '',
      apiKey: '',
      models: [],
      defaultModel: '',
      isActive: false,
    }
  }, [])

  return {
    providers,
    activeProvider,
    activeProviderId,
    isLoading,
    error,
    reload: loadProviders,
    getProvider,
    saveProvider,
    deleteProvider,
    setActiveProvider,
    createProviderFromTemplate,
    createCustomProvider,
  }
}
