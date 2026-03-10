import { getKV } from '@/infra/fs';
import type { LLMProvider, ProviderType } from '@/types/llm';
import { OPENROUTER_CONFIG } from '@/types/llm';

const PROVIDER_CONFIG_KEY = 'llm:provider:config';

/**
 * Provider config with encrypted API key
 * All data stored in a single object
 */
export interface StoredProviderConfig {
  id: ProviderType;
  baseURL: string;
  models: string[];  // 支持的模型列表
  defaultModel: string;  // 默认选中的模型
  encryptedApiKey: string; // base64(salt + iv + ciphertext)
}

/**
 * Provider configuration manager
 * Stores config and encrypted API key together
 */
export const providerConfigs = {
  /**
   * Get full provider config (including encrypted API key)
   */
  async getProviderConfig(): Promise<StoredProviderConfig | null> {
    const kv = await getKV();
    const config = await kv.get<StoredProviderConfig>(PROVIDER_CONFIG_KEY);
    // Return null if config is undefined, null, or an empty object
    if (!config || typeof config !== 'object' || Object.keys(config).length === 0) {
      return null;
    }
    return config as StoredProviderConfig;
  },

  /**
   * Check if provider config exists
   */
  async hasProviderConfig(): Promise<boolean> {
    const config = await this.getProviderConfig();
    return config !== null;
  },

  /**
   * Check if provider has encrypted API key stored
   */
  async hasEncryptedApiKey(): Promise<boolean> {
    const config = await this.getProviderConfig();
    return config !== null && !!config.encryptedApiKey;
  },

  /**
   * Save provider configuration with encrypted API key
   */
  async saveProviderConfig(
    type: ProviderType,
    baseURL: string,
    models: string[],
    defaultModel: string,
    encryptedApiKey: string
  ): Promise<StoredProviderConfig> {
    const kv = await getKV();

    const config: StoredProviderConfig = {
      id: type,
      baseURL: type === 'openrouter' ? OPENROUTER_CONFIG.baseURL : baseURL,
      models: models.length > 0 ? models : [type === 'openrouter' ? OPENROUTER_CONFIG.defaultModel : ''],
      defaultModel: defaultModel || (models.length > 0 ? models[0] : (type === 'openrouter' ? OPENROUTER_CONFIG.defaultModel : '')),
      encryptedApiKey,
    };

    await kv.set(PROVIDER_CONFIG_KEY, config);
    return config;
  },

  /**
   * Delete provider configuration
   */
  async deleteProvider(): Promise<void> {
    const kv = await getKV();
    await kv.set(PROVIDER_CONFIG_KEY, null);
  },

  /**
   * Build full provider object (config + decrypted API key)
   */
  buildProvider(config: StoredProviderConfig, apiKey: string): LLMProvider {
    return {
      id: config.id,
      name: config.id === 'openrouter' ? OPENROUTER_CONFIG.name : 'Custom',
      baseURL: config.baseURL,
      apiKey,
      models: config.models || [config.defaultModel || ''],
      defaultModel: config.defaultModel || (config.models?.[0] || ''),
      isActive: true,
    };
  },
};
