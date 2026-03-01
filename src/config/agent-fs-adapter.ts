import type { AgentFSCore } from 'node_modules/agentfs-sdk/dist/agentfs';
// BufferEncoding type
type BufferEncoding = 'utf8' | 'utf-8' | 'ascii' | 'base64' | 'hex' | 'binary' | 'latin1';

// Local type definitions for just-bash compatibility
interface ReadFileOptions {
  encoding?: BufferEncoding;
}

interface WriteFileOptions {
  encoding?: BufferEncoding;
}

interface MkdirOptions {
  recursive?: boolean;
}

interface RmOptions {
  force?: boolean;
  recursive?: boolean;
}

interface CpOptions {
  recursive?: boolean;
}

type FileContent = string | Uint8Array;

interface FsStat {
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  mode: number;
  size: number;
  mtime: Date;
}

interface DirentEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
}

// IFileSystem interface matching just-bash expectations
interface IFileSystem {
  readFile(path: string, options?: ReadFileOptions | BufferEncoding): Promise<string>;
  readFileBuffer(path: string): Promise<Uint8Array>;
  writeFile(path: string, content: FileContent, options?: WriteFileOptions | BufferEncoding): Promise<void>;
  appendFile(path: string, content: FileContent, options?: WriteFileOptions | BufferEncoding): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FsStat>;
  lstat(path: string): Promise<FsStat>;
  mkdir(path: string, options?: MkdirOptions): Promise<void>;
  readdir(path: string): Promise<string[]>;
  readdirWithFileTypes(path: string): Promise<DirentEntry[]>;
  rm(path: string, options?: RmOptions): Promise<void>;
  cp(src: string, dest: string, options?: CpOptions): Promise<void>;
  mv(src: string, dest: string): Promise<void>;
  resolvePath(base: string, relPath: string): string;
  getAllPaths(): string[];
  chmod(path: string, mode: number): Promise<void>;
  symlink(target: string, linkPath: string): Promise<void>;
  link(existingPath: string, newPath: string): Promise<void>;
  readlink(path: string): Promise<string>;
  realpath(path: string): Promise<string>;
  utimes(path: string, atime: Date, mtime: Date): Promise<void>;
}

/**
 * Adapter that wraps AgentFS to implement the IFileSystem interface for just-bash
 */
export class AgentFSAdapter implements IFileSystem {
  constructor(private agentFs: AgentFSCore) { }

  /**
   * Read file as string
   */
  async readFile(path: string, options?: ReadFileOptions | BufferEncoding): Promise<string> {
    const encoding = typeof options === 'string' ? options : options?.encoding ?? 'utf8';
    return this.agentFs.fs.readFile(path, encoding as BufferEncoding);
  }

  /**
   * Read file as Uint8Array (binary)
   */
  async readFileBuffer(path: string): Promise<Uint8Array> {
    const buffer = await this.agentFs.fs.readFile(path);
    return new Uint8Array(buffer);
  }

  /**
   * Write content to file
   */
  async writeFile(
    path: string,
    content: FileContent,
    options?: WriteFileOptions | BufferEncoding
  ): Promise<void> {
    const encoding = typeof options === 'string' ? options : options?.encoding ?? 'utf8';

    let contentToWrite: string | Buffer;
    if (content instanceof Uint8Array) {
      contentToWrite = Buffer.from(content);
    } else {
      contentToWrite = content;
    }

    await this.agentFs.fs.writeFile(path, contentToWrite, { encoding });
  }

  /**
   * Append content to file
   */
  async appendFile(
    path: string,
    content: FileContent,
    options?: WriteFileOptions | BufferEncoding
  ): Promise<void> {
    const encoding = typeof options === 'string' ? options : options?.encoding ?? 'utf8';

    // Read existing content if file exists
    let existingContent: string | Buffer = '';
    try {
      existingContent = await this.agentFs.fs.readFile(path, encoding as BufferEncoding);
    } catch {
      // File doesn't exist, start with empty content
    }

    // Combine existing and new content
    let newContent: string | Buffer;
    if (content instanceof Uint8Array) {
      if (typeof existingContent === 'string') {
        newContent = Buffer.concat([Buffer.from(existingContent, encoding), Buffer.from(content)]);
      } else {
        newContent = Buffer.concat([existingContent, Buffer.from(content)]);
      }
    } else {
      if (typeof existingContent === 'string') {
        newContent = existingContent + content;
      } else {
        newContent = Buffer.concat([existingContent, Buffer.from(content, encoding)]);
      }
    }

    await this.agentFs.fs.writeFile(path, newContent, { encoding });
  }

  /**
   * Check if path exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await this.agentFs.fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file/directory stats
   */
  async stat(path: string): Promise<FsStat> {
    const stats = await this.agentFs.fs.stat(path);
    return this.convertStats(stats);
  }

  /**
   * Get file/directory stats without following symlinks
   */
  async lstat(path: string): Promise<FsStat> {
    const stats = await this.agentFs.fs.lstat(path);
    return this.convertStats(stats);
  }

