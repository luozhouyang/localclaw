import { useState, useCallback, useEffect } from 'react';
import { FolderTree, Plus, RefreshCw } from 'lucide-react';
import { FileTreeNode } from './FileTreeNode';
import { FileContextMenu } from './FileContextMenu';
import { NewFileDialog } from './NewFileDialog';
import { RenameDialog } from './RenameDialog';
import type { FileNode } from '@/types/code/file';
import { cn } from '@/lib/utils';

interface FileExplorerProps {
  fileTree: FileNode[];
  selectedPath: string | null;
  isLoading: boolean;
  onSelect: (path: string) => void;
  onCreate: (path: string, type: 'file' | 'directory') => void;
  onDelete: (path: string, type: 'file' | 'directory') => void;
  onRename: (oldPath: string, newPath: string) => void;
  onRefresh: () => void;
}

/**
 * File explorer component
 * Shows a tree view of files and folders
 */
export function FileExplorer({
  fileTree,
  selectedPath,
  isLoading,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onRefresh,
}: FileExplorerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/workspace']));
  const [contextMenu, setContextMenu] = useState<{
    node: FileNode | null;
    position: { x: number; y: number } | null;
  }>({ node: null, position: null });
  const [newDialog, setNewDialog] = useState<{
    isOpen: boolean;
    type: 'file' | 'directory';
    parentPath: string;
  }>({
    isOpen: false,
    type: 'file',
    parentPath: '/workspace',
  });
  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean;
    node: FileNode | null;
  }>({ isOpen: false, node: null });

  // Toggle expand/collapse
  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    setContextMenu({
      node,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu({ node: null, position: null });
  }, []);

  // Handle new file
  const handleNewFile = useCallback(() => {
    const parentPath = contextMenu.node?.type === 'directory'
      ? contextMenu.node.path
      : '/workspace';
    setNewDialog({ isOpen: true, type: 'file', parentPath });
    closeContextMenu();
  }, [contextMenu.node, closeContextMenu]);

  // Handle new folder
  const handleNewFolder = useCallback(() => {
    const parentPath = contextMenu.node?.type === 'directory'
      ? contextMenu.node.path
      : '/workspace';
    setNewDialog({ isOpen: true, type: 'directory', parentPath });
    closeContextMenu();
  }, [contextMenu.node, closeContextMenu]);

  // Handle rename
  const handleRename = useCallback(() => {
    if (contextMenu.node) {
      setRenameDialog({ isOpen: true, node: contextMenu.node });
    }
    closeContextMenu();
  }, [contextMenu.node, closeContextMenu]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (contextMenu.node) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${contextMenu.node.name}"?`
      );
      if (confirmed) {
        onDelete(contextMenu.node.path, contextMenu.node.type);
      }
    }
    closeContextMenu();
  }, [contextMenu.node, onDelete, closeContextMenu]);

  // Handle create confirm
  const handleCreateConfirm = useCallback((name: string) => {
    const fullPath = `${newDialog.parentPath}/${name}`;
    onCreate(fullPath, newDialog.type);
  }, [newDialog.parentPath, newDialog.type, onCreate]);

  // Handle rename confirm
  const handleRenameConfirm = useCallback((newName: string) => {
    if (renameDialog.node) {
      const parentPath = renameDialog.node.path.split('/').slice(0, -1).join('/') || '/';
      const newPath = `${parentPath}/${newName}`;
      onRename(renameDialog.node.path, newPath);
    }
    setRenameDialog({ isOpen: false, node: null });
  }, [renameDialog.node, onRename]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRefresh]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-orange-500/20">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-gray-300">Explorer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setNewDialog({ isOpen: true, type: 'file', parentPath: '/workspace' })}
            className="p-1.5 rounded text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
            title="New File"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onRefresh}
            className={cn(
              "p-1.5 rounded text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors",
              isLoading && "animate-spin"
            )}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto py-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <FolderTree className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No files yet</p>
            <button
              onClick={() => setNewDialog({ isOpen: true, type: 'file', parentPath: '/workspace' })}
              className="mt-2 text-sm text-orange-400 hover:underline"
            >
              Create a file
            </button>
          </div>
        ) : (
          fileTree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              level={0}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onSelect={onSelect}
              onToggleExpand={handleToggleExpand}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>

      {/* Context Menu */}
      <FileContextMenu
        node={contextMenu.node}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      {/* New File/Folder Dialog */}
      <NewFileDialog
        isOpen={newDialog.isOpen}
        type={newDialog.type}
        parentPath={newDialog.parentPath}
        onClose={() => setNewDialog({ ...newDialog, isOpen: false })}
        onConfirm={handleCreateConfirm}
      />

      {/* Rename Dialog */}
      <RenameDialog
        isOpen={renameDialog.isOpen}
        currentName={renameDialog.node?.name || ''}
        onClose={() => setRenameDialog({ isOpen: false, node: null })}
        onConfirm={handleRenameConfirm}
      />
    </div>
  );
}
