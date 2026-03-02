import i18n from '@/i18n';

/**
 * Format date with i18n support
 * Uses the current i18n language for localization
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const locale = getCurrentLocale();

  // Check if today
  const isToday = date.toDateString() === now.toDateString();

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  if (isYesterday) {
    return i18n.t('dateTime.yesterday', 'Yesterday');
  }

  // Check if this year
  const isThisYear = date.getFullYear() === now.getFullYear();

  if (isThisYear) {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  // Different year
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format date with time (full format)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date and time string
 */
export function formatDateTimeFull(timestamp: number): string {
  const date = new Date(timestamp);
  const locale = getCurrentLocale();

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format relative time (e.g., "2 minutes ago", "just now")
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return i18n.t('dateTime.justNow', 'Just now');
  }

  if (minutes < 60) {
    return i18n.t('dateTime.minutesAgo', '{{count}} min ago', { count: minutes });
  }

  if (hours < 24) {
    return i18n.t('dateTime.hoursAgo', '{{count}} hr ago', { count: hours });
  }

  if (days < 7) {
    return i18n.t('dateTime.daysAgo', '{{count}} days ago', { count: days });
  }

  return formatDateTime(timestamp);
}

/**
 * Get current locale from i18n
 * Maps i18n language codes to BCP 47 locale tags
 */
function getCurrentLocale(): string {
  const lang = i18n.language;

  // Map language codes to locales
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zh': 'zh-CN',
  };

  return localeMap[lang] || lang || 'en-US';
}
