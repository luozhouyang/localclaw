/**
 * File system types for Code editor
 */

export interface FileNode {
  /** File or directory name */
  name: string;
  /** Full path */
  path: string;
  /** Node type */
  type: 'file' | 'directory';
  /** Children for directories */
  children?: FileNode[];
  /** Last modified timestamp */
  lastModified?: number;
  /** File size in bytes */
  size?: number;
}

export interface FileEvent {
  /** Event type */
  type: 'create' | 'delete' | 'change' | 'rename';
  /** Affected path */
  path: string;
  /** Old path for rename events */
  oldPath?: string;
}

export interface FileSystemState {
  /** Root file tree */
  fileTree: FileNode[];
  /** Current working directory */
  currentPath: string;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get filename from path
 */
export function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Get parent directory from path
 */
export function getParentPath(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

/**
 * Join paths
 */
export function joinPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/(^\/)|(\/$)/g, ''))
    .filter(Boolean)
    .join('/');
}
