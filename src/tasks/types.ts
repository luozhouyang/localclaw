import type { ZodSchema } from 'zod';

// Task status lifecycle: pending -> queued -> running -> completed
//                         |         |        |
//                         |         |        +-> cancelled
//                         |         |
//                         +---------+---> failed -> retry -> queued
//                         |
//                         +---> interrupted -> resume -> queued
export type TaskStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

// Checkpoint for resumable tasks
export interface Checkpoint {
  progress: number;
  message?: string;
  timestamp: number;
  canResume: boolean;
  partialResult?: unknown;
  resumedAt?: number;
}

// Task execution log entry
export interface TaskLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

// Task instance stored in AgentFS
export interface TaskInstance {
  id: string;
  type: string;
  status: TaskStatus;
  input: unknown;
  output?: unknown;
  error?: {
    message: string;
    stack?: string;
    retryCount: number;
    canRetry?: boolean;
  };
  createdAt: number;
  queuedAt?: number;
  startedAt?: number;
  completedAt?: number;
  progress: {
    percent: number;
    message?: string;
    updatedAt: number;
  };
  checkpoint?: Checkpoint;
  logs: TaskLog[];
  retryCount: number;
  nextRetryAt?: number;
  idempotencyKey: string;
}

// Task execution context passed to execute function
export interface TaskContext<Input> {
  taskId: string;
  input: Input;
  reportProgress: (progress: number, message?: string) => void;
  isCancelled: () => boolean;
  getCheckpoint?: () => Checkpoint | undefined;
  saveCheckpoint?: (checkpoint: Omit<Checkpoint, 'timestamp'>) => Promise<void>;
  log: (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
  };
}

// Task configuration
export interface TaskConfig {
  maxRetries: number;
  timeout: number;
  concurrency?: number;
  priority: TaskPriority;
  idempotent?: boolean;
  resumable?: boolean;
  onInterruption?: 'auto-retry' | 'ask-user' | 'fail';
}

// Task definition
export interface TaskDefinition<Input = unknown, Output = unknown> {
  type: string;
  title: string;
  description?: string;
  config: TaskConfig;
  inputSchema?: ZodSchema<Input>;
  outputSchema?: ZodSchema<Output>;
  execute: (context: TaskContext<Input>) => Promise<Output>;
}

// Worker communication types
export interface WorkerMessage {
  type: 'EXECUTE' | 'CANCEL' | 'PING';
  taskId: string;
  definition?: TaskDefinition;
  input?: unknown;
  checkpoint?: Checkpoint;
}

export interface MainMessage {
  type: 'STARTED' | 'PROGRESS' | 'LOG' | 'CHECKPOINT' | 'COMPLETED' | 'FAILED';
  taskId: string;
  timestamp: number;
  percent?: number;
  message?: string;
  level?: 'info' | 'warn' | 'error';
  checkpoint?: Checkpoint;
  output?: unknown;
  error?: { message: string; stack?: string };
  meta?: Record<string, unknown>;
}

// Event callbacks
export type TaskEventType = 'started' | 'progress' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
export type TaskEventCallback = (task: TaskInstance) => void;
