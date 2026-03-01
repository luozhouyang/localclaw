import CronExpressionParser, { type CronExpression, type CronExpressionOptions } from 'cron-parser';
import { CRON_PRESETS, CRON_PRESET_DESCRIPTIONS } from './constants';
import type { CronPreset, ParsedCron } from './types';

// Type alias for backward compatibility
type ParserOptions = CronExpressionOptions;

/**
 * Cron 解析错误
 */
export class CronParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CronParseError';
  }
}

/**
 * Cron 表达式解析器封装
 * 基于 cron-parser 库，添加预设别名支持
 */
export class CronParser {
  /**
   * 将预设别名转换为标准 Cron 表达式
   */
  static normalize(expression: string): string {
    const trimmed = expression.trim();
    return CRON_PRESETS[trimmed as CronPreset] ?? trimmed;
  }

  /**
   * 检查是否为预设别名
   */
  static isPreset(expression: string): boolean {
    return expression.trim() in CRON_PRESETS;
  }

  /**
   * 获取预设列表
   */
  static getPresets(): { value: CronPreset; label: string; expression: string }[] {
    return (Object.keys(CRON_PRESETS) as CronPreset[]).map((preset) => ({
      value: preset,
      label: CRON_PRESET_DESCRIPTIONS[preset],
      expression: CRON_PRESETS[preset],
    }));
  }

  /**
   * 解析表达式为 cron-parser 的 CronExpression 对象
   * @param expression - Cron 表达式或预设别名
   * @param options - 解析选项
   */
  static parse(expression: string, options?: ParserOptions): CronExpression {
    const normalizedExpr = this.normalize(expression);

    try {
      return CronExpressionParser.parse(normalizedExpr, {
        ...options,
      });
    } catch (error) {
      throw new CronParseError(
        error instanceof Error ? error.message : '无效的 Cron 表达式'
      );
    }
  }

  /**
   * 获取下次执行时间戳
   * @param expression - Cron 表达式
   * @param from - 起始时间（默认当前时间）
   * @returns 下次执行的时间戳
   */
  static getNextRunTime(expression: string, from: Date = new Date()): number {
    const interval = this.parse(expression, {
      currentDate: from,
    });
    return interval.next().getTime();
  }

  /**
   * 获取接下来 N 次执行时间
   * @param expression - Cron 表达式
   * @param count - 次数
   * @param from - 起始时间
   */
  static getNextRunTimes(
    expression: string,
    count: number,
    from: Date = new Date()
  ): number[] {
    const interval = this.parse(expression, {
      currentDate: from,
    });

    const times: number[] = [];
    for (let i = 0; i < count; i++) {
      times.push(interval.next().getTime());
    }
    return times;
  }

