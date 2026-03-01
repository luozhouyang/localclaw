import { useCallback, useEffect, useState } from 'react'
import { providerConfigs } from '@/config/provider'
import {
  type LLMProvider,
  PROVIDER_TEMPLATES,
} from '@/types/llm'

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
      const [allProviders, activeId] = await Promise.all([
        providerConfigs.getAllProviders(),
        providerConfigs.getActiveProviderId(),
      ])

      if (activeId) {
        setActiveProviderId(activeId)
      }

      // Add isActive flag based on activeProviderId
      const providersWithActive = allProviders.map(p => ({
        ...p,
        isActive: p.id === activeId
      }))
      setProviders(providersWithActive)
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
      await providerConfigs.setActiveProviderId(id)
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
    return providerConfigs.getProvider(id)
  }, [])

  // Save a provider
  const saveProvider = useCallback(async (provider: LLMProvider) => {
    try {
      // Save the provider
      await providerConfigs.saveProvider(provider)

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
      await providerConfigs.deleteProvider(id)

      // If deleting active provider, clear local state
      if (activeProviderId === id) {
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
    const timestamp = Date.now()
    return {
      id: `custom${timestamp}`,
      name: `CustomProvider${timestamp}`,
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
