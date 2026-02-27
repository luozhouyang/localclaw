import { connect } from '@tursodatabase/database-wasm/vite';
import { AgentFS } from 'agentfs-sdk';
import { agentfs } from "agentfs-sdk/just-bash";
import type { IFileSystem } from 'just-bash';
import type { AgentFSCore } from 'node_modules/agentfs-sdk/dist/agentfs';

// Lazy initialization - only runs in browser
let systemFs: AgentFSCore | null = null;
let agentsFs: AgentFSCore | null = null;
let bashFs: IFileSystem | null = null;

// filesystem for system
export const getSystemStorage = async (): Promise<AgentFSCore> => {
    if (!systemFs) {
        try {
            const db = await connect("settings.db");
            systemFs = await AgentFS.openWith(db);
        } catch (err) {
            console.error('[system filesystem] Initialization failed:', err);
            throw err;
        }
    }
    return systemFs;
};

// filesystem for agents
export const getAgentStorage = async (): Promise<AgentFSCore> => {
    if (!agentsFs) {
        try {
            const db = await connect("agents.db");
            agentsFs = await AgentFS.openWith(db);
        } catch (err) {
            console.error('[agents filesystem] Initialization failed:', err);
            throw err;
        }
    }
    return agentsFs;
}

// filesystem for bash
export const getBashFilesystem = async (): Promise<IFileSystem> => {
    if (!bashFs) {
        try {
            bashFs = await agentfs({ id: "localclaw-bash" });
        } catch (err) {
            console.error('[bash filesystem] Initialization failed:', err);
            throw err;
        }
    }
    return bashFs;
}
