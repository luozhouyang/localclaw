import type { TaskPriority } from '@/tasks/types';

/**
 * 定时任务状态
 */
export type CronJobStatus = 'active' | 'paused' | 'completed' | 'error';

/**
 * 错过的任务处理策略
 * - skip: 跳过所有错过的执行，从当前时间重新开始
 * - run-once: 只执行一次，代表所有错过的执行
 * - run-all: 逐个执行所有错过的任务（有上限）
 */
export type MissedTaskStrategy = 'skip' | 'run-once' | 'run-all';

/**
 * Cron 表达式预设别名
 */
export type CronPreset =
  | '@yearly'
  | '@monthly'
  | '@weekly'
  | '@daily'
  | '@hourly'
  | '@every5min'
  | '@every10min'
  | '@every30min';

/**
 * 定时任务定义
 */
export interface CronJob {
  /** 唯一标识 */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;

  // 调度配置
  /** Cron 表达式或预设别名 */
  schedule: string;
  /** 时区，默认使用本地时间 */
  timezone?: string;

  // 执行配置
  /** 关联的任务类型（注册到 TaskRegistry） */
  taskType: string;
  /** 任务输入参数 */
  input: unknown;

  // 状态管理
  /** 任务状态 */
  status: CronJobStatus;
  /** 是否启用 */
  enabled: boolean;

  // 执行统计
  /** 创建时间 */
  createdAt: number;
  /** 上次执行时间 */
  lastRunAt?: number;
  /** 下次计划执行时间 */
  nextRunAt?: number;
  /** 已执行次数 */
  runCount: number;
  /** 最大执行次数（可选，达到后自动完成） */
  maxRuns?: number;

  // 错误处理
  /** 连续错误次数 */
  consecutiveErrors: number;
  /** 最大允许连续错误（超过则自动暂停） */
  maxConsecutiveErrors?: number;

  // 恢复策略
  /** 错过任务处理策略 */
  missedRunStrategy: MissedTaskStrategy;

  // 任务优先级（传递给 TaskQueue）
  priority: TaskPriority;
}

/**
 * 执行日志
 */
export interface CronLog {
  /** 日志唯一标识 */
  id: string;
  /** 关联的 Job ID */
  jobId: string;
  /** 关联的 Task 实例 ID */
  taskId: string;
  /** 执行时间 */
  executedAt: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 是否为补偿执行 */
  isRecovery: boolean;
  /** 执行耗时（毫秒） */
  duration?: number;
  /** 执行结果摘要 */
  output?: unknown;
}

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  /** 检查间隔（毫秒，默认 60000 = 1分钟） */
  checkInterval: number;
  /** 错过任务默认处理策略 */
  missedRunStrategy: MissedTaskStrategy;
  /** 最大补偿执行次数（防止 run-all 策略下执行过多） */
  maxMissedRuns: number;
  /** 恢复检查回溯窗口（毫秒，默认 7天） */
  recoveryLookbackWindow: number;
}

/**
 * 调度器状态文件（持久化到 AgentFS）
 */
export interface SchedulerState {
  /** 上次启动时间 */
  lastStartup?: number;
  /** 上次关闭时间 */
  lastShutdown?: number;
  /** 数据版本 */
  version: string;
}

/**
 * Job 查询过滤器
 */
export interface JobFilter {
  /** 按状态筛选 */
  status?: CronJobStatus;
  /** 按任务类型筛选 */
  taskType?: string;
  /** 是否只显示启用 */
  enabled?: boolean;
  /** 限制数量 */
  limit?: number;
}

/**
 * 日志查询选项
 */
export interface LogQueryOptions {
  /** 限制数量 */
  limit?: number;
  /** 起始时间 */
  from?: number;
  /** 结束时间 */
  to?: number;
  /** 是否只显示成功 */
  successOnly?: boolean;
}

/**
 * 日志统计
 */
export interface LogStats {
  /** 总执行次数 */
  totalRuns: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 成功率 */
  successRate: number;
  /** 平均执行时间 */
  avgDuration?: number;
}

/**
 * 新建定时任务的输入（不含系统生成字段）
 */
export type NewCronJob = Omit<
  CronJob,
  'id' | 'createdAt' | 'runCount' | 'lastRunAt' | 'nextRunAt' | 'consecutiveErrors' | 'status'
> & {
  status?: CronJobStatus;
};

/**
 * 解析后的 Cron 表达式
 */
export interface ParsedCron {
  /** 分钟 (0-59) */
  minute: (number | { start: number; end: number; step: number })[];
  /** 小时 (0-23) */
  hour: (number | { start: number; end: number; step: number })[];
  /** 日期 (1-31) */
  dayOfMonth: (number | { start: number; end: number; step: number })[];
  /** 月份 (1-12) */
  month: (number | { start: number; end: number; step: number })[];
  /** 星期 (0-6, 0=周日) */
  dayOfWeek: (number | { start: number; end: number; step: number })[];
  /** 原始表达式 */
  raw: string;
  /** 是否为预设别名 */
  isPreset: boolean;
}

/**
 * 调度器统计信息
 */
export interface SchedulerStats {
  /** 总任务数 */
  totalJobs: number;
  /** 活跃任务数 */
  activeJobs: number;
  /** 已暂停任务数 */
  pausedJobs: number;
  /** 已完成任务数 */
  completedJobs: number;
  /** 错误状态任务数 */
  errorJobs: number;
  /** 下次执行时间最近的任务 */
  nextScheduledJob?: {
    job: CronJob;
    nextRun: Date;
  };
}
