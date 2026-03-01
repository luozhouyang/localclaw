import { useCallback, useEffect, useState } from 'react';
import { getFS } from '@/lib/file-utils';

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  mtime: number;
}

export interface UseFilesReturn {
  files: FileItem[];
  currentPath: string;
  isLoading: boolean;
  error: string | null;
  navigateTo: (path: string) => Promise<void>;
  navigateUp: () => Promise<void>;
  listFiles: (path?: string) => Promise<void>;
  createDirectory: (name: string) => Promise<void>;
  deleteItem: (name: string) => Promise<void>;
  renameItem: (oldName: string, newName: string) => Promise<void>;
  uploadFile: (file: File, targetName?: string) => Promise<void>;
  readFile: (name: string) => Promise<string>;
  writeFile: (name: string, content: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFiles(initialPath: string = '/home/user'): UseFilesReturn {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listFiles = useCallback(async (path: string = currentPath) => {
    setIsLoading(true);
    setError(null);

    try {
      const fs = await getFS();

      // Ensure directory exists (recursively create parent directories)
      try {
        await fs.access(path);
      } catch {
        // Create parent directories recursively
        const parts = path.split('/').filter(Boolean);
        let currentPath = '';
        for (const part of parts) {
          currentPath += '/' + part;
          try {
            await fs.access(currentPath);
          } catch {
            // Directory doesn't exist, create it
            try {
              await fs.mkdir(currentPath);
            } catch (mkdirErr: any) {
              // Ignore "already exists" errors, throw others
              if (!mkdirErr.message?.includes('exists')) {
                throw mkdirErr;
              }
            }
          }
        }
      }

      const entries = await fs.readdir(path);
      const fileItems: FileItem[] = [];

      for (const name of entries) {
        const fullPath = `${path}/${name}`.replace(/\/+/g, '/');
        try {
          const stats = await fs.stat(fullPath);
          fileItems.push({
            name,
            path: fullPath,
            type: stats.isDirectory ? 'directory' : 'file',
            size: stats.size || 0,
            mtime: stats.mtime ? stats.mtime.getTime() : Date.now(),
          });
        } catch (err) {
          console.warn(`[useFiles] Failed to stat ${fullPath}:`, err);
        }
      }

      // Sort directories first, then by name
      fileItems.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });

      setFiles(fileItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list files');
      console.error('[useFiles] Error listing files:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath]);

  const navigateTo = useCallback(async (path: string) => {
    setCurrentPath(path);
    await listFiles(path);
  }, [listFiles]);

  const navigateUp = useCallback(async () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    await navigateTo(parentPath);
  }, [currentPath, navigateTo]);

  const createDirectory = useCallback(async (name: string) => {
    setIsLoading(true);
    try {
      const fs = await getFS();
      const newPath = `${currentPath}/${name}`.replace(/\/+/g, '/');
      await fs.mkdir(newPath);
      await listFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create directory');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, listFiles]);

  const deleteItem = useCallback(async (name: string) => {
    setIsLoading(true);
    try {
      const fs = await getFS();
      const targetPath = `${currentPath}/${name}`.replace(/\/+/g, '/');
      const stats = await fs.stat(targetPath);

      if (stats.isDirectory) {
        await fs.rm(targetPath, { recursive: true, force: true });
      } else {
        await fs.unlink(targetPath);
      }

      await listFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, listFiles]);

  const renameItem = useCallback(async (oldName: string, newName: string) => {
    setIsLoading(true);
    try {
      const fs = await getFS();
      const oldPath = `${currentPath}/${oldName}`.replace(/\/+/g, '/');
      const newPath = `${currentPath}/${newName}`.replace(/\/+/g, '/');
      await fs.rename(oldPath, newPath);
      await listFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, listFiles]);

  const uploadFile = useCallback(async (file: File, targetName?: string) => {
    setIsLoading(true);
    try {
      const fs = await getFS();
      const name = targetName || file.name;
      const targetPath = `${currentPath}/${name}`.replace(/\/+/g, '/');

      const content = await file.text();
      await fs.writeFile(targetPath, content);
      await listFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, listFiles]);

  const readFile = useCallback(async (name: string): Promise<string> => {
    try {
      const fs = await getFS();
      const filePath = `${currentPath}/${name}`.replace(/\/+/g, '/');
      return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      throw err;
    }
  }, [currentPath]);

  const writeFile = useCallback(async (name: string, content: string) => {
    setIsLoading(true);
    try {
      const fs = await getFS();
      const filePath = `${currentPath}/${name}`.replace(/\/+/g, '/');
      await fs.writeFile(filePath, content);
      await listFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to write file');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, listFiles]);

  const refresh = useCallback(async () => {
    await listFiles(currentPath);
  }, [currentPath, listFiles]);

  // Load files on mount and when path changes
  useEffect(() => {
    listFiles();
  }, [listFiles]);

  return {
    files,
    currentPath,
    isLoading,
    error,
    navigateTo,
    navigateUp,
    listFiles,
    createDirectory,
    deleteItem,
    renameItem,
    uploadFile,
    readFile,
    writeFile,
    refresh,
  };
}
