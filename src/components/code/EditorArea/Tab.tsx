import { X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabProps {
  name: string;
  isActive: boolean;
  isDirty: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

/**
 * Individual tab component
 */
export function Tab({ name, isActive, isDirty, onClick, onClose }: TabProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 cursor-pointer select-none',
        'border-r border-orange-500/10 transition-colors duration-150',
        isActive
          ? 'bg-[#1A1A1A] text-orange-400 border-t-2 border-t-orange-500'
          : 'bg-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
      )}
      onClick={onClick}
    >
      <FileText className="w-3.5 h-3.5" />
      <span className={cn(
        'text-sm truncate max-w-[120px]',
        isDirty && 'italic'
      )}>
        {name}
        {isDirty && ' •'}
      </span>
      <button
        className={cn(
          'ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-orange-500/20 hover:text-orange-400',
          isActive && 'opacity-100'
        )}
        onClick={onClose}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
