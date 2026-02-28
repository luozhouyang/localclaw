import { getSystemStorage } from './agent-fs';

/**
 * Unified configuration storage using AgentFS KV
 * Replaces LocalStorage with AgentFS.kv
 */
export const systemStorage = {
  /**
   * Get a value from config storage
   */
  async get<T>(key: string): Promise<T | null> {
    const agent = await getSystemStorage();
    const value = await agent.kv.get(key);
    return value as T | null;
  },

  /**
   * Set a value in config storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    const agent = await getSystemStorage();
    await agent.kv.set(key, value);
  },

  /**
   * Delete a key from config storage
   */
  async delete(key: string): Promise<void> {
    const agent = await getSystemStorage();
    // AgentFS kv might not have delete, try remove or set to null
    try {
      // @ts-expect-error - AgentFS may have remove method
      if (agent.kv.remove) {
        // @ts-expect-error
        await agent.kv.remove(key);
      } else {
        await agent.kv.set(key, null);
      }
    } catch {
      // Fallback: set to null
      await agent.kv.set(key, null);
    }
  },

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    const agent = await getSystemStorage();
    const value = await agent.kv.get(key);
    return value !== null && value !== undefined;
  },

  /**
   * Get all keys with a prefix
   */
  async getKeys(prefix: string): Promise<string[]> {
    const agent = await getSystemStorage();
    // AgentFS kv doesn't support listing keys directly
    // We need to track keys separately or use a different approach
    const keysKey = `__keys__:${prefix}`;
    const keys = await agent.kv.get<string[]>(keysKey);
    return keys || [];
  },

  /**
   * Track a key in the keys list
   */
  async trackKey(prefix: string, key: string): Promise<void> {
    const agent = await getSystemStorage();
    const keysKey = `__keys__:${prefix}`;
    const existing = await agent.kv.get<string[]>(keysKey) || [];
    if (!existing.includes(key)) {
      await agent.kv.set(keysKey, [...existing, key]);
    }
  },

  /**
   * Untrack a key from the keys list
   */
  async untrackKey(prefix: string, key: string): Promise<void> {
    const agent = await getSystemStorage();
    const keysKey = `__keys__:${prefix}`;
    const existing = await agent.kv.get<string[]>(keysKey) || [];
    await agent.kv.set(keysKey, existing.filter(k => k !== key));
  },
};

/**
 * Storage keys used throughout the app
 */
export const STORAGE_KEYS = {
  AGENT_STATE: 'agent:state',
  SKILLS: 'agent:skills',
  TOOL_STATS: 'agent:tool_stats',
} as const;
