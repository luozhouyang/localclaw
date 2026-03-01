import { useState, useEffect, useCallback, useRef } from 'react';
import type { CronJob, SchedulerStats, NewCronJob } from '@/crontab/types';

// Lazy import cronScheduler (client-side only)
async function getCronScheduler() {
  const { cronScheduler } = await import('@/crontab/scheduler');
  return cronScheduler;
}

/**
 * 调度器生命周期 Hook
 * 管理整个 Cron 调度器的启动/停止和全局状态
 */
export function useCronScheduler() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<SchedulerStats | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * 刷新任务列表
   */
  const refresh = useCallback(async () => {
    try {
      const scheduler = await getCronScheduler();
      const [jobList, schedulerStats] = await Promise.all([
        scheduler.listJobs(),
        scheduler.getStats(),
      ]);

      setJobs(jobList);
      setStats(schedulerStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh jobs'));
    }
  }, []);

  /**
   * 初始化调度器
   */
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const scheduler = await getCronScheduler();
        if (!scheduler.running) {
          await scheduler.start();
        }

        if (isMounted) {
          setIsRunning(true);
          setIsInitialized(true);
          await refresh();
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize scheduler'));
        }
      }
    };

    init();

    // 页面可见性变化处理
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // 页面重新可见时强制检查
        const scheduler = await getCronScheduler();
        scheduler.forceCheck().catch(console.error);
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]);

  /**
   * 定期刷新
   */
  useEffect(() => {
    if (!isInitialized) return;

    // 每 5 秒刷新一次任务列表
    refreshInterval.current = setInterval(refresh, 5000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [isInitialized, refresh]);

  /**
   * 添加新任务
   */
  const addJob = useCallback(async (jobData: NewCronJob) => {
    try {
      const scheduler = await getCronScheduler();
      const job = await scheduler.addJob(jobData);
      await refresh();
      return job;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add job');
    }
  }, [refresh]);

  /**
   * 更新任务
   */
  const updateJob = useCallback(async (id: string, updates: Partial<CronJob>) => {
    try {
      const scheduler = await getCronScheduler();
      const job = await scheduler.updateJob(id, updates);
      await refresh();
      return job;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update job');
    }
  }, [refresh]);

  /**
   * 删除任务
   */
  const removeJob = useCallback(async (id: string) => {
    try {
      const scheduler = await getCronScheduler();
      await scheduler.removeJob(id);
      await refresh();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to remove job');
    }
  }, [refresh]);

  /**
   * 暂停任务
   */
  const pauseJob = useCallback(async (id: string) => {
    try {
      const scheduler = await getCronScheduler();
      const job = await scheduler.pauseJob(id);
      await refresh();
      return job;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to pause job');
    }
  }, [refresh]);

  /**
   * 恢复任务
   */
  const resumeJob = useCallback(async (id: string) => {
    try {
      const scheduler = await getCronScheduler();
      const job = await scheduler.resumeJob(id);
      await refresh();
      return job;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to resume job');
    }
  }, [refresh]);

  /**
   * 立即执行任务
   */
  const runJobNow = useCallback(async (id: string) => {
    try {
      const scheduler = await getCronScheduler();
      const taskId = await scheduler.runJobNow(id);
      // 延迟刷新以等待任务创建
      setTimeout(refresh, 500);
      return taskId;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to run job');
    }
  }, [refresh]);

  /**
   * 获取即将执行的任务
   */
  const getUpcomingJobs = useCallback(async (count: number = 10) => {
    const scheduler = await getCronScheduler();
    return scheduler.getUpcomingJobs(count);
  }, []);

  return {
    // 状态
    jobs,
    isRunning,
    isInitialized,
    stats,
    error,

    // 操作
    addJob,
    updateJob,
    removeJob,
    pauseJob,
    resumeJob,
    runJobNow,
    refresh,
    getUpcomingJobs,
  };
}
