import { taskRegistry } from './registry';
import { taskStore } from './store';
import { taskQueue } from './queue';
import type { TaskInstance, MainMessage, TaskEventCallback, TaskEventType } from './types';

class TaskEventEmitter {
  private listeners: Map<TaskEventType, Set<TaskEventCallback>> = new Map();

  on(event: TaskEventType, callback: TaskEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: TaskEventType, task: TaskInstance): void {
    this.listeners.get(event)?.forEach(cb => cb(task));
  }
}

export class TaskExecutor {
  private worker: Worker | null = null;
  private runningTasks = new Map<string, TaskInstance>();
  private eventEmitter = new TaskEventEmitter();
  private isRunning = false;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(new URL('../workers/task-worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (event: MessageEvent<MainMessage>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('[TaskExecutor] Worker error:', error);
      };
    } catch (error) {
      console.error('[TaskExecutor] Failed to initialize worker:', error);
    }
  }

  private async handleWorkerMessage(msg: MainMessage): Promise<void> {
    const { type, taskId } = msg;
    const task = await taskStore.getTask(taskId);
    if (!task) return;

    switch (type) {
      case 'STARTED':
        task.status = 'running';
        task.startedAt = msg.timestamp;
        this.runningTasks.set(taskId, task);
        await this.updateRunningList();
        await taskStore.saveTask(task);
        this.eventEmitter.emit('started', task);
        break;

      case 'PROGRESS':
        task.progress = {
          percent: msg.percent || 0,
          message: msg.message,
          updatedAt: msg.timestamp,
        };
        await taskStore.saveTask(task);
        this.eventEmitter.emit('progress', task);
        break;

      case 'LOG':
        task.logs.push({
          level: msg.level || 'info',
          message: msg.message || '',
          timestamp: msg.timestamp,
          meta: msg.meta,
        });
        await taskStore.saveTask(task);
        break;

      case 'CHECKPOINT':
        if (msg.checkpoint) {
          task.checkpoint = msg.checkpoint;
          await taskStore.saveTask(task);
        }
        break;

      case 'COMPLETED':
        task.status = 'completed';
        task.completedAt = msg.timestamp;
        task.output = msg.output;
        task.progress = { percent: 100, updatedAt: msg.timestamp };
        this.runningTasks.delete(taskId);
        await this.updateRunningList();
        await taskStore.saveTask(task);
        this.eventEmitter.emit('completed', task);
        this.processNext();
        break;

      case 'FAILED':
        task.status = 'failed';
        task.error = {
          message: msg.error?.message || 'Unknown error',
          stack: msg.error?.stack,
          retryCount: task.retryCount,
          canRetry: task.retryCount < (taskRegistry.get(task.type)?.config.maxRetries || 0),
        };
        this.runningTasks.delete(taskId);
        await this.updateRunningList();
        await taskStore.saveTask(task);
        this.eventEmitter.emit('failed', task);
        this.processNext();
        break;
    }
  }

  private async updateRunningList(): Promise<void> {
    await taskStore.setRunningTasks(Array.from(this.runningTasks.keys()));
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processNext();
  }

  stop(): void {
    this.isRunning = false;
  }

  async execute(taskId: string): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const task = await taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const definition = taskRegistry.get(task.type);
    if (!definition) {
      throw new Error(`Unknown task type: ${task.type}`);
    }

    const validation = taskRegistry.validateInput(task.type, task.input);
    if (!validation.success) {
      throw new Error(`Invalid input: ${validation.error}`);
    }

    task.status = 'queued';
    task.queuedAt = Date.now();
    await taskStore.saveTask(task);
    await taskQueue.enqueue(task);

    if (this.isRunning) {
      this.processNext();
    }
  }

  async cancel(taskId: string): Promise<void> {
    this.worker?.postMessage({
      type: 'CANCEL',
      taskId,
    });

    const task = await taskStore.getTask(taskId);
    if (task && task.status === 'running') {
      task.status = 'cancelled';
      this.runningTasks.delete(taskId);
      await this.updateRunningList();
      await taskStore.saveTask(task);
      this.eventEmitter.emit('cancelled', task);
    }
  }

  on(event: TaskEventType, callback: TaskEventCallback): () => void {
    return this.eventEmitter.on(event, callback);
  }

  private async processNext(): Promise<void> {
    if (!this.isRunning) return;

    const task = await taskQueue.dequeue();
    if (!task) return;

    const definition = taskRegistry.get(task.type);
    if (!definition) {
      console.error(`[TaskExecutor] Unknown task type: ${task.type}`);
      return;
    }

    const concurrency = definition.config.concurrency || 1;
    const sameTypeRunning = Array.from(this.runningTasks.values()).filter(
      t => t.type === task.type
    ).length;

    if (sameTypeRunning >= concurrency) {
      await taskQueue.requeue(task.id);
      setTimeout(() => this.processNext(), 1000);
      return;
    }

    this.worker?.postMessage({
      type: 'EXECUTE',
      taskId: task.id,
      definition: {
        type: definition.type,
        title: definition.title,
        description: definition.description,
        config: definition.config,
        execute: undefined,
      },
      input: task.input,
      checkpoint: task.checkpoint,
    });
  }
}

export const taskExecutor = new TaskExecutor();
