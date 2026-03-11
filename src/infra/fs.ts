import { connect } from '@tursodatabase/database-wasm/vite';
import { AgentFS } from 'agentfs-sdk';
import type { DirEntry } from 'agentfs-sdk';

import type {
  IFileSystem,
  FsStat as IBashFsStat,
  MkdirOptions as IBashMkdirOptions,
  RmOptions as IBashRmOptions,
  CpOptions as IBashCpOptions,
  FileContent as IBashFileContent,
  BufferEncoding as IBashBufferEncoding,
} from 'just-bash';

// Re-export types from just-bash (only types that are actually exported)
export type { IFileSystem, FsStat, FileContent, BufferEncoding } from 'just-bash';

// Local type definitions for just-bash interfaces not exported from main
interface IBashDirentEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
}

interface IBashReadOptions {
  encoding?: BufferEncoding | null;
}

interface IBashWriteOptions {
  encoding?: BufferEncoding;
}

// Type for AgentFS instance (AgentFSCore is not directly exported)
type AgentFSInstance = Awaited<ReturnType<typeof AgentFS.openWith>>;

// Lazy initialization
let sharedFs: AgentFSInstance | null = null;
let fsInstance: LocalClawFS | null = null;
let kvInstance: LocalClawKV | null = null;
let initPromise: Promise<{ fs: LocalClawFS; kv: LocalClawKV }> | null = null;

/**
 * FileSystem implementation using AgentFS
 */
export class LocalClawFS implements IFileSystem {
  constructor(private agentFs: AgentFSInstance) {}

  async readFile(path: string, options?: IBashReadOptions | IBashBufferEncoding): Promise<string> {
    const encoding = typeof options === 'string' ? options : options?.encoding ?? 'utf8';
    return this.agentFs.fs.readFile(path, encoding as BufferEncoding);
  }

  async readFileBuffer(path: string): Promise<Uint8Array> {
    const buffer = await this.agentFs.fs.readFile(path);
    return new Uint8Array(buffer);
  }

  async writeFile(
    path: string,
    content: IBashFileContent,
    options?: IBashWriteOptions | IBashBufferEncoding
  ): Promise<void> {
    const encoding = typeof options === 'string' ? options : options?.encoding ?? 'utf8';
    const contentToWrite = content instanceof Uint8Array ? Buffer.from(content) : content;
    await this.agentFs.fs.writeFile(path, contentToWrite, { encoding });
  }

  async appendFile(
    path: string,
    content: IBashFileContent,
    options?: IBashWriteOptions | IBashBufferEncoding
  ): Promise<void> {
    const encoding = typeof options === 'string' ? options : options?.encoding ?? 'utf8';
    let existingContent = '';
    try {
      existingContent = await this.agentFs.fs.readFile(path, encoding as BufferEncoding);
    } catch {
      // File doesn't exist
    }
    const newContent = content instanceof Uint8Array
      ? existingContent + Buffer.from(content).toString(encoding as BufferEncoding)
      : existingContent + content;
    await this.agentFs.fs.writeFile(path, newContent, { encoding });
  }

  async access(path: string): Promise<void> {
    await this.agentFs.fs.access(path);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.agentFs.fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  getAllPaths(): string[] {
    // AgentFS doesn't provide a way to list all paths
    // Return empty array as per interface documentation
    return [];
  }

  async chmod(_path: string, _mode: number): Promise<void> {
    // AgentFS doesn't support chmod
    console.warn(`chmod not supported: ${_path}`);
  }

  async stat(path: string): Promise<IBashFsStat> {
    const stats = await this.agentFs.fs.stat(path);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymbolicLink: stats.isSymbolicLink(),
      mode: stats.mode,
      size: stats.size,
      mtime: new Date(stats.mtime),
    };
  }

