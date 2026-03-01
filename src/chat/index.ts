export { threadManager } from './thread-manager';
export type { Thread, Channel, ThreadMessage } from './types';
export { CHAT_PATHS } from './types';

// Memory types re-exported from new location for backward compatibility
export type { ThreadSummary, ThreadFacts, ThreadFact } from '@/memory/types';
