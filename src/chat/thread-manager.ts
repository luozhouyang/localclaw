import { getSystemStorage } from '@/config/agent-fs';
import type { UIMessage } from 'ai';
import type { Thread, Channel } from './types';
import { CHAT_PATHS } from './types';

class ThreadManager {
  private async getFS() {
    return getSystemStorage();
  }

  // Initialize chat storage structure
  async initialize(): Promise<void> {
    const fs = await this.getFS();

    // Ensure base directories exist
    try {
      await fs.fs.mkdir('/chat');
    } catch { /* already exists */ }

    try {
      await fs.fs.mkdir('/chat/threads');
    } catch { /* already exists */ }

    // Initialize thread index if not exists
    try {
      await fs.fs.readFile(CHAT_PATHS.THREAD_INDEX, 'utf-8');
    } catch {
      await fs.fs.writeFile(CHAT_PATHS.THREAD_INDEX, JSON.stringify([]));
    }
  }

  // Create a new thread
  async createThread(channel: Channel = 'local', title?: string): Promise<Thread> {
    const fs = await this.getFS();

    const thread: Thread = {
      id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: title || 'New Chat',
      channel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };

    // Create thread directory
    await fs.fs.mkdir(CHAT_PATHS.threadDir(thread.id));

    // Initialize empty messages file
    await fs.fs.writeFile(CHAT_PATHS.threadMessages(thread.id), '');

    // Save metadata
    await fs.fs.writeFile(
      CHAT_PATHS.threadMetadata(thread.id),
      JSON.stringify(thread)
    );

    // Update index
    const threads = await this.listThreads();
    threads.unshift(thread);
    await fs.fs.writeFile(CHAT_PATHS.THREAD_INDEX, JSON.stringify(threads));

    return thread;
  }

  // List all threads (optionally filtered by channel)
  async listThreads(channel?: Channel): Promise<Thread[]> {
    const fs = await this.getFS();

    try {
      const content = await fs.fs.readFile(CHAT_PATHS.THREAD_INDEX, 'utf-8');
      const threads: Thread[] = JSON.parse(content || '[]');

      if (channel) {
        return threads.filter(t => t.channel === channel);
      }
      return threads;
    } catch {
      return [];
    }
  }

  // Get a single thread by ID
  async getThread(threadId: string): Promise<Thread | null> {
    try {
      const fs = await this.getFS();
      const content = await fs.fs.readFile(
        CHAT_PATHS.threadMetadata(threadId),
        'utf-8'
      );
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  // Update thread metadata
  async updateThread(
    threadId: string,
    updates: Partial<Omit<Thread, 'id' | 'createdAt'>>
  ): Promise<void> {
    const fs = await this.getFS();

    const thread = await this.getThread(threadId);
    if (!thread) throw new Error(`Thread ${threadId} not found`);

    const updated = { ...thread, ...updates, updatedAt: Date.now() };

    await fs.fs.writeFile(
      CHAT_PATHS.threadMetadata(threadId),
      JSON.stringify(updated)
    );

    // Update index
    const threads = await this.listThreads();
    const index = threads.findIndex(t => t.id === threadId);
    if (index !== -1) {
      threads[index] = updated;
      await fs.fs.writeFile(CHAT_PATHS.THREAD_INDEX, JSON.stringify(threads));
    }
  }

  // Delete a thread
  async deleteThread(threadId: string): Promise<void> {
    const fs = await this.getFS();

    // Remove from index
    const threads = await this.listThreads();
    const filtered = threads.filter(t => t.id !== threadId);
    await fs.fs.writeFile(CHAT_PATHS.THREAD_INDEX, JSON.stringify(filtered));

    // Note: Directory deletion not supported in basic AgentFS
    // Mark as deleted in metadata
    try {
      const metadata = await this.getThread(threadId);
      if (metadata) {
        await fs.fs.writeFile(
          CHAT_PATHS.threadMetadata(threadId),
          JSON.stringify({ ...metadata, deleted: true, updatedAt: Date.now() })
        );
      }
    } catch { /* ignore */ }
  }

  // Load messages for a thread
  async loadMessages(threadId: string): Promise<UIMessage[]> {
    const fs = await this.getFS();

    try {
      const content = await fs.fs.readFile(
        CHAT_PATHS.threadMessages(threadId),
        'utf-8'
      );

      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  // Append a message to a thread
  async appendMessage(threadId: string, message: UIMessage): Promise<void> {
    const fs = await this.getFS();

    const line = JSON.stringify(message) + '\n';
    const path = CHAT_PATHS.threadMessages(threadId);

    // Read existing content
    let existing = '';
    try {
      existing = await fs.fs.readFile(path, 'utf-8');
    } catch { /* file doesn't exist */ }

    // Append new message
    await fs.fs.writeFile(path, existing + line);

    // Update thread metadata
    const thread = await this.getThread(threadId);
    if (thread) {
      const textPart = message.parts.find(p => p.type === 'text');
      const preview = textPart && 'text' in textPart
        ? textPart.text.slice(0, 50) + (textPart.text.length > 50 ? '...' : '')
        : '[Tool call]';

      await this.updateThread(threadId, {
        messageCount: thread.messageCount + 1,
        lastMessagePreview: preview,
      });
    }
  }

  // Generate auto title from first user message
  async generateTitle(threadId: string): Promise<string> {
    const messages = await this.loadMessages(threadId);
    const firstUserMsg = messages.find(m => m.role === 'user');

    if (!firstUserMsg) return 'New Chat';

    const textPart = firstUserMsg.parts.find(p => p.type === 'text');
    if (!textPart || !('text' in textPart)) return 'New Chat';

    const text = textPart.text;
    return text.length > 30 ? text.slice(0, 30) + '...' : text;
  }
}

// Singleton instance
export const threadManager = new ThreadManager();
