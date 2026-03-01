import { useCallback, useEffect, useState } from 'react';
import { taskScheduler } from '@/tasks';
import { taskStore } from '@/tasks/store';
import type { TaskInstance, TaskPriority } from '@/tasks/types';

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

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await taskStore.listTasks();
      setTasks(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();

    const unsubscribe = taskScheduler.subscribe((updatedTask) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    });

    return () => {
      unsubscribe();
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
        const task = await taskScheduler.schedule(type, input, options);
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
      await taskScheduler.cancel(taskId);
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  }, []);

  const resumeTask = useCallback(async (taskId: string) => {
    try {
      await taskScheduler.resume(taskId);
    } catch (err) {
      console.error('Failed to resume task:', err);
    }
  }, []);

  const retryTask = useCallback(async (taskId: string) => {
    try {
      await taskScheduler.resume(taskId);
    } catch (err) {
      console.error('Failed to retry task:', err);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await taskStore.deleteTask(taskId);
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
