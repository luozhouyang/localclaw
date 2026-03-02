/**
 * Hook for file system operations
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { fileSystemService } from '@/services/code/fileSystem';
import { almostNodeService } from '@/services/code/almostNode';
import type { FileNode, FileEvent } from '@/types/code/file';

interface UseFileSystemReturn {
  /** Whether the file system is ready */
  isReady: boolean;
  /** File tree */
  fileTree: FileNode[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refresh file tree */
  refresh: () => Promise<void>;
  /** Read file content */
  readFile: (path: string) => Promise<string>;
  /** Write file content */
  writeFile: (path: string, content: string) => Promise<void>;
  /** Delete a file */
  deleteFile: (path: string) => Promise<void>;
  /** Create a directory */
  createDirectory: (path: string) => Promise<void>;
  /** Delete a directory */
  deleteDirectory: (path: string) => Promise<void>;
  /** Rename a file or directory */
  rename: (oldPath: string, newPath: string) => Promise<void>;
  /** Check if path exists */
  exists: (path: string) => Promise<boolean>;
  /** Check if path is a file */
  isFile: (path: string) => Promise<boolean>;
  /** Check if path is a directory */
  isDirectory: (path: string) => Promise<boolean>;
}

/**
 * Hook for file system operations
 */
export function useFileSystem(): UseFileSystemReturn {
  const [isReady, setIsReady] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef(false);

  // Initialize file system
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        setIsLoading(true);

        // Initialize file system service
        await fileSystemService.initialize();

        // Initialize AlmostNode and bind to file system
        await almostNodeService.initialize();
        fileSystemService.bindVfs(almostNodeService.getVfs());

        // Load file tree
        const tree = await fileSystemService.loadFileTree('/workspace');
        setFileTree(tree);
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize file system'));
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Watch for file changes
    const unwatch = fileSystemService.watch((event: FileEvent) => {
      // Refresh file tree on changes
      fileSystemService.loadFileTree('/workspace').then(setFileTree);
    });

    return () => {
      unwatch();
    };
  }, []);

  // Refresh file tree
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const tree = await fileSystemService.loadFileTree('/workspace');
      setFileTree(tree);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh file tree'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Read file
  const readFile = useCallback(async (path: string): Promise<string> => {
    return fileSystemService.readFile(path);
  }, []);

  // Write file
  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    await fileSystemService.writeFile(path, content);
  }, []);

  // Delete file
  const deleteFile = useCallback(async (path: string): Promise<void> => {
    await fileSystemService.deleteFile(path);
  }, []);

  // Create directory
  const createDirectory = useCallback(async (path: string): Promise<void> => {
    await fileSystemService.createDirectory(path);
  }, []);

  // Delete directory
  const deleteDirectory = useCallback(async (path: string): Promise<void> => {
    await fileSystemService.deleteDirectory(path);
  }, []);

  // Rename
  const rename = useCallback(async (oldPath: string, newPath: string): Promise<void> => {
    await fileSystemService.rename(oldPath, newPath);
  }, []);

  // Exists
  const exists = useCallback(async (path: string): Promise<boolean> => {
    return fileSystemService.exists(path);
  }, []);

  // Is file
  const isFile = useCallback(async (path: string): Promise<boolean> => {
    return fileSystemService.isFile(path);
  }, []);

  // Is directory
  const isDirectory = useCallback(async (path: string): Promise<boolean> => {
    return fileSystemService.isDirectory(path);
  }, []);

  return {
    isReady,
    fileTree,
    isLoading,
    error,
    refresh,
    readFile,
    writeFile,
    deleteFile,
    createDirectory,
    deleteDirectory,
    rename,
    exists,
    isFile,
    isDirectory,
  };
}
