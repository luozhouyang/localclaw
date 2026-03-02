/**
 * Code execution types for Code editor
 */

export interface OutputLine {
  /** Output type */
  type: 'stdout' | 'stderr' | 'system' | 'error';
  /** Output content */
  content: string;
  /** Timestamp */
  timestamp: number;
}

export interface ExecuteOptions {
  /** Code to execute (optional if filePath is provided) */
  code?: string;
  /** File path to execute (optional if code is provided) */
  filePath?: string;
  /** Programming language */
  language: 'javascript' | 'typescript';
  /** Output callback for streaming */
  onOutput?: (line: OutputLine) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Execution timeout in ms */
  timeout?: number;
}

export interface ExecutionResult {
  /** Whether execution succeeded */
  success: boolean;
  /** Exit code */
  exitCode: number;
  /** All output lines */
  output: OutputLine[];
  /** Error message if failed */
  error?: string;
  /** Execution time in ms */
  executionTime?: number;
  /** Return value */
  result?: unknown;
}

export interface ExecutionState {
  /** Whether code is currently executing */
  isExecuting: boolean;
  /** Current output */
  output: OutputLine[];
  /** Abort controller for cancellation */
  abortController: AbortController | null;
}

export interface PackageDependency {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Whether it's a dev dependency */
  isDev: boolean;
}

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/**
 * Create a system output line
 */
export function createSystemOutput(content: string): OutputLine {
  return {
    type: 'system',
    content,
    timestamp: Date.now(),
  };
}

/**
 * Create an error output line
 */
export function createErrorOutput(content: string): OutputLine {
  return {
    type: 'error',
    content,
    timestamp: Date.now(),
  };
}

/**
 * Format execution time
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
