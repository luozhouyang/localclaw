/**
 * File System Service
 * Integrates OPFS (Origin Private File System) with AlmostNode's Virtual File System
 */
import { getFilesystem, type LocalClawFS } from '@/infra/fs';
import { VirtualFS } from 'almostnode';
import type { FileNode, FileEvent } from '@/types/code/file';

class FileSystemService {
  private opfs: LocalClawFS | null = null;
  private vfs: VirtualFS | null = null;
  private watchers: Set<(event: FileEvent) => void> = new Set();
  private _isReady = false;

  /**
   * Initialize the file system service
   */
  async initialize(): Promise<void> {
    if (this._isReady) return;

    this.opfs = await getFilesystem();
    await this.ensureWorkspace();
    this._isReady = true;
  }

  /**
   * Check if the service is ready
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Bind AlmostNode VFS for synchronization
   */
  bindVfs(vfs: VirtualFS): void {
    this.vfs = vfs;
  }

  /**
   * Ensure workspace directory exists
   */
  private async ensureWorkspace(): Promise<void> {
    if (!this.opfs) throw new Error('Filesystem not initialized');

    try {
      await this.opfs.mkdir('/workspace', { recursive: true });
    } catch {
      // Directory may already exist
    }
  }

  /**
   * Read file content
   */
  async readFile(path: string): Promise<string> {
    if (!this.opfs) throw new Error('Filesystem not initialized');
    return this.opfs.readFile(path, { encoding: 'utf-8' });
  }

  /**
   * Write file content
   */
  async writeFile(path: string, content: string): Promise<void> {
    if (!this.opfs) throw new Error('Filesystem not initialized');

    // Ensure parent directory exists
    const parentPath = this.getParentPath(path);
    if (parentPath !== '/') {
      await this.opfs.mkdir(parentPath, { recursive: true });
    }

    await this.opfs.writeFile(path, content);

    // Sync to AlmostNode VFS (sync API)
    if (this.vfs) {
      try {
        this.vfs.writeFileSync(path, content);
      } catch (error) {
        console.warn('[FileSystem] Failed to sync to AlmostNode VFS:', error);
      }
    }

    this.emit({ type: 'change', path });
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    if (!this.opfs) throw new Error('Filesystem not initialized');

    await this.opfs.unlink(path);

    // Sync to AlmostNode VFS (sync API)
    if (this.vfs) {
      try {
        this.vfs.unlinkSync(path);
      } catch (error) {
        console.warn('[FileSystem] Failed to delete from AlmostNode VFS:', error);
      }
    }

    this.emit({ type: 'delete', path });
  }

  /**
   * Create a directory
   */
  async createDirectory(path: string): Promise<void> {
    if (!this.opfs) throw new Error('Filesystem not initialized');

    await this.opfs.mkdir(path, { recursive: true });

    // Sync to AlmostNode VFS (sync API)
    if (this.vfs) {
      try {
        this.vfs.mkdirSync(path, { recursive: true });
      } catch (error) {
        console.warn('[FileSystem] Failed to create directory in AlmostNode VFS:', error);
      }
    }

    this.emit({ type: 'create', path });
  }

  /**
   * Delete a directory
   */
  async deleteDirectory(path: string): Promise<void> {
    if (!this.opfs) throw new Error('Filesystem not initialized');

    // Recursive delete
    await this.deleteRecursive(path);

    this.emit({ type: 'delete', path });
  }

  /**
   * Recursively delete a directory
   */
  private async deleteRecursive(path: string): Promise<void> {
    if (!this.opfs) return;

    const entries = await this.opfs.readdir(path);

    for (const entry of entries) {
      const fullPath = `${path}/${entry}`;
      const stat = await this.opfs.stat(fullPath);

      if (stat.isDirectory) {
        await this.deleteRecursive(fullPath);
      } else {
        await this.opfs.unlink(fullPath);
        // Sync to VFS
        if (this.vfs) {
          try {
            this.vfs.unlinkSync(fullPath);
          } catch {
            // Ignore errors
          }
        }
      }
    }

    await this.opfs.rm(path);
  }

