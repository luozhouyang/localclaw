import type { TaskInstance, TaskStatus } from './types';

const TASKS_DIR = '/tasks/instances';
const QUEUE_FILE = '/tasks/queue/pending.json';
const RUNNING_FILE = '/tasks/queue/running.json';

// Lazy load agent-fs (client-side only)
async function getFS() {
  const { getSystemStorage } = await import('@/config/agent-fs');
  return getSystemStorage();
}

export class TaskStore {
  private async ensureDir(path: string): Promise<void> {
    const fs = await getFS();
    try {
      await fs.fs.mkdir(path);
    } catch {
      // Directory may already exist
    }
  }

  private async writeJSON(path: string, data: unknown): Promise<void> {
    const fs = await getFS();
    await this.ensureDir(path.substring(0, path.lastIndexOf('/')));
    await fs.fs.writeFile(path, JSON.stringify(data, null, 2));
  }

  private async readJSON<T>(path: string): Promise<T | null> {
    const fs = await getFS();
    try {
      const content = await fs.fs.readFile(path, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  async saveTask(task: TaskInstance): Promise<void> {
    const path = `${TASKS_DIR}/${task.id}.json`;
    await this.writeJSON(path, task);
  }

  async getTask(id: string): Promise<TaskInstance | null> {
    const path = `${TASKS_DIR}/${id}.json`;
    return this.readJSON<TaskInstance>(path);
  }

  async deleteTask(id: string): Promise<void> {
    const fs = await getFS();
    const path = `${TASKS_DIR}/${id}.json`;
    try {
      await fs.fs.rm(path, { force: true });
    } catch {
      // File may not exist
    }
  }

  async listTasks(): Promise<TaskInstance[]> {
    const fs = await getFS();
    await this.ensureDir(TASKS_DIR);

    try {
      const entries = await fs.fs.readdir(TASKS_DIR);
      const tasks: TaskInstance[] = [];

      for (const entry of entries) {
        if (entry.endsWith('.json')) {
          const task = await this.readJSON<TaskInstance>(`${TASKS_DIR}/${entry}`);
          if (task) tasks.push(task);
        }
      }

      return tasks.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  async findTasks(filter: {
    status?: TaskStatus;
    type?: string;
    limit?: number;
  }): Promise<TaskInstance[]> {
    let tasks = await this.listTasks();

    if (filter.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }
    if (filter.type) {
      tasks = tasks.filter(t => t.type === filter.type);
    }
    if (filter.limit) {
      tasks = tasks.slice(0, filter.limit);
    }

    return tasks;
  }

  async getPendingQueue(): Promise<string[]> {
    const ids = await this.readJSON<string[]>(QUEUE_FILE);
    return ids || [];
  }

  async setPendingQueue(ids: string[]): Promise<void> {
    await this.writeJSON(QUEUE_FILE, ids);
  }

  async getRunningTasks(): Promise<string[]> {
    const ids = await this.readJSON<string[]>(RUNNING_FILE);
    return ids || [];
  }

  async setRunningTasks(ids: string[]): Promise<void> {
    await this.writeJSON(RUNNING_FILE, ids);
  }

  async initialize(): Promise<void> {
    await this.ensureDir(TASKS_DIR);
    await this.ensureDir('/tasks/queue');
  }
}

// Singleton instance
export const taskStore = new TaskStore();
