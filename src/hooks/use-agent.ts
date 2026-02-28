import { useCallback, useRef, useState } from 'react';
import type { UIMessage, TextUIPart, DynamicToolUIPart } from 'ai';
import { agentLoop } from '@/agent/loop';
import { generateId } from '@/lib/chat-utils';

interface UseAgentOptions {
  provider: {
    baseURL: string;
    apiKey: string;
    model: string;
  } | null;
}

interface UseAgentReturn {
  messages: UIMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  stop: () => void;
  clear: () => void;
}

export function useAgent(options: UseAgentOptions): UseAgentReturn {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track current assistant message for streaming updates
  const currentAssistantMsgRef = useRef<UIMessage | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!options.provider) {
      setError(new Error('No provider configured'));
      return;
    }

    setIsLoading(true);
    setError(null);
    currentAssistantMsgRef.current = null;

    // Create abort controller for this run
    abortRef.current = new AbortController();

    // Build message history from previous messages for the LLM
    const simpleMessages: Array<
      | { role: 'user'; content: string }
      | { role: 'assistant'; content: string }
    > = [];

    // Add previous messages for context (only text content)
    for (const msg of messages) {
      if (msg.role === 'user') {
        const textPart = msg.parts.find((p): p is TextUIPart => p.type === 'text');
        if (textPart) {
          simpleMessages.push({ role: 'user', content: textPart.text });
        }
      } else if (msg.role === 'assistant') {
        const textParts = msg.parts
          .filter((p): p is TextUIPart => p.type === 'text')
          .map(p => p.text)
          .join('');
        if (textParts) {
          simpleMessages.push({ role: 'assistant', content: textParts });
        }
      }
    }

    // Add current user message
    simpleMessages.push({ role: 'user', content });

    // Add user message to UI immediately
    const userMessage: UIMessage = {
      id: generateId(),
      role: 'user',
      parts: [{ type: 'text', text: content }],
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Run agent loop
      for await (const event of agentLoop({
        provider: options.provider,
        messages: simpleMessages,
      })) {
        if (abortRef.current?.signal.aborted) {
          break;
        }

        // Convert AgentEvent to UIMessage updates
        setMessages(prev => {
          const newMessages = [...prev];

          switch (event.type) {
            case 'assistant_message': {
              // Create or update assistant message
              if (!currentAssistantMsgRef.current) {
                const assistantMsg: UIMessage = {
                  id: generateId(),
                  role: 'assistant',
                  parts: [{ type: 'text', text: event.content }],
                };
                currentAssistantMsgRef.current = assistantMsg;
                newMessages.push(assistantMsg);
              } else {
                // Append to existing assistant message
                const existingMsg = currentAssistantMsgRef.current;
                const textParts = existingMsg.parts.filter((p): p is TextUIPart => p.type === 'text');
                const otherParts = existingMsg.parts.filter(p => p.type !== 'text');

                const updatedText = textParts.length > 0
                  ? textParts.map(p => p.text).join('') + event.content
                  : event.content;

                currentAssistantMsgRef.current = {
                  ...existingMsg,
                  parts: [...otherParts, { type: 'text', text: updatedText }],
                };
                newMessages[newMessages.length - 1] = currentAssistantMsgRef.current;
              }
              break;
            }

            case 'tool_call': {
              // Add tool invocation part to current assistant message
              if (currentAssistantMsgRef.current) {
                const existingMsg = currentAssistantMsgRef.current;
                const toolPart: DynamicToolUIPart = {
                  type: 'dynamic-tool',
                  toolName: event.name,
                  toolCallId: event.callId,
                  state: 'input-available',
                  input: event.args as Record<string, unknown>,
                };

                currentAssistantMsgRef.current = {
                  ...existingMsg,
                  parts: [...existingMsg.parts, toolPart],
                };
                newMessages[newMessages.length - 1] = currentAssistantMsgRef.current;
              }
              break;
            }

            case 'tool_result': {
              // Update tool invocation with result
              if (currentAssistantMsgRef.current) {
                const existingMsg = currentAssistantMsgRef.current;
                const updatedParts = existingMsg.parts.map(part => {
                  if (part.type === 'dynamic-tool' &&
                    part.toolCallId === event.callId) {
                    return {
                      type: 'dynamic-tool' as const,
                      toolName: event.name,
                      toolCallId: event.callId,
                      state: 'output-available' as const,
                      input: part.input,
                      output: event.result,
                    } satisfies DynamicToolUIPart;
                  }
                  return part;
                });

                currentAssistantMsgRef.current = {
                  ...existingMsg,
                  parts: updatedParts,
                };
                newMessages[newMessages.length - 1] = currentAssistantMsgRef.current;
              }
              break;
            }

            case 'error':
              // Error is handled separately via setError
              break;

            case 'done':
              // Message complete
              currentAssistantMsgRef.current = null;
              break;
          }

          return newMessages;
        });

        if (event.type === 'done' || event.type === 'error') {
          break;
        }
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      currentAssistantMsgRef.current = null;
    }
  }, [options.provider, messages]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    currentAssistantMsgRef.current = null;
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    stop,
    clear,
  };
}
