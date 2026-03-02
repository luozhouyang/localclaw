/**
 * Hook for code execution
 */
import { useState, useCallback, useRef } from 'react';
import { almostNodeService } from '@/services/code/almostNode';
import { fileSystemService } from '@/services/code/fileSystem';
import type { OutputLine, ExecutionResult } from '@/types/code/execution';

interface UseCodeExecutionReturn {
  /** Whether code is currently executing */
  isExecuting: boolean;
  /** Execution output */
  output: OutputLine[];
  /** Execute code */
  execute: (options: { code?: string; filePath?: string; language: 'javascript' | 'typescript' }) => Promise<ExecutionResult>;
  /** Stop execution */
  stop: () => void;
  /** Clear output */
  clear: () => void;
  /** Append output (for external use) */
  appendOutput: (line: OutputLine) => void;
}

/**
 * Hook for code execution
 */
export function useCodeExecution(): UseCodeExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute code
   */
  const execute = useCallback(
    async (options: {
      code?: string;
      filePath?: string;
      language: 'javascript' | 'typescript';
    }): Promise<ExecutionResult> => {
      if (!almostNodeService.isReady) {
        throw new Error('AlmostNode is not initialized');
      }

      setIsExecuting(true);
      setOutput([]);

      try {
        // Sync file system to AlmostNode VFS
        await fileSystemService.syncToAlmostNode();

        // Create abort controller
        abortControllerRef.current = new AbortController();

        // Execute code
        const result = await almostNodeService.execute({
          ...options,
          signal: abortControllerRef.current.signal,
          onOutput: (line) => {
            setOutput((prev) => [...prev, line]);
          },
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          exitCode: 1,
          output,
          error: errorMessage,
        };
      } finally {
        setIsExecuting(false);
        abortControllerRef.current = null;
      }
    },
    [output]
  );

  /**
   * Stop execution
   */
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Clear output
   */
  const clear = useCallback(() => {
    setOutput([]);
  }, []);

  /**
   * Append output
   */
  const appendOutput = useCallback((line: OutputLine) => {
    setOutput((prev) => [...prev, line]);
  }, []);

  return {
    isExecuting,
    output,
    execute,
    stop,
    clear,
    appendOutput,
  };
}
