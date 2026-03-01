/// <reference lib="webworker" />

import type { WorkerMessage, MainMessage, TaskDefinition, TaskContext, Checkpoint } from '../tasks/types';

// In-memory registry for worker (populated by main thread)
const definitions = new Map<string, TaskDefinition>();
const activeTasks = new Map<string, { cancelled: boolean }>();

// Mock AgentFS for worker (actual fs operations done via message passing)
const createFS = () => ({
  readFile: async (_path: string): Promise<string> => {
    throw new Error('File operations in worker not implemented. Pass data via input.');
  },
  writeFile: async (_path: string, _content: string): Promise<void> => {
    throw new Error('File operations in worker not implemented. Return data via output.');
  },
});

function sendMessage(msg: MainMessage): void {
  self.postMessage(msg);
}

async function executeTask(
  taskId: string,
  definition: TaskDefinition,
  input: unknown,
  checkpoint?: Checkpoint
): Promise<void> {
  const taskState = { cancelled: false };
  activeTasks.set(taskId, taskState);

  const ctx: TaskContext<unknown> = {
    taskId,
    input,
    reportProgress: (progress: number, message?: string) => {
      sendMessage({
        type: 'PROGRESS',
        taskId,
        timestamp: Date.now(),
        percent: progress,
        message,
      });
    },
    isCancelled: () => taskState.cancelled,
    log: (level, message, meta) => {
      sendMessage({
        type: 'LOG',
        taskId,
        timestamp: Date.now(),
        level,
        message,
        meta,
      });
    },
    getCheckpoint: checkpoint ? () => checkpoint : undefined,
    saveCheckpoint: definition.config.resumable
      ? async (cp) => {
          sendMessage({
            type: 'CHECKPOINT',
            taskId,
            timestamp: Date.now(),
            checkpoint: {
              ...cp,
              timestamp: Date.now(),
            } as Checkpoint,
          });
        }
      : undefined,
    fs: createFS(),
  };

  try {
    sendMessage({
      type: 'STARTED',
      taskId,
      timestamp: Date.now(),
    });

    const output = await definition.execute(ctx);

    sendMessage({
      type: 'COMPLETED',
      taskId,
      timestamp: Date.now(),
      output,
    });
  } catch (error) {
    sendMessage({
      type: 'FAILED',
      taskId,
      timestamp: Date.now(),
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  } finally {
    activeTasks.delete(taskId);
  }
}

function cancelTask(taskId: string): void {
  const task = activeTasks.get(taskId);
  if (task) {
    task.cancelled = true;
  }
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, taskId, definition, input, checkpoint } = event.data;

  switch (type) {
    case 'EXECUTE':
      if (!definition) {
        sendMessage({
          type: 'FAILED',
          taskId,
          timestamp: Date.now(),
          error: { message: 'No task definition provided' },
        });
        return;
      }
      definitions.set(definition.type, definition);
      executeTask(taskId, definition, input, checkpoint);
      break;

    case 'CANCEL':
      cancelTask(taskId);
      break;

    case 'PING':
      sendMessage({
        type: 'LOG',
        taskId,
        timestamp: Date.now(),
        level: 'info',
        message: 'Pong',
      });
      break;
  }
};

export {};
