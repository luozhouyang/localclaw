import { getFS } from '@/lib/file-utils';
import { STORAGE_PATHS, SCHEDULER_STATE_VERSION } from './constants';
import type {
  CronJob,
  CronLog,
  SchedulerState,
  JobFilter,
  LogQueryOptions,
  LogStats,
} from './types';

/**
 * Cron 数据存储
 * 基于 AgentFS (SQLite/OPFS) 实现持久化
 */
export class CronStore {
  private async ensureDir(path: string): Promise<void> {
    const fs = await getFS();
    // 递归创建目录：逐级创建父目录
    const parts = path.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;
      try {
        await fs.mkdir(currentPath);
      } catch (err: any) {
        // 忽略目录已存在的错误
        if (!err?.message?.includes('exists')) {
          // 其他错误继续抛出
          console.warn(`[CronStore] Failed to create directory ${currentPath}:`, err);
        }
      }
    }
  }

  private async writeJSON(path: string, data: unknown): Promise<void> {
    const fs = await getFS();
    await this.ensureDir(path.substring(0, path.lastIndexOf('/')));
    await fs.writeFile(path, JSON.stringify(data, null, 2));
  }

  private async readJSON<T>(path: string): Promise<T | null> {
    const fs = await getFS();
    try {
      const content = await fs.readFile(path, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  private async appendLine(path: string, line: string): Promise<void> {
    const fs = await getFS();
    await this.ensureDir(path.substring(0, path.lastIndexOf('/')));

    try {
      const existing = await fs.readFile(path, 'utf-8');
      await fs.writeFile(path, existing + line + '\n');
    } catch {
      await fs.writeFile(path, line + '\n');
    }
  }

  // ============================================
  // Job CRUD
  // ============================================

  /**
   * 保存任务
   */
  async saveJob(job: CronJob): Promise<void> {
    const path = `${STORAGE_PATHS.JOBS_DIR}/${job.id}.json`;
    await this.writeJSON(path, job);
  }

  /**
   * 获取任务
   */
  async getJob(id: string): Promise<CronJob | null> {
    const path = `${STORAGE_PATHS.JOBS_DIR}/${id}.json`;
    return this.readJSON<CronJob>(path);
  }

  /**
   * 删除任务
   */
  async deleteJob(id: string): Promise<void> {
    const fs = await getFS();
    const path = `${STORAGE_PATHS.JOBS_DIR}/${id}.json`;
    try {
      await fs.rm(path);
    } catch {
      // 文件可能不存在，忽略错误
    }
  }

  /**
   * 列出所有任务
   */
  async listJobs(filter?: JobFilter): Promise<CronJob[]> {
    const fs = await getFS();
    await this.ensureDir(STORAGE_PATHS.JOBS_DIR);

    try {
      const entries = await fs.readdir(STORAGE_PATHS.JOBS_DIR);
      const jobs: CronJob[] = [];

      for (const entry of entries) {
        if (entry.endsWith('.json')) {
          const job = await this.getJob(entry.replace('.json', ''));
          if (job) jobs.push(job);
        }
      }

      // 应用过滤器
      let filtered = jobs;

      if (filter?.status) {
        filtered = filtered.filter((j) => j.status === filter.status);
      }

      if (filter?.taskType) {
        filtered = filtered.filter((j) => j.taskType === filter.taskType);
      }

      if (filter?.enabled !== undefined) {
        filtered = filtered.filter((j) => j.enabled === filter.enabled);
      }

      // 按创建时间倒序
      filtered.sort((a, b) => b.createdAt - a.createdAt);

      if (filter?.limit) {
        filtered = filtered.slice(0, filter.limit);
      }

      return filtered;
    } catch {
      return [];
    }
  }

  /**
   * 获取所有启用的任务
   */
  async listEnabledJobs(): Promise<CronJob[]> {
    return this.listJobs({ enabled: true });
  }

  // ============================================
  // 日志管理
  // ============================================

  /**
   * 添加日志
   * 使用 JSONL 格式追加写入，便于查询和追加
   */
  async addLog(log: CronLog): Promise<void> {
    const date = new Date(log.executedAt).toISOString().split('T')[0];
    const logFile = `${STORAGE_PATHS.LOGS_DIR}/${date}.jsonl`;
    await this.appendLine(logFile, JSON.stringify(log));
  }

  /**
   * 获取任务日志
   */
  async getLogs(jobId: string, options?: LogQueryOptions): Promise<CronLog[]> {
    const fs = await getFS();
    const logs: CronLog[] = [];

    try {
      await this.ensureDir(STORAGE_PATHS.LOGS_DIR);
      const entries = await fs.readdir(STORAGE_PATHS.LOGS_DIR);

      // 按日期倒序排列（最新的在前）
      const sortedEntries = entries
        .filter((e) => e.endsWith('.jsonl'))
        .sort()
        .reverse();

      for (const entry of sortedEntries) {
        if (logs.length >= (options?.limit ?? 100)) break;

        const logFile = `${STORAGE_PATHS.LOGS_DIR}/${entry}`;
        const content = await fs.readFile(logFile, 'utf-8');
        const lines = content.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const log = JSON.parse(line) as CronLog;
            if (log.jobId !== jobId) continue;

            // 应用过滤器
            if (options?.from && log.executedAt < options.from) continue;
            if (options?.to && log.executedAt > options.to) continue;
            if (options?.successOnly && !log.success) continue;

            logs.push(log);
          } catch {
            // 忽略解析错误的行
          }
        }
      }

      return logs.slice(0, options?.limit ?? 100);
    } catch {
      return [];
    }
  }

  /**
   * 获取日志统计
   */
  async getLogStats(jobId: string, since?: number): Promise<LogStats> {
    const logs = await this.getLogs(jobId, { from: since });

    const successCount = logs.filter((l) => l.success).length;
    const failureCount = logs.length - successCount;
    const successRate = logs.length > 0 ? successCount / logs.length : 0;

    const durations = logs.filter((l) => l.duration).map((l) => l.duration!);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : undefined;

    return {
      totalRuns: logs.length,
      successCount,
      failureCount,
      successRate,
      avgDuration,
    };
  }

  /**
   * 清理旧日志
   * @param before 删除此日期之前的日志
   */
  async cleanupLogs(before: Date): Promise<number> {
    const fs = await getFS();
    let deletedCount = 0;

    try {
      const entries = await fs.readdir(STORAGE_PATHS.LOGS_DIR);
      const beforeStr = before.toISOString().split('T')[0];

      for (const entry of entries) {
        if (!entry.endsWith('.jsonl')) continue;

        const dateStr = entry.replace('.jsonl', '');
        if (dateStr < beforeStr) {
          try {
            await fs.rm(`${STORAGE_PATHS.LOGS_DIR}/${entry}`);
            deletedCount++;
          } catch {
            // 忽略删除失败的错误
          }
        }
      }

      return deletedCount;
    } catch {
      return 0;
    }
  }

  // ============================================
  // 系统状态管理
  // ============================================

  /**
   * 保存调度器状态
   */
  async saveState(state: Partial<SchedulerState>): Promise<void> {
    const existing = (await this.getState()) ?? {
      version: SCHEDULER_STATE_VERSION,
    };

    const newState: SchedulerState = {
      ...existing,
      ...state,
      version: SCHEDULER_STATE_VERSION,
    };

    await this.writeJSON(STORAGE_PATHS.STATE_FILE, newState);
  }

  /**
   * 获取调度器状态
   */
  async getState(): Promise<SchedulerState | null> {
    return this.readJSON<SchedulerState>(STORAGE_PATHS.STATE_FILE);
  }

  /**
   * 记录启动时间
   */
  async recordStartup(): Promise<void> {
    await this.saveState({ lastStartup: Date.now() });
    await this.writeJSON(STORAGE_PATHS.STARTUP_FILE, Date.now().toString());
  }

  /**
   * 记录关闭时间
   */
  async recordShutdown(): Promise<void> {
    await this.saveState({ lastShutdown: Date.now() });
    await this.writeJSON(STORAGE_PATHS.SHUTDOWN_FILE, Date.now().toString());
  }

  /**
   * 获取上次关闭时间
   */
  async getLastShutdownTime(): Promise<number | null> {
    try {
      const content = await this.readJSON<string>(STORAGE_PATHS.SHUTDOWN_FILE);
      if (content) return parseInt(content, 10);
    } catch {
      // 忽略错误
    }

    // 回退到状态文件
    const state = await this.getState();
    return state?.lastShutdown ?? null;
  }

  /**
   * 获取上次启动时间
   */
  async getLastStartupTime(): Promise<number | null> {
    try {
      const content = await this.readJSON<string>(STORAGE_PATHS.STARTUP_FILE);
      if (content) return parseInt(content, 10);
    } catch {
      // 忽略错误
    }

    const state = await this.getState();
    return state?.lastStartup ?? null;
  }

  /**
   * 检测是否异常关闭
   * 如果上次启动时间晚于关闭时间，说明异常关闭
   */
  async isAbnormalShutdown(): Promise<boolean> {
    const [lastStartup, lastShutdown] = await Promise.all([
      this.getLastStartupTime(),
      this.getLastShutdownTime(),
    ]);

    if (!lastStartup) return false;
    if (!lastShutdown) return true; // 从未正常关闭过

    return lastStartup > lastShutdown;
  }

  // ============================================
  // 初始化
  // ============================================

  /**
   * 初始化存储目录
   */
  async initialize(): Promise<void> {
    await this.ensureDir(STORAGE_PATHS.JOBS_DIR);
    await this.ensureDir(STORAGE_PATHS.LOGS_DIR);
  }
}

/**
 * 单例实例
 */
export const cronStore = new CronStore();
