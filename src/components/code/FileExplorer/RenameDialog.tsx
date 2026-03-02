import { useState, useRef, useEffect } from 'react';
import { Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RenameDialogProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

/**
 * Dialog for renaming files or folders
 */
export function RenameDialog({
  isOpen,
  currentName,
  onClose,
  onConfirm,
}: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setError('');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentName]);

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

    if (name.trim() === currentName) {
      onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-sm rounded-xl glass border border-orange-500/20 p-6 shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Edit3 className="w-5 h-5 text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Rename</h3>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Current name: <span className="text-orange-400">{currentName}</span>
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
            placeholder="New name"
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
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
