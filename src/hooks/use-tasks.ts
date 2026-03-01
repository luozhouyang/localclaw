import { useCallback, useEffect, useState } from 'react';
import { useAsyncTasks } from './use-async-tasks';
import type { Task, TaskFilter } from '@/types/task';
import type { TaskInstance, TaskPriority } from '@/tasks/types';

// Convert new TaskInstance to legacy Task format for UI compatibility
function toLegacyTask(instance: TaskInstance): Task {
  const priorityMap: Record<string, Task['priority']> = {
    low: 'low',
    normal: 'medium',
    high: 'high',
    critical: 'high',
  };

  return {
    id: instance.id,
    title: (instance.input as { title?: string })?.title || instance.type,
    description: instance.progress.message || instance.type,
    status: instance.status === 'running' || instance.status === 'queued'
      ? 'in_progress'
      : instance.status === 'interrupted'
      ? 'pending'
      : instance.status === 'failed'
      ? 'cancelled'
      : instance.status,
    priority: priorityMap[instance.progress.message || 'normal'] || 'medium',
    createdAt: instance.createdAt,
    updatedAt: instance.progress.updatedAt || instance.createdAt,
    completedAt: instance.completedAt,
    tags: [instance.type],
  };
}

interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  startTask: (id: string) => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
  getFilteredTasks: (filter: TaskFilter) => Task[];
  getTaskStats: () => { total: number; pending: number; inProgress: number; completed: number };
  refresh: () => Promise<void>;
}

export function useTasks(): UseTasksReturn {
  const {
    tasks: asyncTasks,
    isLoading,
    error,
    createTask: createAsyncTask,
    deleteTask: deleteAsyncTask,
    cancelTask: cancelAsyncTask,
    resumeTask,
    refresh,
  } = useAsyncTasks();

  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(asyncTasks.map(toLegacyTask));
  }, [asyncTasks]);

  const createTask = useCallback(
    async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
      const priorityMap: Record<Task['priority'], TaskPriority> = {
        low: 'low',
        medium: 'normal',
        high: 'high',
      };

      const instance = await createAsyncTask(
        'manual_task',
        {
          title: taskData.title,
          description: taskData.description,
        },
        {
          priority: priorityMap[taskData.priority],
          autoStart: false,
        }
      );

      return toLegacyTask(instance);
    },
    [createAsyncTask]
  );

  const updateTask = useCallback(
    async (_id: string, _updates: Partial<Task>): Promise<void> => {
      console.warn('Task updates not fully supported in async system');
    },
    []
  );

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      await deleteAsyncTask(id);
    },
    [deleteAsyncTask]
  );

  const completeTask = useCallback(
    async (_id: string): Promise<void> => {
      console.warn('Manual task completion not supported in async system');
    },
    []
  );

  const startTask = useCallback(
    async (id: string): Promise<void> => {
      await resumeTask(id);
    },
    [resumeTask]
  );

  const cancelTask = useCallback(
    async (id: string): Promise<void> => {
      await cancelAsyncTask(id);
    },
    [cancelAsyncTask]
  );

  const getFilteredTasks = useCallback(
    (filter: TaskFilter): Task[] => {
      return tasks.filter((task) => {
        if (filter.status && task.status !== filter.status) return false;
        if (filter.priority && task.priority !== filter.priority) return false;
        if (filter.tags && filter.tags.length > 0) {
          const taskTags = task.tags || [];
          if (!filter.tags.some((tag) => taskTags.includes(tag))) return false;
        }
        return true;
      });
    },
    [tasks]
  );

  const getTaskStats = useCallback(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    };
  }, [tasks]);

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    startTask,
    cancelTask,
    getFilteredTasks,
    getTaskStats,
    refresh,
  };
}
