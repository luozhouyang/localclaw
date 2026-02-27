import { connect } from '@tursodatabase/database-wasm/vite';
import { AgentFS } from 'agentfs-sdk';
import type { AgentFSCore } from 'node_modules/agentfs-sdk/dist/agentfs';

// Lazy initialization - only runs in browser
let _fs: AgentFSCore | null = null;

let initPromise: Promise<void> | null = null;

async function initStorage(): Promise<void> {
    if (_fs) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            console.log('[Storage] Initializing...');
            const db = await connect('settings.db');
            _fs = await AgentFS.openWith(db);
            console.log('[Storage] Initialized successfully');
        } catch (err) {
            console.error('[Storage] Initialization failed:', err);
            // Reset initPromise on failure so we can retry
            initPromise = null;
            throw err;
        }
    })();

    return initPromise;
}

// Helper to add timeout to storage operations
async function withTimeout<T>(operation: () => Promise<T>, timeoutMs = 5000): Promise<T> {
    return Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Storage operation timed out')), timeoutMs);
        })
    ]);
}

export const getSettings = async <T = unknown>(key: string): Promise<T | null> => {
    return withTimeout(async () => {
        await initStorage();
        if (!_fs) throw new Error('Storage not initialized');
        return await _fs.kv.get(key) as T | null;
    });
};

export const setSettings = async <T = unknown>(key: string, value: T): Promise<void> => {
    return withTimeout(async () => {
        await initStorage();
        if (!_fs) throw new Error('Storage not initialized');
        await _fs.kv.set(key, value);
    });
};
