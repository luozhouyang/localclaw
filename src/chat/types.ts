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

// Thread Summary
export interface ThreadSummary {
  version: 1;
  generatedAt: number;
  messageRange: {
    start: number;
    end: number;
  };
  content: string;
  tokenCount: number;
}

// Fact types
export type FactType = 'file' | 'command' | 'decision' | 'preference' | 'error' | 'todo';

export interface ThreadFact {
  id: string;
  type: FactType;
  content: string;
  messageId: string;
  timestamp: number;
  confidence: number;
  verified: boolean;
}

export interface ThreadFacts {
  version: 1;
  updatedAt: number;
  facts: ThreadFact[];
}

// Storage paths
export const CHAT_PATHS = {
  THREAD_INDEX: '/chat/threads.json',
  threadDir: (threadId: string) => `/chat/threads/${threadId}`,
  threadMetadata: (threadId: string) => `/chat/threads/${threadId}/metadata.json`,
  threadMessages: (threadId: string) => `/chat/threads/${threadId}/messages.jsonl`,
};

// Memory paths
export const MEMORY_PATHS = {
  summary: (threadId: string) => `/chat/threads/${threadId}/summary.json`,
  facts: (threadId: string) => `/chat/threads/${threadId}/facts.json`,
};
