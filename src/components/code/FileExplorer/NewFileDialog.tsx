import { useState, useRef, useEffect } from 'react';
import { FilePlus, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewFileDialogProps {
  isOpen: boolean;
  type: 'file' | 'directory';
  parentPath: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

/**
 * Dialog for creating new files or folders
 */
export function NewFileDialog({
  isOpen,
  type,
  parentPath,
  onClose,
  onConfirm,
}: NewFileDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (name.includes('/') || name.includes('\\')) {
      setError('Name cannot contain slashes');
      return;
    }

    if (name.startsWith('.')) {
      setError('Name cannot start with a dot');
      return;
    }

    onConfirm(name.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const Icon = type === 'file' ? FilePlus : FolderPlus;
  const title = type === 'file' ? 'New File' : 'New Folder';
  const placeholder = type === 'file' ? 'filename.ts' : 'foldername';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-sm rounded-xl glass border border-orange-500/20 p-6 shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Icon className="w-5 h-5 text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Creating in: <span className="text-orange-400">{parentPath}</span>
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder={placeholder}
            className={cn(
              'w-full px-3 py-2 rounded-lg bg-black/30 border text-white placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-orange-500/50',
              error ? 'border-red-500' : 'border-orange-500/30'
            )}
          />

          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
