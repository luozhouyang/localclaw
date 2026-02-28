import { getSystemStorage } from '@/config/agent-fs';
import type { Task, TaskFilter } from '@/types/task';
import { useCallback, useEffect, useState } from 'react';

const TASKS_KEY = 'tasks:all';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const agent = await getSystemStorage();
      const stored = await agent.kv.get<Task[]>(TASKS_KEY);
      setTasks(stored || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      console.error('[useTasks] Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveTasks = useCallback(async (newTasks: Task[]) => {
    const agent = await getSystemStorage();
    await agent.kv.set(TASKS_KEY, newTasks);
  }, []);

  const createTask = useCallback(async (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Task> => {
    setIsLoading(true);
    try {
      const newTask: Task = {
        ...taskData,
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updatedTasks = [...tasks, newTask];
      await saveTasks(updatedTasks);
      setTasks(updatedTasks);
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [tasks, saveTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setIsLoading(true);
    try {
      const updatedTasks = tasks.map((task) =>
        task.id === id
          ? { ...task, ...updates, updatedAt: Date.now() }
          : task
      );
      await saveTasks(updatedTasks);
      setTasks(updatedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [tasks, saveTasks]);

  const deleteTask = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const updatedTasks = tasks.filter((task) => task.id !== id);
      await saveTasks(updatedTasks);
      setTasks(updatedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [tasks, saveTasks]);

  const completeTask = useCallback(async (id: string) => {
    await updateTask(id, {
      status: 'completed',
      completedAt: Date.now(),
    });
  }, [updateTask]);

  const startTask = useCallback(async (id: string) => {
    await updateTask(id, {
      status: 'in_progress',
    });
  }, [updateTask]);

  const cancelTask = useCallback(async (id: string) => {
    await updateTask(id, {
      status: 'cancelled',
    });
  }, [updateTask]);

  const getFilteredTasks = useCallback((filter: TaskFilter): Task[] => {
    return tasks.filter((task) => {
      if (filter.status && task.status !== filter.status) return false;
      if (filter.priority && task.priority !== filter.priority) return false;
      if (filter.tags && filter.tags.length > 0) {
        const taskTags = task.tags || [];
        if (!filter.tags.some((tag) => taskTags.includes(tag))) return false;
      }
      return true;
    });
  }, [tasks]);

  const getTaskStats = useCallback(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    };
  }, [tasks]);

  const refresh = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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
