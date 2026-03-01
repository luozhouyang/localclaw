import { taskQueue, taskStore } from '@/tasks';
import type { TaskInstance } from '@/tasks/types';
import { CronParser } from './parser';
import { cronStore } from './store';
import {
  DEFAULT_SCHEDULER_CONFIG,
  DEFAULT_JOB_CONFIG,
} from './constants';
import type {
  CronJob,
  NewCronJob,
  SchedulerConfig,
  JobFilter,
  SchedulerStats,
  MissedTaskStrategy,
} from './types';

/**
 * Cron 调度器
 *
 * 负责：
 * 1. 定时检查并执行任务
 * 2. 管理任务生命周期（创建、更新、暂停、删除）
 * 3. 浏览器关闭后的恢复机制
 */
export class CronScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private config: SchedulerConfig;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      ...DEFAULT_SCHEDULER_CONFIG,
      ...config,
    };
  }

  // ============================================
  // 生命周期管理
  // ============================================

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[CronScheduler] Already running');
      return;
    }

    console.log('[CronScheduler] Starting...');

    // 初始化存储
    await cronStore.initialize();

    // 恢复错过的任务
    await this.recoverMissedTasks();

    // 启动定时检查
    this.isRunning = true;
    await this.checkAndRun();
    this.timer = setInterval(
      () => this.checkAndRun(),
      this.config.checkInterval
    );

    // 记录启动时间
    await cronStore.recordStartup();

    console.log('[CronScheduler] Started');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.isRunning = false;

    // 记录关闭时间（异步，不等待完成）
    cronStore.recordShutdown().catch((err) => {
      console.error('[CronScheduler] Failed to record shutdown:', err);
    });

    console.log('[CronScheduler] Stopped');
  }

  /**
   * 强制立即检查（用于页面重新可见时）
   */
  async forceCheck(): Promise<void> {
    if (!this.isRunning) return;
    await this.checkAndRun();
  }

  /**
   * 是否正在运行
   */
  get running(): boolean {
    return this.isRunning;
  }

  // ============================================
  // 任务管理
  // ============================================

  /**
   * 添加新任务
   */
  async addJob(jobData: NewCronJob): Promise<CronJob> {
    // 验证表达式
    const validation = CronParser.validate(jobData.schedule);
    if (!validation.valid) {
      throw new Error(`Invalid schedule: ${validation.error}`);
    }

    const now = Date.now();
    const job: CronJob = {
      ...DEFAULT_JOB_CONFIG,
      ...jobData,
      id: crypto.randomUUID(),
      createdAt: now,
      runCount: 0,
      consecutiveErrors: 0,
      status: jobData.enabled !== false ? 'active' : 'paused',
      nextRunAt: CronParser.getNextRunTime(jobData.schedule),
    };

    await cronStore.saveJob(job);
    console.log(`[CronScheduler] Job created: ${job.name} (${job.id})`);

    return job;
  }

  /**
   * 更新任务
   */
  async updateJob(id: string, updates: Partial<CronJob>): Promise<CronJob> {
    const job = await cronStore.getJob(id);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    // 如果更新 schedule，重新计算 nextRunAt
    if (updates.schedule && updates.schedule !== job.schedule) {
      const validation = CronParser.validate(updates.schedule);
      if (!validation.valid) {
        throw new Error(`Invalid schedule: ${validation.error}`);
      }
      updates.nextRunAt = CronParser.getNextRunTime(updates.schedule);
    }

    const updatedJob = { ...job, ...updates };
    await cronStore.saveJob(updatedJob);

    console.log(`[CronScheduler] Job updated: ${updatedJob.name}`);
    return updatedJob;
  }

  /**
   * 删除任务
   */
  async removeJob(id: string): Promise<void> {
    await cronStore.deleteJob(id);
    console.log(`[CronScheduler] Job removed: ${id}`);
  }

  /**
   * 暂停任务
   */
  async pauseJob(id: string): Promise<CronJob> {
    return this.updateJob(id, {
      enabled: false,
      status: 'paused',
    });
  }

  /**
   * 恢复任务
   */
  async resumeJob(id: string): Promise<CronJob> {
    const job = await cronStore.getJob(id);
    if (!job) throw new Error(`Job not found: ${id}`);

    // 重置连续错误计数
    const updates: Partial<CronJob> = {
      enabled: true,
      status: 'active',
      consecutiveErrors: 0,
    };

    // 重新计算下次执行时间
    if (!job.nextRunAt || job.nextRunAt < Date.now()) {
      updates.nextRunAt = CronParser.getNextRunTime(job.schedule);
    }

    return this.updateJob(id, updates);
  }

  /**
   * 立即执行任务
   * @returns 创建的 Task ID
   */
  async runJobNow(id: string): Promise<string> {
    const job = await cronStore.getJob(id);
    if (!job) throw new Error(`Job not found: ${id}`);

    console.log(`[CronScheduler] Manually triggering job: ${job.name}`);
    await this.executeJob(job, false, true); // isRecovery=false, isManual=true

    // 更新下次执行时间
    await this.updateJob(id, {
      nextRunAt: CronParser.getNextRunTime(job.schedule),
    });

    // 返回最后执行的任务ID（从日志中获取）
    const logs = await cronStore.getLogs(id, { limit: 1 });
    return logs[0]?.taskId ?? '';
  }

  /**
   * 获取任务
   */
  async getJob(id: string): Promise<CronJob | null> {
    return cronStore.getJob(id);
  }

  /**
   * 列出任务
   */
  async listJobs(filter?: JobFilter): Promise<CronJob[]> {
    return cronStore.listJobs(filter);
  }

  // ============================================
  // 查询和统计
  // ============================================

  /**
   * 获取调度器统计
   */
  async getStats(): Promise<SchedulerStats> {
    const jobs = await cronStore.listJobs();

    const activeJobs = jobs.filter((j) => j.status === 'active');
    const pausedJobs = jobs.filter((j) => j.status === 'paused');
    const completedJobs = jobs.filter((j) => j.status === 'completed');
    const errorJobs = jobs.filter((j) => j.status === 'error');

    // 找到下次执行时间最近的任务
    const scheduledJobs = jobs.filter((j) => j.enabled && j.nextRunAt);
    const nextScheduledJob = scheduledJobs.length > 0
      ? scheduledJobs.sort((a, b) => (a.nextRunAt ?? 0) - (b.nextRunAt ?? 0))[0]
      : undefined;

    return {
      totalJobs: jobs.length,
      activeJobs: activeJobs.length,
      pausedJobs: pausedJobs.length,
      completedJobs: completedJobs.length,
      errorJobs: errorJobs.length,
      nextScheduledJob: nextScheduledJob
        ? {
            job: nextScheduledJob,
            nextRun: new Date(nextScheduledJob.nextRunAt!),
          }
        : undefined,
    };
  }

  /**
   * 获取即将执行的任务列表
   */
  async getUpcomingJobs(count: number = 10): Promise<Array<{ job: CronJob; nextRun: Date }>> {
    const jobs = await cronStore.listJobs({ enabled: true });

    return jobs
      .filter((j) => j.nextRunAt)
      .sort((a, b) => (a.nextRunAt ?? 0) - (b.nextRunAt ?? 0))
      .slice(0, count)
      .map((job) => ({
        job,
        nextRun: new Date(job.nextRunAt!),
      }));
  }

  // ============================================
  // 内部：执行逻辑
  // ============================================

  /**
   * 定时检查并执行任务
   */
  private async checkAndRun(): Promise<void> {
    const now = Date.now();
    const jobs = await cronStore.listEnabledJobs();

    for (const job of jobs) {
      // 跳过已达到最大执行次数的任务
      if (job.maxRuns && job.runCount >= job.maxRuns) {
        await this.updateJob(job.id, { status: 'completed', enabled: false });
        console.log(`[CronScheduler] Job completed (max runs): ${job.name}`);
        continue;
      }

      // 检查是否应该执行
      const shouldExecute =
        job.nextRunAt && job.nextRunAt <= now &&
        (!job.lastRunAt || job.nextRunAt > job.lastRunAt);

      if (shouldExecute) {
        await this.executeJob(job);

        // 更新任务状态
        const updates: Partial<CronJob> = {
          lastRunAt: now,
          runCount: job.runCount + 1,
        };

        // 计算下次执行时间
        try {
          updates.nextRunAt = CronParser.getNextRunTime(job.schedule);
        } catch (error) {
          console.error(`[CronScheduler] Failed to calculate next run for ${job.name}:`, error);
        }

        await this.updateJob(job.id, updates);
      }
    }
  }

  /**
   * 执行单个任务
   */
  private async executeJob(
    job: CronJob,
    isRecovery: boolean = false,
    isManual: boolean = false
  ): Promise<void> {
    const triggerType = isManual ? 'manual' : isRecovery ? 'recovery' : 'scheduled';
    console.log(`[CronScheduler] Executing job [${triggerType}]: ${job.name}`);

    const startTime = Date.now();

    try {
      // 创建任务实例
      const task: TaskInstance = {
        id: crypto.randomUUID(),
        type: job.taskType,
        status: 'queued',
        input: {
          ...(typeof job.input === 'object' ? job.input : {}),
          _cronMeta: {
            jobId: job.id,
            jobName: job.name,
            isRecovery,
            isManual,
            scheduledAt: job.nextRunAt,
          },
        },
        progress: {
          message: isManual ? 'Manually triggered' : isRecovery ? 'Recovery run' : 'Scheduled run',
          percent: 0,
          updatedAt: Date.now(),
        },
        createdAt: Date.now(),
        retryCount: 0,
        logs: [],
        idempotencyKey: `${job.id}_${Date.now()}`,
      };

      // 保存任务并加入队列
      await taskStore.saveTask(task);
      await taskQueue.enqueue(task);
      const taskId = task.id;

      // 记录成功日志
      await cronStore.addLog({
        id: crypto.randomUUID(),
        jobId: job.id,
        taskId,
        executedAt: startTime,
        success: true,
        isRecovery,
        duration: Date.now() - startTime,
      });

      // 重置连续错误计数
      if (job.consecutiveErrors > 0) {
        await this.updateJob(job.id, { consecutiveErrors: 0 });
      }

    } catch (error) {
      console.error(`[CronScheduler] Job execution failed: ${job.name}`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // 记录失败日志
      await cronStore.addLog({
        id: crypto.randomUUID(),
        jobId: job.id,
        taskId: '',
        executedAt: startTime,
        success: false,
        error: errorMessage,
        isRecovery,
      });

      // 更新连续错误计数
      const newErrorCount = job.consecutiveErrors + 1;
      const updates: Partial<CronJob> = {
        consecutiveErrors: newErrorCount,
      };

      // 如果超过最大连续错误次数，暂停任务
      if (job.maxConsecutiveErrors && newErrorCount >= job.maxConsecutiveErrors) {
        updates.status = 'error';
        updates.enabled = false;
        console.warn(
          `[CronScheduler] Job paused due to consecutive errors: ${job.name} (${newErrorCount} errors)`
        );
      }

      await this.updateJob(job.id, updates);
    }
  }

  // ============================================
  // 内部：恢复机制
  // ============================================

  /**
   * 恢复浏览器关闭期间错过的任务
   */
  private async recoverMissedTasks(): Promise<void> {
    const lastShutdown = await cronStore.getLastShutdownTime();

    if (!lastShutdown) {
      console.log('[CronScheduler] No previous shutdown time found, skipping recovery');
      return;
    }

    const now = Date.now();
    const lookbackWindow = this.config.recoveryLookbackWindow;

    // 检查是否在回溯窗口内
    if (now - lastShutdown > lookbackWindow) {
      console.log(
        `[CronScheduler] Last shutdown was too long ago (${new Date(
          lastShutdown
        ).toISOString()}), skipping recovery`
      );
      return;
    }

    console.log(
      `[CronScheduler] Recovering missed tasks since ${new Date(
        lastShutdown
      ).toISOString()}`
    );

    const jobs = await cronStore.listEnabledJobs();

    for (const job of jobs) {
      // 计算错过的执行次数
      const missedCount = CronParser.getRunCount(
        job.schedule,
        job.lastRunAt ?? job.createdAt,
        now
      );

      if (missedCount <= 0) continue;

      console.log(
        `[CronScheduler] Job "${job.name}" missed ${missedCount} runs`
      );

      await this.handleMissedRuns(
        job,
        missedCount,
        job.missedRunStrategy ?? this.config.missedRunStrategy
      );
    }
  }

  /**
   * 处理错过的执行
   */
  private async handleMissedRuns(
    job: CronJob,
    missedCount: number,
    strategy: MissedTaskStrategy
  ): Promise<void> {
    switch (strategy) {
      case 'skip':
        console.log(`[CronScheduler] Skipping ${missedCount} missed runs for "${job.name}"`);
        // 只更新 lastRunAt，下次执行按正常计划
        await this.updateJob(job.id, {
          lastRunAt: Date.now(),
          nextRunAt: CronParser.getNextRunTime(job.schedule),
        });
        break;

      case 'run-once':
        if (missedCount > 0) {
          console.log(`[CronScheduler] Running once for missed tasks: "${job.name}"`);
          await this.executeJob(job, true);
          await this.updateJob(job.id, {
            lastRunAt: Date.now(),
            nextRunAt: CronParser.getNextRunTime(job.schedule),
            runCount: job.runCount + 1,
          });
        }
        break;

      case 'run-all': {
        const runsToExecute = Math.min(missedCount, this.config.maxMissedRuns);
        console.log(
          `[CronScheduler] Running ${runsToExecute} missed tasks for "${job.name}"`
        );

        for (let i = 0; i < runsToExecute; i++) {
          await this.executeJob(job, true);
        }

        await this.updateJob(job.id, {
          lastRunAt: Date.now(),
          nextRunAt: CronParser.getNextRunTime(job.schedule),
          runCount: job.runCount + runsToExecute,
        });
        break;
      }
    }
  }
}

/**
 * 默认调度器实例
 */
export const cronScheduler = new CronScheduler();

/**
 * 创建配置化的调度器实例
 */
export function createScheduler(config: Partial<SchedulerConfig>): CronScheduler {
  return new CronScheduler(config);
}