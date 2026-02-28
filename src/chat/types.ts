import type { UIMessage } from 'ai';

export type Channel = 'local' | 'telegram' | 'whatsapp' | 'wechat';

export interface Thread {
  id: string;
  title: string;
  channel: Channel;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessagePreview?: string;

  // Future multi-channel support
  metadata?: {
    source?: 'web' | 'telegram' | 'whatsapp' | 'wechat';
    externalUserId?: string;
    deleted?: boolean;
  };
}

// Stored message = UIMessage + thread reference
export interface ThreadMessage {
  threadId: string;
  message: UIMessage;
  timestamp: number;
  order: number;
}

// Storage paths
export const CHAT_PATHS = {
  THREAD_INDEX: '/chat/threads.json',
  threadDir: (threadId: string) => `/chat/threads/${threadId}`,
  threadMetadata: (threadId: string) => `/chat/threads/${threadId}/metadata.json`,
  threadMessages: (threadId: string) => `/chat/threads/${threadId}/messages.jsonl`,
};
