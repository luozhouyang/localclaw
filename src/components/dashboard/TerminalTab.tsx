import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Terminal,
  Send,
  Trash2,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { executeBash } from '@/tools/bash';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'info';
  content: string;
  timestamp: number;
}

export function TerminalTab() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [cwd, setCwd] = useState('/home/user');
  const [copiedLine, setCopiedLine] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const executeCommand = async () => {
    if (!input.trim() || isExecuting) return;

    const command = input.trim();
    setInput('');

    // Add input line
    addLine('input', `${cwd}$ ${command}`);
    setIsExecuting(true);

    try {
      const result = await executeBash(command, { cwd });

      // Update cwd if changed
      if (result.env?.PWD) {
        setCwd(result.env.PWD);
      }

      // Add output
      if (result.stdout) {
        addLine('output', result.stdout);
      }

      // Add error if any
      if (result.stderr) {
        addLine('error', result.stderr);
      }

      // Add exit code info if non-zero
      if (result.exitCode !== 0) {
        addLine('info', `[Exit code: ${result.exitCode}]`);
      }
    } catch (err) {
      addLine('error', err instanceof Error ? err.message : 'Command failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    }
  };

  const clearTerminal = () => {
    setLines([]);
  };

  const copyToClipboard = async (content: string, lineId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedLine(lineId);
      setTimeout(() => setCopiedLine(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input':
        return 'text-orange-400';
      case 'output':
        return 'text-stone-300';
      case 'error':
        return 'text-red-400';
      case 'info':
        return 'text-stone-500';
      default:
        return 'text-stone-300';
    }
  };

  return (
    <div className="glass rounded-xl h-[600px] flex flex-col border border-orange-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Terminal className="w-6 h-6 text-orange-400" />
            <div className="absolute inset-0 blur-lg bg-orange-400/50 -z-10" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">TERMINAL</h2>
            <p className="text-xs text-orange-400/70 font-code">{cwd}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearTerminal}
            className="border-orange-500/30 hover:bg-orange-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 font-mono text-sm custom-scrollbar bg-stone-950/50"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-600">
            <Terminal className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xs">Terminal ready. Type a command to start.</p>
            <p className="text-xs mt-1 opacity-50">Try: ls, pwd, echo hello, cat file.txt</p>
          </div>
        ) : (
          <div className="space-y-1">
            {lines.map((line) => (
              <div
                key={line.id}
                className={`group flex items-start gap-2 ${getLineColor(line.type)}`}
              >
                <div className="flex-1 whitespace-pre-wrap break-all">
                  {line.type === 'input' ? (
                    <span className="text-orange-400">{line.content}</span>
                  ) : (
                    line.content
                  )}
                </div>
                <button
                  onClick={() => copyToClipboard(line.content, line.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-stone-800 rounded"
                  title="Copy"
                >
                  {copiedLine === line.id ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-stone-500" />
                  )}
                </button>
              </div>
            ))}
            {isExecuting && (
              <div className="flex items-center gap-2 text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-orange-500/20 bg-stone-900/50">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 font-mono text-sm whitespace-nowrap">{cwd}$</span>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type command..."
            disabled={isExecuting}
            className="flex-1 bg-stone-800/50 border-orange-500/30 text-white font-mono text-sm focus:border-orange-400 placeholder:text-stone-600"
            spellCheck={false}
            autoComplete="off"
          />
          <Button
            onClick={executeCommand}
            disabled={!input.trim() || isExecuting}
            className="bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-50"
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
