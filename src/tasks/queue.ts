import { taskStore } from './store';
import type { TaskInstance, TaskStatus } from './types';

// TODO: Use for priority-based insertion once implemented
// const PRIORITY_WEIGHT: Record<string, number> = {
//   critical: 4,
//   high: 3,
//   normal: 2,
//   low: 1,
// };

export class TaskQueue {
  private inMemoryQueue: string[] = [];
  private isLoaded = false;

  async load(): Promise<void> {
    if (this.isLoaded) return;
    this.inMemoryQueue = await taskStore.getPendingQueue();
    this.isLoaded = true;
  }

  async enqueue(task: TaskInstance): Promise<void> {
    await this.load();

    // Add to queue based on priority
    const insertIndex = this.findInsertIndex(task);
    this.inMemoryQueue.splice(insertIndex, 0, task.id);

    await this.persist();
  }

  async dequeue(): Promise<TaskInstance | null> {
    await this.load();

    while (this.inMemoryQueue.length > 0) {
      const taskId = this.inMemoryQueue.shift()!;
      const task = await taskStore.getTask(taskId);

      if (task && task.status === 'queued') {
        await this.persist();
        return task;
      }
      // Skip tasks that are no longer queued (e.g., cancelled)
    }

    return null;
  }

  async remove(taskId: string): Promise<void> {
    await this.load();
    const index = this.inMemoryQueue.indexOf(taskId);
    if (index !== -1) {
      this.inMemoryQueue.splice(index, 1);
      await this.persist();
    }
  }

  async requeue(taskId: string): Promise<void> {
    await this.load();
    if (!this.inMemoryQueue.includes(taskId)) {
      this.inMemoryQueue.push(taskId);
      await this.persist();
    }
  }

  async getStats(): Promise<Record<TaskStatus, number>> {
    const tasks = await taskStore.listTasks();
    const stats: Record<string, number> = {
      pending: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      interrupted: 0,
    };

    for (const task of tasks) {
      stats[task.status] = (stats[task.status] || 0) + 1;
    }

    return stats as Record<TaskStatus, number>;
  }

  async findTasks(filter: {
    type?: string;
    status?: TaskStatus;
    limit?: number;
  }): Promise<TaskInstance[]> {
    return taskStore.findTasks(filter);
  }

  private findInsertIndex(task: TaskInstance): number {
    // TODO: Implement priority-based insertion
    // const taskPriority = PRIORITY_WEIGHT[task.progress.message || 'normal'] || 2;
    void task; // Currently unused - will be used for priority-based insertion

    for (let i = 0; i < this.inMemoryQueue.length; i++) {
      // We need to look up the priority of queued tasks
      // For simplicity, we'll just append (FIFO within priority)
      // A more sophisticated implementation would load task priorities
    }

    return this.inMemoryQueue.length;
  }

  private async persist(): Promise<void> {
    await taskStore.setPendingQueue(this.inMemoryQueue);
  }
}

// Singleton instance
export const taskQueue = new TaskQueue();