  /**
   * Convert AgentFS Stats to IFileSystem FsStat
   */
  private convertStats(stats: {
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    mode: number;
    size: number;
    mtime: number;
  }): FsStat {
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymbolicLink: stats.isSymbolicLink(),
      mode: stats.mode,
      size: stats.size,
      mtime: new Date(stats.mtime),
    };
  }

  /**
   * Create directory
   */
  async mkdir(path: string, options?: MkdirOptions): Promise<void> {
    if (options?.recursive) {
      // Create parent directories recursively
      const parts = path.split('/').filter(Boolean);
      let currentPath = '';

      for (const part of parts) {
        currentPath += '/' + part;
        try {
          await this.agentFs.fs.mkdir(currentPath);
        } catch (err: any) {
          // Ignore if directory already exists
          if (!err.message?.includes('exists')) {
            throw err;
          }
        }
      }
    } else {
      await this.agentFs.fs.mkdir(path);
    }
  }

  /**
   * Read directory contents
   */
  async readdir(path: string): Promise<string[]> {
    return this.agentFs.fs.readdir(path);
  }

  /**
   * Read directory contents with file type information
   */
  async readdirWithFileTypes(path: string): Promise<DirentEntry[]> {
    const entries = await this.agentFs.fs.readdirPlus(path);
    return entries.map((entry) => ({
      name: entry.name,
      isFile: entry.stats.isFile(),
      isDirectory: entry.stats.isDirectory(),
      isSymbolicLink: entry.stats.isSymbolicLink(),
    }));
  }

  /**
   * Remove file or directory
   */
  async rm(path: string, options?: RmOptions): Promise<void> {
    await this.agentFs.fs.rm(path, {
      force: options?.force,
      recursive: options?.recursive,
    });
  }

  /**
   * Copy file or directory
   */
  async cp(src: string, dest: string, options?: CpOptions): Promise<void> {
    const srcStats = await this.stat(src);

    if (srcStats.isDirectory) {
      if (!options?.recursive) {
        throw new Error(`cp: -r not specified; omitting directory '${src}'`);
      }

      // Create destination directory
      await this.mkdir(dest, { recursive: true });

      // Copy contents recursively
      const entries = await this.readdir(src);
      for (const entry of entries) {
        const srcPath = `${src}/${entry}`.replace(/\/+/g, '/');
        const destPath = `${dest}/${entry}`.replace(/\/+/g, '/');
        await this.cp(srcPath, destPath, { recursive: true });
      }
    } else {
      // Copy file
      await this.agentFs.fs.copyFile(src, dest);
    }
  }

  /**
   * Move/rename file or directory
   */
  async mv(src: string, dest: string): Promise<void> {
    await this.agentFs.fs.rename(src, dest);
  }

  /**
   * Resolve a relative path against a base path
   */
  resolvePath(base: string, relPath: string): string {
    // Handle absolute paths
    if (relPath.startsWith('/')) {
      return relPath;
    }

    // Handle current directory
    if (relPath === '.' || relPath === './') {
      return base;
    }

    // Handle parent directory
    if (relPath === '..') {
      const parts = base.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }

    // Handle relative paths
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

  /**
   * Get all paths in the filesystem
   * Note: This is a potentially expensive operation for large filesystems
   */
  getAllPaths(): string[] {
    // AgentFS doesn't expose a direct method for this
    // Return empty array as per interface spec for unsupported implementations
    return [];
  }

  /**
   * Change file/directory permissions
   * Note: AgentFS stores mode but changing it may have limited effect
   */
  async chmod(path: string, mode: number): Promise<void> {
    // AgentFS doesn't expose chmod directly
    // This is a no-op for now, could be implemented by recreating the file
    console.warn(`chmod not fully supported in AgentFS adapter: ${path} -> ${mode.toString(8)}`);
  }

  /**
   * Create symbolic link
   */
  async symlink(target: string, linkPath: string): Promise<void> {
    await this.agentFs.fs.symlink(target, linkPath);
  }

  /**
   * Create hard link
   * Note: AgentFS doesn't support hard links, we create a copy instead
   */
  async link(existingPath: string, newPath: string): Promise<void> {
    // AgentFS doesn't support hard links, copy the file instead
    await this.agentFs.fs.copyFile(existingPath, newPath);
  }

  /**
   * Read symlink target
   */
  async readlink(path: string): Promise<string> {
    return this.agentFs.fs.readlink(path);
  }

  /**
   * Resolve all symlinks to get canonical path
   */
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
        // If lstat fails, the path doesn't exist
        throw new Error(`ENOENT: no such file or directory: ${currentPath}`);
      }
    }
  }

  /**
   * Set file access and modification times
   * Note: AgentFS doesn't support utimes, this is a no-op
   */
  async utimes(path: string, _atime: Date, mtime: Date): Promise<void> {
    // AgentFS doesn't support utimes directly
    // The mtime is set automatically on write operations
    console.warn(`utimes not supported in AgentFS adapter: ${path} -> ${mtime.toISOString()}`);
  }
}
