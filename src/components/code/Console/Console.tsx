import { useRef, useEffect } from 'react';
import { Terminal, Trash2, Square, Play } from 'lucide-react';
import type { OutputLine } from '@/types/code/execution';
import { cn } from '@/lib/utils';

interface ConsoleProps {
  output: OutputLine[];
  isRunning: boolean;
  onClear: () => void;
  onStop?: () => void;
}

/**
 * Console component for displaying code execution output
 */
export function Console({ output, isRunning, onClear, onStop }: ConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-orange-500/20 bg-[#0D0D0D]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-gray-300">Console</span>
          {isRunning && (
            <span className="text-xs text-orange-400 animate-pulse">
              (running)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isRunning && onStop && (
            <button
              onClick={onStop}
              className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
              title="Stop"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}
          <button
            onClick={onClear}
            className="p-1.5 rounded text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-3 font-mono text-sm bg-[#0D0D0D]"
      >
        {output.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Terminal className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Run code to see output</p>
            <p className="text-xs mt-1">Press Ctrl+Enter to execute</p>
          </div>
        ) : (
          output.map((line, index) => (
            <div
              key={index}
              className={cn(
                'whitespace-pre-wrap break-words py-0.5',
                line.type === 'stdout' && 'text-gray-300',
                line.type === 'stderr' && 'text-red-400',
                line.type === 'system' && 'text-orange-400/70 italic',
                line.type === 'error' && 'text-red-400 font-semibold'
              )}
            >
              {line.type === 'stderr' && (
                <span className="text-red-500 mr-1">✗</span>
              )}
              {line.type === 'error' && (
                <span className="text-red-500 mr-1">⚠</span>
              )}
              {line.type === 'system' && line.content.startsWith('✓') && (
                <span className="text-green-500 mr-1">✓</span>
              )}
              {line.type === 'system' && line.content.startsWith('>') && (
                <span className="text-orange-500 mr-1">$</span>
              )}
              {line.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
