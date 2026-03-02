import { useEffect, useRef } from 'react';
import {
  FilePlus,
  FolderPlus,
  Edit3,
  Trash2,
} from 'lucide-react';
import type { FileNode } from '@/types/code/file';

interface FileContextMenuProps {
  node: FileNode | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

/**
 * Context menu for file operations
 */
export function FileContextMenu({
  node,
  position,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (position) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [position, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (position) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, onClose]);

  if (!position || !node) return null;

  const isDirectory = node.type === 'directory';

  const menuItems = [
    ...(isDirectory
      ? [
          {
            label: 'New File',
            icon: FilePlus,
            onClick: onNewFile,
          },
          {
            label: 'New Folder',
            icon: FolderPlus,
            onClick: onNewFolder,
          },
          { type: 'separator' as const },
        ]
      : []),
    {
      label: 'Rename',
      icon: Edit3,
      onClick: onRename,
    },
    { type: 'separator' as const },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: onDelete,
      danger: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] py-1 rounded-lg glass border border-orange-500/20 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {menuItems.map((item, index) =>
        item.type === 'separator' ? (
          <div key={index} className="my-1 h-px bg-gray-700/50" />
        ) : (
          <button
            key={index}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm
              transition-colors duration-150
              ${
                item.danger
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-gray-300 hover:bg-orange-500/10 hover:text-orange-400'
              }
            `}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}
