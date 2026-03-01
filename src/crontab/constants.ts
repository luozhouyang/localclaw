import type { CronPreset, SchedulerConfig } from './types';

/**
 * 调度器默认配置
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  /** 每分钟检查一次 */
  checkInterval: 60_000,
  /** 默认错过任务策略：执行一次代表所有错过的 */
  missedRunStrategy: 'run-once',
  /** 最大补偿执行次数 */
  maxMissedRuns: 10,
  /** 回溯窗口：7天 */
  recoveryLookbackWindow: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Cron 预设表达式映射
 * 格式: 分 时 日 月 周
 * 使用标准 cron-parser 支持的格式
 */
export const CRON_PRESETS: Record<CronPreset, string> = {
  /** 每年1月1日 00:00 */
  '@yearly': '0 0 1 1 *',
  /** 每月1日 00:00 */
  '@monthly': '0 0 1 * *',
  /** 每周日 00:00 */
  '@weekly': '0 0 * * 0',
  /** 每天 00:00 */
  '@daily': '0 0 * * *',
  /** 每小时 00分 */
  '@hourly': '0 * * * *',
  /** 每5分钟 */
  '@every5min': '*/5 * * * *',
  /** 每10分钟 */
  '@every10min': '*/10 * * * *',
  /** 每30分钟 */
  '@every30min': '*/30 * * * *',
};

/**
 * 预设表达式的人类可读描述
 */
export const CRON_PRESET_DESCRIPTIONS: Record<CronPreset, string> = {
  '@yearly': '每年',
  '@monthly': '每月',
  '@weekly': '每周',
  '@daily': '每天',
  '@hourly': '每小时',
  '@every5min': '每5分钟',
  '@every10min': '每10分钟',
  '@every30min': '每30分钟',
};

/**
 * AgentFS 存储路径
 */
export const STORAGE_PATHS = {
  /** Job 存储目录 */
  JOBS_DIR: '/crontab/jobs',
  /** 日志存储目录 */
  LOGS_DIR: '/crontab/logs',
  /** 调度器状态文件 */
  STATE_FILE: '/crontab/.state',
  /** 关闭时间戳文件 */
  SHUTDOWN_FILE: '/crontab/.shutdown',
  /** 启动时间戳文件 */
  STARTUP_FILE: '/crontab/.startup',
} as const;

/**
 * 调度器状态版本（用于数据迁移）
 */
export const SCHEDULER_STATE_VERSION = '1.0';

/**
 * 默认任务配置
 */
export const DEFAULT_JOB_CONFIG = {
  /** 默认状态：活跃 */
  status: 'active' as const,
  /** 默认启用 */
  enabled: true,
  /** 默认时区：本地时间 */
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  /** 默认错过策略 */
  missedRunStrategy: 'run-once' as const,
  /** 默认最大连续错误次数 */
  maxConsecutiveErrors: 3,
  /** 默认任务优先级 */
  priority: 'normal' as const,
};

/**
 * Cron 表达式字段范围
 */
export const CRON_RANGES = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 6 },
} as const;

/**
 * Cron 字段名称映射
 */
export const CRON_FIELD_NAMES = {
  minute: '分钟',
  hour: '小时',
  dayOfMonth: '日期',
  month: '月份',
  dayOfWeek: '星期',
} as const;

/**
 * 星期名称映射
 */
export const DAY_OF_WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 月份名称映射
 */
export const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];