  /**
   * 计算从 from 到 to 之间应该执行的次数
   * @param expression - Cron 表达式
   * @param from - 起始时间戳
   * @param to - 结束时间戳
   * @returns 应该执行的次数
   */
  static getRunCount(expression: string, from: number, to: number): number {
    const interval = this.parse(expression, {
      currentDate: new Date(from),
      endDate: new Date(to),
    });

    let count = 0;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _ of interval) {
        count++;
        // 安全限制：最多计算 10000 次
        if (count > 10000) break;
      }
    } catch {
      // 到达 endDate 会抛出异常，这是正常行为
    }

    return count;
  }

  /**
   * 获取错过的执行时间点
   * @param expression - Cron 表达式
   * @param from - 起始时间戳（上次执行时间）
   * @param to - 结束时间戳（当前时间）
   * @param limit - 最大返回数量
   */
  static getMissedRuns(
    expression: string,
    from: number,
    to: number,
    limit = 100
  ): number[] {
    const interval = this.parse(expression, {
      currentDate: new Date(from),
      endDate: new Date(to),
    });

    const runs: number[] = [];
    try {
      for (const date of interval) {
        runs.push(date.getTime());
        if (runs.length >= limit) break;
      }
    } catch {
      // 正常结束
    }

    return runs;
  }

  /**
   * 验证表达式是否有效
   */
  static validate(expression: string): { valid: boolean; error?: string } {
    try {
      this.parse(expression);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '无效的 Cron 表达式',
      };
    }
  }

  /**
   * 获取人类可读的描述
   * 基于解析后的表达式生成描述
   */
  static getDescription(expression: string): string {
    // 预设别名直接返回描述
    const trimmed = expression.trim();
    if (this.isPreset(trimmed)) {
      const desc = CRON_PRESET_DESCRIPTIONS[trimmed as CronPreset];
      return desc ? `${desc}执行` : trimmed;
    }

    // 尝试解析并生成描述
    try {
      const normalized = this.normalize(trimmed);
      const parts = normalized.split(/\s+/);

      if (parts.length !== 5) {
        return '无效的 Cron 表达式';
      }

      return this.generateDescription(parts);
    } catch {
      return '无效的 Cron 表达式';
    }
  }

  /**
   * 生成描述文本
   */
  private static generateDescription(parts: string[]): string {
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // 简化的描述生成逻辑
    const descriptions: string[] = [];

    // 检查是否为每分钟
    if (minute === '*' && hour === '*') {
      return '每分钟执行';
    }

    // 检查每小时
    if (minute !== '*' && hour === '*') {
      descriptions.push(`每小时 ${minute} 分`);
    }
    // 具体时间
    else if (minute !== '*' && hour !== '*') {
      descriptions.push(`每天 ${hour}:${minute.padStart(2, '0')}`);
    }

    // 特定日期
    if (dayOfMonth !== '*') {
      descriptions.push(`${dayOfMonth}日`);
    }

    // 特定月份
    if (month !== '*') {
      const monthNum = parseInt(month, 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        const monthNames = [
          '一月', '二月', '三月', '四月', '五月', '六月',
          '七月', '八月', '九月', '十月', '十一月', '十二月'
        ];
        descriptions.push(monthNames[monthNum - 1]);
      }
    }

    // 特定星期
    if (dayOfWeek !== '*') {
      const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const weekNum = parseInt(dayOfWeek, 10);
      if (!isNaN(weekNum) && weekNum >= 0 && weekNum <= 6) {
        descriptions.push(weekNames[weekNum]);
      }
    }

    // 步长格式处理
    if (minute.startsWith('*/')) {
      const step = minute.slice(2);
      return `每 ${step} 分钟执行`;
    }

    if (hour.startsWith('*/')) {
      const step = hour.slice(2);
      return `每 ${step} 小时执行`;
    }

    return descriptions.length > 0 ? descriptions.join(' ') + ' 执行' : '定时执行';
  }

  /**
   * 解析为内部使用的 ParsedCron 结构
   * 用于需要直接访问表达式字段的场景
   */
  static parseToObject(expression: string): ParsedCron {
    const normalized = this.normalize(expression);
    const parts = normalized.split(/\s+/);

    if (parts.length !== 5) {
      throw new CronParseError('Cron 表达式必须包含5个字段');
    }

    return {
      minute: this.parseField(parts[0]),
      hour: this.parseField(parts[1]),
      dayOfMonth: this.parseField(parts[2]),
      month: this.parseField(parts[3]),
      dayOfWeek: this.parseField(parts[4]),
      raw: expression,
      isPreset: this.isPreset(expression),
    };
  }

  /**
   * 简单解析单个字段（用于 ParsedCron）
   */
  private static parseField(field: string): (number | { start: number; end: number; step: number })[] {
    const values: (number | { start: number; end: number; step: number })[] = [];

    // 步长
    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2), 10);
      if (!isNaN(step) && step > 0) {
        values.push({ start: 0, end: 59, step });
      }
    }
    // 通配符
    else if (field === '*') {
      values.push({ start: 0, end: 59, step: 1 });
    }
    // 具体值
    else {
      const num = parseInt(field, 10);
      if (!isNaN(num)) {
        values.push(num);
      }
    }

    return values;
  }
}

// ============================================
// 便捷导出函数
// ============================================

/**
 * 便捷解析函数
 */
export function parseCron(expression: string, options?: ParserOptions): CronExpression {
  return CronParser.parse(expression, options);
}

/**
 * 便捷获取下次执行时间
 */
export function getNextRunTime(expression: string, from?: Date): number {
  return CronParser.getNextRunTime(expression, from);
}

/**
 * 便捷验证函数
 */
export function validateCron(expression: string): { valid: boolean; error?: string } {
  return CronParser.validate(expression);
}

/**
 * 便捷获取描述
 */
export function getCronDescription(expression: string): string {
  return CronParser.getDescription(expression);
}

/**
 * 获取错过的执行时间列表
 */
export function getMissedRuns(
  expression: string,
  from: number,
  to: number,
  limit?: number
): number[] {
  return CronParser.getMissedRuns(expression, from, to, limit);
}

// 重新导出类型
export type { CronExpression, CronExpressionOptions as ParserOptions };
