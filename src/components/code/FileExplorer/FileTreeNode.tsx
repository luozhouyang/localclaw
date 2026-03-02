import { useState } from 'react';
import {
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { FileNode } from '@/types/code/file';
import { cn } from '@/lib/utils';

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onSelect: (path: string) => void;
  onToggleExpand: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

/**
 * Individual file tree node component
 */
export function FileTreeNode({
  node,
  level,
  selectedPath,
  expandedPaths,
  onSelect,
  onToggleExpand,
  onContextMenu,
}: FileTreeNodeProps) {
  const isDirectory = node.type === 'directory';
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const hasChildren = isDirectory && node.children && node.children.length > 0;

  const handleClick = () => {
    if (isDirectory) {
      onToggleExpand(node.path);
    } else {
      onSelect(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 cursor-pointer select-none text-sm',
          'transition-colors duration-150',
          isSelected
            ? 'bg-orange-500/20 text-orange-400'
            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-4 h-4 flex items-center justify-center">
          {isDirectory ? (
            hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              )
            ) : (
              <span className="w-3.5" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </div>

        {/* File/Folder Icon */}
        <div className="w-4 h-4 flex items-center justify-center">
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 text-orange-400" />
            ) : (
              <Folder className="w-4 h-4 text-orange-400" />
            )
          ) : (
            <FileText className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {/* Name */}
        <span className={cn(
          'truncate',
          isSelected && 'font-medium'
        )}>
          {node.name}
        </span>
      </div>

      {/* Render children if expanded */}
      {isDirectory && isExpanded && node.children?.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          level={level + 1}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
