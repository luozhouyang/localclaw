import { connect } from '@tursodatabase/database-wasm/vite';
import { AgentFS } from 'agentfs-sdk';
import type { IFileSystem } from 'just-bash';
import type { AgentFSCore } from 'node_modules/agentfs-sdk/dist/agentfs';
import { AgentFSAdapter } from './agent-fs-adapter';

// Lazy initialization - only runs in browser
let sharedFs: AgentFSCore | null = null;
let bashFs: IFileSystem | null = null;
let initPromise: Promise<AgentFSCore> | null = null;

// Shared database connection with initialization lock
const getFilesystem = async () => {
  // Return existing instance
  if (sharedFs) {
    return sharedFs;
  }

  // Return existing promise if initialization is in progress
  if (initPromise) {
    return initPromise;
  }

  // Create new initialization promise
  initPromise = (async () => {
    try {
      const db = await connect("localclaw.db");
      sharedFs = await AgentFS.openWith(db);
      bashFs = new AgentFSAdapter(sharedFs);
      return sharedFs;
    } catch (err) {
      console.error('[system filesystem] Initialization failed:', err);
      throw err;
    }
  })();

  return initPromise;
};

// filesystem for system (settings, skills, etc.)
export const getSystemStorage = async (): Promise<AgentFSCore> => {
  return await getFilesystem();
};

// filesystem for agents (agent runtime files)
export const getAgentStorage = async (): Promise<AgentFSCore> => {
  return await getFilesystem();
}

// filesystem for bash - uses AgentFSAdapter with path prefix isolation
export const getBashFilesystem = async (): Promise<IFileSystem> => {
  if (!bashFs) {
    await getFilesystem();
  }
  return bashFs!;
}

// Reset function for testing or cleanup
export const resetFilesystems = () => {
  sharedFs = null;
  bashFs = null;
  initPromise = null;
};

// Initialize filesystem with chat support
export async function initializeFilesystem(): Promise<AgentFSCore> {
  const fs = await getSystemStorage();

  // Initialize chat storage structure
  const { threadManager } = await import('@/chat/thread-manager');
  await threadManager.initialize();

  return fs;
}
