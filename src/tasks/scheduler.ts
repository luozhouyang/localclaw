import { taskRegistry } from './registry';
import { taskStore } from './store';
import { taskQueue } from './queue';
import { taskExecutor } from './executor';
import type { TaskInstance, TaskPriority } from './types';

interface ScheduleOptions {
  priority?: TaskPriority;
  delay?: number;
  autoStart?: boolean;
}

export class TaskScheduler {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await taskStore.initialize();
    await taskQueue.load();
    await this.recoverInterruptedTasks();

    taskExecutor.start();
    this.isInitialized = true;

    console.log('[TaskScheduler] Initialized');
  }

  async schedule<Input>(
    type: string,
    input: Input,
    options: ScheduleOptions = {}
  ): Promise<TaskInstance> {
    const definition = taskRegistry.get(type);
    if (!definition) {
      throw new Error(`Unknown task type: ${type}`);
    }

    const validation = taskRegistry.validateInput(type, input);
    if (!validation.success) {
      throw new Error(`Invalid input: ${validation.error}`);
    }

    const idempotencyKey = `${type}_${this.hashInput(input)}_${Date.now()}`;

    const task: TaskInstance = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: 'pending',
      input,
      progress: {
        percent: 0,
        updatedAt: Date.now(),
      },
      logs: [],
      retryCount: 0,
      idempotencyKey,
      createdAt: Date.now(),
    };

    await taskStore.saveTask(task);

    if (options.delay) {
      setTimeout(() => {
        this.startTask(task.id).catch(error => {
          console.error(`[TaskScheduler] Failed to start delayed task ${task.id}:`, error);
        });
      }, options.delay);
    } else if (options.autoStart !== false) {
      await this.startTask(task.id);
    }

    return task;
  }

  async startTask(taskId: string): Promise<void> {
    const task = await taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'pending' && task.status !== 'interrupted') {
      throw new Error(`Cannot start task with status: ${task.status}`);
    }

    await taskExecutor.execute(taskId);
  }

  async cancel(taskId: string): Promise<void> {
    await taskExecutor.cancel(taskId);
  }

  async resume(taskId: string): Promise<void> {
    const task = await taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'interrupted' && task.status !== 'failed') {
      throw new Error(`Cannot resume task with status: ${task.status}`);
    }

    task.status = 'pending';
    task.retryCount += 1;
    task.error = undefined;
    await taskStore.saveTask(task);

    await this.startTask(taskId);
  }

  async recoverInterruptedTasks(): Promise<void> {
    const running = await taskStore.findTasks({ status: 'running' });

    for (const task of running) {
      const definition = taskRegistry.get(task.type);
      const onInterruption = definition?.config.onInterruption || 'fail';

      if (
        onInterruption === 'auto-retry' &&
        definition?.config.idempotent &&
        task.checkpoint?.canResume
      ) {
        task.status = 'pending';
        task.checkpoint = {
          ...task.checkpoint,
          resumedAt: Date.now(),
        };
        await taskStore.saveTask(task);
        console.log(`[TaskScheduler] Auto-resumed task ${task.id}`);
      } else {
        task.status = 'interrupted';
        task.error = {
          message: 'Browser closed during execution',
          retryCount: task.retryCount,
          canRetry: true,
        };
        await taskStore.saveTask(task);
      }
    }

    console.log(`[TaskScheduler] Recovered ${running.length} interrupted tasks`);
  }

  on(event: 'started' | 'progress' | 'completed' | 'failed' | 'cancelled' | 'interrupted', callback: (task: TaskInstance) => void): () => void {
    return taskExecutor.on(event, callback);
  }

  subscribe(callback: (task: TaskInstance) => void): () => void {
    const unsubscribers = [
      taskExecutor.on('started', callback),
      taskExecutor.on('progress', callback),
      taskExecutor.on('completed', callback),
      taskExecutor.on('failed', callback),
      taskExecutor.on('cancelled', callback),
      taskExecutor.on('interrupted', callback),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  private hashInput(input: unknown): string {
    return btoa(JSON.stringify(input)).slice(0, 16);
  }
}

export const taskScheduler = new TaskScheduler();
