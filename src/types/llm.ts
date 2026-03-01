export interface LLMProvider {
  id: string
  name: string
  baseURL: string
  apiKey: string
  models: string[]  // 支持多个模型
  defaultModel: string  // 默认选中的模型
  isActive?: boolean
}

export type ProviderType = 'openrouter' | 'custom'

export const OPENROUTER_CONFIG = {
  id: 'openrouter' as const,
  name: 'OpenRouter',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultModel: 'anthropic/claude-3.5-sonnet',
}

export const CUSTOM_PROVIDER_CONFIG = {
  id: 'custom' as const,
  name: 'Custom',
  baseURL: '',
  defaultModel: '',
}