  async lstat(path: string): Promise<IBashFsStat> {
    const stats = await this.agentFs.fs.lstat(path);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymbolicLink: stats.isSymbolicLink(),
      mode: stats.mode,
      size: stats.size,
      mtime: new Date(stats.mtime),
    };
  }

  async mkdir(path: string, options?: IBashMkdirOptions): Promise<void> {
    if (options?.recursive) {
      const parts = path.split('/').filter(Boolean);
      let currentPath = '';
      for (const part of parts) {
        currentPath += '/' + part;
        try {
          await this.agentFs.fs.mkdir(currentPath);
        } catch (err: any) {
          if (!err.message?.includes('exists')) throw err;
        }
      }
    } else {
      await this.agentFs.fs.mkdir(path);
    }
  }

  async readdir(path: string): Promise<string[]> {
    return this.agentFs.fs.readdir(path);
  }

  async readdirWithFileTypes(path: string): Promise<IBashDirentEntry[]> {
    const entries = await this.agentFs.fs.readdirPlus(path);
    return entries.map((entry: DirEntry) => ({
      name: entry.name,
      isFile: entry.stats.isFile(),
      isDirectory: entry.stats.isDirectory(),
      isSymbolicLink: entry.stats.isSymbolicLink(),
    }));
  }

  async unlink(path: string): Promise<void> {
    await this.agentFs.fs.unlink(path);
  }

  async rm(path: string, options?: IBashRmOptions): Promise<void> {
    await this.agentFs.fs.rm(path, {
      force: options?.force,
      recursive: options?.recursive,
    });
  }

  async cp(src: string, dest: string, options?: IBashCpOptions): Promise<void> {
    const srcStats = await this.stat(src);
    if (srcStats.isDirectory) {
      if (!options?.recursive) {
        throw new Error(`cp: -r not specified; omitting directory '${src}'`);
      }
      await this.mkdir(dest, { recursive: true });
      const entries = await this.readdir(src);
      for (const entry of entries) {
        await this.cp(`${src}/${entry}`, `${dest}/${entry}`, { recursive: true });
      }
    } else {
      await this.agentFs.fs.copyFile(src, dest);
    }
  }

  async mv(src: string, dest: string): Promise<void> {
    await this.agentFs.fs.rename(src, dest);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.agentFs.fs.rename(oldPath, newPath);
  }

  async symlink(target: string, linkPath: string): Promise<void> {
    await this.agentFs.fs.symlink(target, linkPath);
  }

  async readlink(path: string): Promise<string> {
    return this.agentFs.fs.readlink(path);
  }

  async link(existingPath: string, newPath: string): Promise<void> {
    // AgentFS doesn't support hard links, copy the file instead
    await this.agentFs.fs.copyFile(existingPath, newPath);
  }

  async realpath(path: string): Promise<string> {
    // Follow symlinks until we reach the real path
    const visited = new Set<string>();
    let currentPath = path;

    while (true) {
      if (visited.has(currentPath)) {
        throw new Error(`ELOOP: too many symbolic links encountered: ${path}`);
      }
      visited.add(currentPath);

      try {
        const stats = await this.agentFs.fs.lstat(currentPath);
        if (!stats.isSymbolicLink()) {
          return currentPath;
        }

        const target = await this.agentFs.fs.readlink(currentPath);
        if (target.startsWith('/')) {
          currentPath = target;
        } else {
          // Relative symlink
          const dir = currentPath.split('/').slice(0, -1).join('/') || '/';
          currentPath = this.resolvePath(dir, target);
        }
      } catch {
        throw new Error(`ENOENT: no such file or directory: ${currentPath}`);
      }
    }
  }

  async utimes(path: string, _atime: Date, mtime: Date): Promise<void> {
    // AgentFS doesn't support utimes directly
    // The mtime is set automatically on write operations
    console.warn(`utimes not supported: ${path} -> ${mtime.toISOString()}`);
  }

  resolvePath(base: string, relPath: string): string {
    if (relPath.startsWith('/')) return relPath;
    if (relPath === '.' || relPath === './') return base;
    if (relPath === '..') {
      const parts = base.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }

    const baseParts = base.split('/').filter(Boolean);
    const relParts = relPath.split('/');

    for (const part of relParts) {
      if (part === '..') {
        baseParts.pop();
      } else if (part !== '.' && part !== '') {
        baseParts.push(part);
      }
    }

    return '/' + baseParts.join('/');
  }
}

/**
 * KV storage implementation using AgentFS
 */
export class LocalClawKV {
  constructor(private agentFs: AgentFSInstance) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.agentFs.kv.get(key);
    // Return null for undefined or undefined-like values
    return (value === undefined || value === null) ? null : (value as T);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.agentFs.kv.set(key, value);
  }

  async delete(key: string): Promise<void> {
    await this.agentFs.kv.set(key, null);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.agentFs.kv.get(key);
    return value !== null && value !== undefined;
  }

  async getKeys(prefix: string): Promise<string[]> {
    const keysKey = `__keys__:${prefix}`;
    const keys = await this.agentFs.kv.get<string[]>(keysKey);
    return keys || [];
  }

  async trackKey(prefix: string, key: string): Promise<void> {
    const keysKey = `__keys__:${prefix}`;
    const existing = await this.agentFs.kv.get<string[]>(keysKey) || [];
    if (!existing.includes(key)) {
      await this.agentFs.kv.set(keysKey, [...existing, key]);
    }
  }

  async untrackKey(prefix: string, key: string): Promise<void> {
    const keysKey = `__keys__:${prefix}`;
    const existing = await this.agentFs.kv.get<string[]>(keysKey) || [];
    await this.agentFs.kv.set(keysKey, existing.filter((k: string) => k !== key));
  }
}

/**
 * Initialize and get the filesystem instances
 */
export async function getFilesystem(): Promise<LocalClawFS> {
  if (fsInstance) return fsInstance;
  const { fs } = await init();
  return fs;
}

/**
 * Initialize and get the KV storage instance
 */
export async function getKV(): Promise<LocalClawKV> {
  if (kvInstance) return kvInstance;
  const { kv } = await init();
  return kv;
}

/**
 * Initialize both filesystem and KV storage
 */
async function init(): Promise<{ fs: LocalClawFS; kv: LocalClawKV }> {
  if (fsInstance && kvInstance) return { fs: fsInstance, kv: kvInstance };
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Load WASM and connect database
    const db = await connect('localclaw.db');

    // Initialize AgentFS
    sharedFs = await AgentFS.openWith(db);

    // Create instances
    fsInstance = new LocalClawFS(sharedFs);
    kvInstance = new LocalClawKV(sharedFs);

    return { fs: fsInstance, kv: kvInstance };
  })();

  return initPromise;
}

/**
 * Reset filesystem (for testing)
 */
export function resetFilesystem(): void {
  sharedFs = null;
  fsInstance = null;
  kvInstance = null;
  initPromise = null;
}

// Default exports
export default getFilesystem;
