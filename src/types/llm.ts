export interface LLMProvider {
  id: string
  name: string
  baseURL: string
  apiKey: string
  models: string[]
  defaultModel: string
  isActive?: boolean
}

export interface LLMProviderTemplate {
  id: string
  name: string
  baseURL: string
  models: string[]
  defaultModel: string
}

export const PROVIDER_TEMPLATES: LLMProviderTemplate[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-sonnet-20240229',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro'],
    defaultModel: 'openai/gpt-4o',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    baseURL: 'http://localhost:11434',
    models: ['llama2', 'mistral', 'codellama'],
    defaultModel: 'llama2',
  },
]

export const STORAGE_KEYS = {
  PROVIDER_IDS: 'llm.provider.ids',
  PROVIDER_PREFIX: 'llm.providers.',
  ACTIVE_PROVIDER_ID: 'llm.provider.active',
} as const

export function getProviderStorageKey(id: string): string {
  return `${STORAGE_KEYS.PROVIDER_PREFIX}${id}`
}
