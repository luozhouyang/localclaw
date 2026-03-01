import { getKV } from '@/infra/fs';
import type { LLMProvider } from '@/types/llm';


export const PROVIDER_STORAGE_KEYS = {
  PROVIDER_IDS: 'llm:provider_ids',
  ACTIVE_PROVIDER_ID: 'llm:active_provider_id',
} as const;

/**
 * Provider-specific configs helpers
 */
export const providerConfigs = {
  /**
   * Get all provider IDs
   */
  async getProviderIds(): Promise<string[]> {
    const kv = await getKV();
    return (await kv.get<string[]>(PROVIDER_STORAGE_KEYS.PROVIDER_IDS)) || [];
  },

  /**
   * Save provider IDs list
   */
  async setProviderIds(ids: string[]): Promise<void> {
    const kv = await getKV();
    await kv.set(PROVIDER_STORAGE_KEYS.PROVIDER_IDS, ids);
  },

  /**
   * Get a provider by ID
   */
  async getProvider(id: string): Promise<LLMProvider | null> {
    const kv = await getKV();
    return kv.get<LLMProvider>(`provider:${id}`);
  },

  /**
   * Save a provider
   */
  async saveProvider(provider: LLMProvider): Promise<void> {
    const kv = await getKV();
    // Save provider data
    await kv.set(`provider:${provider.id}`, provider);

    // Track this provider ID
    const ids = await this.getProviderIds();
    if (!ids.includes(provider.id)) {
      await this.setProviderIds([...ids, provider.id]);
    }
  },

  /**
   * Delete a provider
   */
  async deleteProvider(id: string): Promise<void> {
    const kv = await getKV();
    // Remove provider data
    await kv.set(`provider:${id}`, null);

    // Remove from IDs list
    const ids = await this.getProviderIds();
    await this.setProviderIds(ids.filter(i => i !== id));

    // Check if it was active and clear
    const activeId = await this.getActiveProviderId();
    if (activeId === id) {
      await this.setActiveProviderId(null);
    }
  },

  /**
   * Get active provider ID
   */
  async getActiveProviderId(): Promise<string | null> {
    const kv = await getKV();
    return kv.get<string>(PROVIDER_STORAGE_KEYS.ACTIVE_PROVIDER_ID);
  },

  /**
   * Set active provider ID
   */
  async setActiveProviderId(id: string | null): Promise<void> {
    const kv = await getKV();
    if (id) {
      await kv.set(PROVIDER_STORAGE_KEYS.ACTIVE_PROVIDER_ID, id);
    } else {
      await kv.set(PROVIDER_STORAGE_KEYS.ACTIVE_PROVIDER_ID, null);
    }
  },

  /**
   * Get all providers
   */
  async getAllProviders(): Promise<LLMProvider[]> {
    const ids = await this.getProviderIds();
    const providers = await Promise.all(
      ids.map(id => this.getProvider(id))
    );
    return providers.filter((p): p is LLMProvider => p !== null);
  },

  /**
   * Get active provider
   */
  async getActiveProvider(): Promise<LLMProvider | null> {
    const activeId = await this.getActiveProviderId();
    if (!activeId) return null;
    return this.getProvider(activeId);
  },
};
