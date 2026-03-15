import { useCallback, useState, useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { generateId } from '@/lib/chat-utils';
import { agentLoop } from '@/agent/loop';
import type { Thread } from '@/chat/types';
import { getThreadManager, getTaskScheduler, getTaskStore, getMemoryManager } from '@/lib/imports';

interface LLMProvider {
  baseURL: string;
  apiKey: string;
  model: string;
}

interface UsePersistentAgentOptions {
  threadId: string | null;
  provider: LLMProvider | null;
}

interface UsePersistentAgentReturn {
  messages: UIMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string, overrideThreadId?: string) => Promise<void>;
  stop: () => void;
  clear: () => Promise<void>;
  currentThread: Thread | null;
  createNewThread: () => Promise<string>;
  switchThread: (id: string) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
  updateThreadTitle: (id: string, title: string) => Promise<void>;
}

export function usePersistentAgent(
  options: UsePersistentAgentOptions
): UsePersistentAgentReturn {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const managerRef = useRef<Awaited<ReturnType<typeof getThreadManager>> | null>(null);

  // Initialize thread manager
  useEffect(() => {
    getThreadManager().then(mgr => {
      managerRef.current = mgr;
    });
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    if (!options.threadId || !managerRef.current) {
      setMessages([]);
      setCurrentThread(null);
      return;
    }

    const load = async () => {
      try {
        const [thread, msgs] = await Promise.all([
          managerRef.current.getThread(options.threadId!),
          managerRef.current.loadMessages(options.threadId!),
        ]);
        setCurrentThread(thread);
        setMessages(msgs);
      } catch (err) {
        setError(err as Error);
      }
    };

    load();
  }, [options.threadId]);

  const sendMessage = useCallback(
    async (content: string, overrideThreadId?: string) => {
      const threadId = overrideThreadId || options.threadId;
      if (!threadId || !options.provider) {
        setError(new Error('No thread or provider configured'));
        return;
      }

      setIsLoading(true);
      setError(null);
      abortRef.current = new AbortController();

      // Create user message
      const userMessage: UIMessage = {
        id: generateId(),
        role: 'user',
        parts: [{ type: 'text', text: content }],
      };

      // Save and display user message
      if (!managerRef.current) return;
      await managerRef.current.appendMessage(threadId, userMessage);
      setMessages((prev) => [...prev, userMessage]);

      // Build message history for LLM
      const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (const msg of [...messages, userMessage]) {
        const textParts = msg.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('');

        if (textParts) {
          historyMessages.push({
            role: msg.role as 'user' | 'assistant',
            content: textParts,
          });
        }
      }

      try {
        // Run agent loop
        let assistantMessage: UIMessage | null = null;

        for await (const event of agentLoop({
          provider: options.provider,
          messages: historyMessages,
        })) {
          if (abortRef.current?.signal.aborted) {
            break;
          }

          switch (event.type) {
            case 'assistant_message': {
              if (!assistantMessage) {
                assistantMessage = {
                  id: generateId(),
                  role: 'assistant',
                  parts: [{ type: 'text', text: event.content }],
                };
              } else {
                // Append to existing text
                const textPart = assistantMessage.parts.find(
                  (p): p is { type: 'text'; text: string } => p.type === 'text'
                );
                if (textPart) {
                  textPart.text += event.content;
                }
              }

              setMessages((prev) => {
                const filtered = prev.filter((m) => m.id !== assistantMessage?.id);
                return [...filtered, { ...assistantMessage! }];
              });
              break;
            }

            case 'tool_call': {
              if (!assistantMessage) {
                assistantMessage = {
                  id: generateId(),
                  role: 'assistant',
                  parts: [],
                };
              }

              assistantMessage.parts.push({
                type: 'dynamic-tool',
                toolName: event.name,
                toolCallId: event.callId,
                state: 'input-available',
                input: event.args as Record<string, unknown>,
              });

              setMessages((prev) => {
                const filtered = prev.filter((m) => m.id !== assistantMessage?.id);
                return [...filtered, { ...assistantMessage! }];
              });
              break;
            }

            case 'tool_result': {
              if (assistantMessage) {
                const toolIndex = assistantMessage.parts.findIndex(
                  (p) => p.type === 'dynamic-tool' && 'toolCallId' in p && p.toolCallId === event.callId
                );

                if (toolIndex !== -1) {
                  const toolPart = assistantMessage.parts[toolIndex];
                  assistantMessage.parts[toolIndex] = {
                    ...toolPart,
                    state: 'output-available',
                    output: event.result,
                  } as typeof toolPart;

                  setMessages((prev) => {
                    const filtered = prev.filter((m) => m.id !== assistantMessage?.id);
                    return [...filtered, { ...assistantMessage! }];
                  });
                }
              }
              break;
            }

            case 'error': {
              setError(event.error);
              break;
            }

            case 'done': {
              // Save completed assistant message
              if (assistantMessage && managerRef.current) {
                await managerRef.current.appendMessage(threadId, assistantMessage);

                // Check if we should trigger summary generation (every 20 messages)
                const messageCount = await managerRef.current.getMessageCount(threadId);
                if (messageCount % 20 === 0) {
                  const taskScheduler = await getTaskScheduler();
                  const taskStore = await getTaskStore();
                  const existingTasks = await taskStore.findTasks({
                    type: 'generate_summary',
                    status: 'pending',
                  });
                  const alreadyPending = existingTasks.some(
                    (t) => (t.input as { threadId?: string })?.threadId === threadId
                  );
                  if (!alreadyPending) {
                    await taskScheduler.schedule(
                      'generate_summary',
                      { threadId: options.threadId },
                      { priority: 'low', autoStart: true }
                    );
                  }
                }

                // Extract facts from assistant message
                const textContent = assistantMessage.parts
                  .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                  .map((p) => p.text)
                  .join(' ');
                if (textContent.length > 50) {
                  const memoryManager = await getMemoryManager();
                  const facts = memoryManager.extractFactsFromMessage(
                    assistantMessage.id,
                    textContent,
                    Date.now()
                  );
                  for (const fact of facts) {
                    await memoryManager.addFact(threadId, fact);
                  }
                }
              }
              break;
            }
          }
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [options.threadId, options.provider, messages]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(async () => {
    if (!options.threadId || !managerRef.current) return;
    // Clear messages but keep thread
    const fs = await (await import('@/infra/fs')).getFilesystem();
    await fs.writeFile(
      `/chat/threads/${options.threadId}/messages.jsonl`,
      ''
    );
    setMessages([]);
    await managerRef.current.updateThread(options.threadId, {
      messageCount: 0,
      lastMessagePreview: undefined,
    });
  }, [options.threadId]);

  const createNewThread = useCallback(async (): Promise<string> => {
    if (!managerRef.current) throw new Error('Thread manager not initialized');
    const thread = await managerRef.current.createThread('local');
    return thread.id;
  }, []);

  const switchThread = useCallback(async (_id: string): Promise<void> => {
    // This will trigger the useEffect to load new messages
    // Actual switching is done by parent component updating options.threadId
  }, []);

  const deleteThread = useCallback(
    async (id: string): Promise<void> => {
      if (managerRef.current) {
        await managerRef.current.deleteThread(id);
      }
      if (id === options.threadId) {
        setMessages([]);
        setCurrentThread(null);
      }
    },
    [options.threadId]
  );

  const updateThreadTitle = useCallback(
    async (id: string, title: string): Promise<void> => {
      if (managerRef.current) {
        await managerRef.current.updateThread(id, { title });
      }
      if (id === options.threadId && currentThread) {
        setCurrentThread({ ...currentThread, title });
      }
    },
    [options.threadId, currentThread]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    stop,
    clear,
    currentThread,
    createNewThread,
    switchThread,
    deleteThread,
    updateThreadTitle,
  };
}
