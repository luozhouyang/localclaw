import { useCallback, useEffect, useState, useRef } from 'react';
import type { TaskInstance, TaskPriority } from '@/tasks/types';
import { getTaskScheduler, getTaskStore } from '@/lib/imports';

interface UseAsyncTasksReturn {
  tasks: TaskInstance[];
  isLoading: boolean;
  error: string | null;
  createTask: <Input>(
    type: string,
    input: Input,
    options?: { priority?: TaskPriority; autoStart?: boolean }
  ) => Promise<TaskInstance>;
  cancelTask: (taskId: string) => Promise<void>;
  resumeTask: (taskId: string) => Promise<void>;
  retryTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAsyncTasks(): UseAsyncTasksReturn {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schedulerRef = useRef<Awaited<ReturnType<typeof getTaskScheduler>> | null>(null);
  const storeRef = useRef<Awaited<ReturnType<typeof getTaskStore>> | null>(null);

  // Initialize
  useEffect(() => {
    getTaskScheduler().then(sched => {
      schedulerRef.current = sched;
    });
    getTaskStore().then(store => {
      storeRef.current = store;
    });
  }, []);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const store = storeRef.current;
      if (!store) return;
      const loaded = await store.listTasks();
      setTasks(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();

    const unsubscribe = schedulerRef.current?.subscribe((updatedTask) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    });

    return () => {
      unsubscribe?.();
    };
  }, [loadTasks]);

  const createTask = useCallback(
    async <Input,>(
      type: string,
      input: Input,
      options?: { priority?: TaskPriority; autoStart?: boolean }
    ): Promise<TaskInstance> => {
      setIsLoading(true);
      try {
        const scheduler = schedulerRef.current;
        if (!scheduler) throw new Error('Task scheduler not initialized');
        const task = await scheduler.schedule(type, input, options);
        setTasks((prev) => [task, ...prev]);
        return task;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create task');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const cancelTask = useCallback(async (taskId: string) => {
    try {
      const scheduler = schedulerRef.current;
      if (!scheduler) return;
      await scheduler.cancel(taskId);
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  }, []);

  const resumeTask = useCallback(async (taskId: string) => {
    try {
      const scheduler = schedulerRef.current;
      if (!scheduler) return;
      await scheduler.resume(taskId);
    } catch (err) {
      console.error('Failed to resume task:', err);
    }
  }, []);

  const retryTask = useCallback(async (taskId: string) => {
    try {
      const scheduler = schedulerRef.current;
      if (!scheduler) return;
      await scheduler.resume(taskId);
    } catch (err) {
      console.error('Failed to retry task:', err);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const store = storeRef.current;
      if (!store) return;
      await store.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    isLoading,
    error,
    createTask,
    cancelTask,
    resumeTask,
    retryTask,
    deleteTask,
    refresh,
  };
}