  /**
   * Rename a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    if (!this.opfs) throw new Error('Filesystem not initialized');

    const stat = await this.opfs.stat(oldPath);

    if (stat.isFile) {
      const content = await this.opfs.readFile(oldPath, { encoding: 'utf-8' });
      await this.writeFile(newPath, content);
      await this.opfs.unlink(oldPath);
      if (this.vfs) {
        try {
          this.vfs.unlinkSync(oldPath);
        } catch {
          // Ignore errors
        }
      }
    } else {
      await this.copyRecursive(oldPath, newPath);
      await this.deleteRecursive(oldPath);
    }

    this.emit({ type: 'rename', path: newPath, oldPath });
  }

  /**
   * Copy directory recursively
   */
  private async copyRecursive(src: string, dest: string): Promise<void> {
    if (!this.opfs) return;

    await this.opfs.mkdir(dest, { recursive: true });
    const entries = await this.opfs.readdir(src);

    for (const entry of entries) {
      const srcPath = `${src}/${entry}`;
      const destPath = `${dest}/${entry}`;
      const stat = await this.opfs.stat(srcPath);

      if (stat.isDirectory) {
        await this.copyRecursive(srcPath, destPath);
      } else {
        const content = await this.opfs.readFile(srcPath, { encoding: 'utf-8' });
        await this.opfs.writeFile(destPath, content);
      }
    }
  }

  /**
   * Read directory contents
   */
  async readDirectory(path: string): Promise<FileNode[]> {
    if (!this.opfs) throw new Error('Filesystem not initialized');

    try {
      const entries = await this.opfs.readdir(path);
      const nodes: FileNode[] = [];

      for (const entry of entries) {
        const fullPath = `${path}/${entry}`;
        const stat = await this.opfs.stat(fullPath);

        const node: FileNode = {
          name: entry,
          path: fullPath,
          type: stat.isDirectory ? 'directory' : 'file',
          lastModified: stat.mtime?.getTime(),
          size: stat.isFile ? stat.size : undefined,
        };

        nodes.push(node);
      }

      // Sort: directories first, then alphabetically
      nodes.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });

      return nodes;
    } catch (error) {
      console.error('[FileSystem] Failed to read directory:', error);
      return [];
    }
  }

  /**
   * Load file tree recursively
   */
  async loadFileTree(path: string = '/workspace'): Promise<FileNode[]> {
    const entries = await this.readDirectory(path);

    for (const entry of entries) {
      if (entry.type === 'directory') {
        entry.children = await this.loadFileTree(entry.path);
      }
    }

    return entries;
  }

  /**
   * Check if path exists
   */
  async exists(path: string): Promise<boolean> {
    if (!this.opfs) return false;

    try {
      await this.opfs.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if path is a file
   */
  async isFile(path: string): Promise<boolean> {
    if (!this.opfs) return false;

    try {
      const stat = await this.opfs.stat(path);
      return stat.isFile;
    } catch {
      return false;
    }
  }

  /**
   * Check if path is a directory
   */
  async isDirectory(path: string): Promise<boolean> {
    if (!this.opfs) return false;

    try {
      const stat = await this.opfs.stat(path);
      return stat.isDirectory;
    } catch {
      return false;
    }
  }

  /**
   * Sync all files from OPFS to AlmostNode VFS
   */
  async syncToAlmostNode(): Promise<void> {
    if (!this.vfs) {
      throw new Error('AlmostNode VFS not bound');
    }

    const files = await this.getAllFiles('/workspace');

    for (const file of files) {
      try {
        const content = await this.readFile(file);
        this.vfs.writeFileSync(file, content);
      } catch (error) {
        console.warn(`[FileSystem] Failed to sync file ${file}:`, error);
      }
    }
  }

  /**
   * Get all files recursively
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    const entries = await this.readDirectory(dirPath);
    const files: string[] = [];

    for (const entry of entries) {
      if (entry.type === 'file') {
        files.push(entry.path);
      } else if (entry.children) {
        const childFiles = await this.getAllFiles(entry.path);
        files.push(...childFiles);
      }
    }

    return files;
  }

  /**
   * Watch for file changes
   */
  watch(callback: (event: FileEvent) => void): () => void {
    this.watchers.add(callback);
    return () => {
      this.watchers.delete(callback);
    };
  }

  /**
   * Emit file event
   */
  private emit(event: FileEvent): void {
    this.watchers.forEach((cb) => cb(event));
  }

  /**
   * Get parent path
   */
  private getParentPath(path: string): string {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
  }
}

export const fileSystemService = new FileSystemService();
