import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { coreTools } from '@/tools';

export type AgentEvent =
  | { type: 'user_message'; content: string }
  | { type: 'assistant_message'; content: string }
  | { type: 'tool_call'; name: string; args: unknown; callId: string }
  | { type: 'tool_result'; name: string; result: unknown; callId: string }
  | { type: 'error'; error: Error }
  | { type: 'done' };

interface AgentLoopOptions {
  provider: {
    baseURL: string;
    apiKey: string;
    model: string;
  };
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// Pi-style agent loop using async generator
export async function* agentLoop(
  options: AgentLoopOptions
): AsyncGenerator<AgentEvent> {
  const { provider, messages } = options;

  console.log('[agentLoop] Starting with provider:', provider.baseURL, 'model:', provider.model, 'apiKey:', provider.apiKey ? '***' : 'EMPTY');
  console.log('[agentLoop] Messages:', messages);

  // Create AI SDK provider
  const openai = createOpenAI({
    baseURL: provider.baseURL,
    apiKey: provider.apiKey,
  });

  const workingMessages = [...messages];

  while (true) {
    try {
      console.log('[agentLoop] Calling streamText...');

      // Stream text with tools
      const result = streamText({
        model: openai.chat(provider.model),
        messages: workingMessages,
        tools: coreTools,
      });

      console.log('[agentLoop] streamText returned, waiting for response...');

      // Wait for complete response - all properties are PromiseLike
      const [text, toolCalls] = await Promise.all([
        result.text,
        result.toolCalls,
      ]);

      console.log('[agentLoop] Got response, text:', text?.slice(0, 100), 'toolCalls:', toolCalls);

      // text and toolCalls are already resolved values from Promise.all
      if (text) {
        yield { type: 'assistant_message', content: text };
        workingMessages.push({ role: 'assistant', content: text });
      }

      // Handle tool calls
      const calls = toolCalls;
      if (calls && calls.length > 0) {
        for (const call of calls) {
          // Handle both static and dynamic tool calls
          const toolName = 'toolName' in call ? call.toolName : 'unknown';
          const toolCallId = 'toolCallId' in call ? call.toolCallId : `call-${Date.now()}`;
          const args = 'args' in call ? call.args : 'input' in call ? (call as { input: unknown }).input : {};

          yield {
            type: 'tool_call',
            name: toolName,
            args,
            callId: toolCallId,
          };

          // Execute the tool
          const tool = coreTools[toolName as keyof typeof coreTools];
          if (!tool || !tool.execute) {
            throw new Error(`Unknown tool or missing execute: ${toolName}`);
          }

          const toolResult = await tool.execute(args as never, {
            toolCallId,
            messages: [],
            abortSignal: new AbortController().signal,
          });

          yield {
            type: 'tool_result',
            name: toolName,
            result: toolResult,
            callId: toolCallId,
          };

          // Add tool result as a user message for context
          workingMessages.push({
            role: 'user',
            content: `[Tool ${toolName} result]: ${JSON.stringify(toolResult)}`,
          });
        }

        // Continue loop for next LLM call with tool results
        continue;
      }

      // No tool calls, we're done
      yield { type: 'done' };
      break;
    } catch (error) {
      console.error('[agentLoop] Error in agent loop:', error);
      yield { type: 'error', error: error as Error };
      break;
    }
  }
}
