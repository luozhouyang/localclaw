import { useState, useEffect, useCallback, useRef } from 'react';
import type { CronJob, CronLog } from '@/crontab/types';

// Lazy imports (client-side only)
async function getCronStore() {
  const { cronStore } = await import('@/crontab/store');
  return cronStore;
}

async function getCronScheduler() {
  const { cronScheduler } = await import('@/crontab/scheduler');
  return cronScheduler;
}

/**
 * 单任务管理 Hook
 * 用于管理单个定时任务的生命周期
 */
export function useCron(jobId: string | null) {
  const [job, setJob] = useState<CronJob | null>(null);
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * 加载任务详情
   */
  const loadJob = useCallback(async () => {
    if (!jobId) return;

    setIsLoading(true);
    setError(null);

    try {
      const store = await getCronStore();
      const [jobData, jobLogs] = await Promise.all([
        store.getJob(jobId),
        store.getLogs(jobId, { limit: 50 }),
      ]);

      setJob(jobData);
      setLogs(jobLogs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load job'));
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  /**
   * 初始加载和自动刷新
   */
  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLogs([]);
      return;
    }

    loadJob();

    // 每 10 秒自动刷新
    refreshInterval.current = setInterval(loadJob, 10000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [jobId, loadJob]);

  /**
   * 更新任务
   */
  const update = useCallback(
    async (updates: Partial<CronJob>) => {
      if (!jobId) throw new Error('No job ID provided');

      try {
        const scheduler = await getCronScheduler();
        const updated = await scheduler.updateJob(jobId, updates);
        setJob(updated);
        return updated;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update job');
      }
    },
    [jobId]
  );

  /**
   * 删除任务
   */
  const remove = useCallback(async () => {
    if (!jobId) throw new Error('No job ID provided');

    try {
      const scheduler = await getCronScheduler();
      await scheduler.removeJob(jobId);
      setJob(null);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to remove job');
    }
  }, [jobId]);

  /**
   * 立即执行任务
   */
  const runNow = useCallback(async () => {
    if (!jobId) throw new Error('No job ID provided');

    try {
      const scheduler = await getCronScheduler();
      const taskId = await scheduler.runJobNow(jobId);
      // 延迟刷新以等待任务创建
      setTimeout(loadJob, 500);
      return taskId;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to run job');
    }
  }, [jobId, loadJob]);

  /**
   * 暂停任务
   */
  const pause = useCallback(async () => {
    if (!jobId) throw new Error('No job ID provided');

    try {
      const scheduler = await getCronScheduler();
      const updated = await scheduler.pauseJob(jobId);
      setJob(updated);
      return updated;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to pause job');
    }
  }, [jobId]);

  /**
   * 恢复任务
   */
  const resume = useCallback(async () => {
    if (!jobId) throw new Error('No job ID provided');

    try {
      const scheduler = await getCronScheduler();
      const updated = await scheduler.resumeJob(jobId);
      setJob(updated);
      return updated;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to resume job');
    }
  }, [jobId]);

  /**
   * 手动刷新
   */
  const refresh = useCallback(() => {
    return loadJob();
  }, [loadJob]);

  return {
    job,
    logs,
    isLoading,
    error,
    update,
    remove,
    runNow,
    pause,
    resume,
    refresh,
  };
}
