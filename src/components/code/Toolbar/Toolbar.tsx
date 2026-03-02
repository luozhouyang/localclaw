import { Play, Square, Settings, Package, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  isRunning: boolean;
  canRun: boolean;
  language: 'javascript' | 'typescript';
  onRun: () => void;
  onStop: () => void;
  onLanguageChange: (language: 'javascript' | 'typescript') => void;
}

/**
 * Toolbar component for code editor actions
 */
export function Toolbar({
  isRunning,
  canRun,
  language,
  onRun,
  onStop,
  onLanguageChange,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-orange-500/20 bg-[#0D0D0D]">
      <div className="flex items-center gap-2">
        <FileCode className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-gray-300">Code Editor</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-black/30 rounded-lg p-0.5">
          <button
            onClick={() => onLanguageChange('javascript')}
            className={cn(
              'px-3 py-1 text-xs rounded-md transition-colors',
              language === 'javascript'
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            JavaScript
          </button>
          <button
            onClick={() => onLanguageChange('typescript')}
            className={cn(
              'px-3 py-1 text-xs rounded-md transition-colors',
              language === 'typescript'
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            TypeScript
          </button>
        </div>

        {/* Run/Stop Button */}
        {isRunning ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={!canRun}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              canRun
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            )}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Run</span>
          </button>
        )}
      </div>
    </div>
  );
}
