import { createFileRoute } from '@tanstack/react-router'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';

interface ChatRequestBody {
  messages: Array<UIMessage>
  provider: {
    baseURL: string
    apiKey: string
    defaultModel: string
  }
}

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Parse request body - config comes from frontend
          const body = await request.json() as ChatRequestBody
          const { messages, provider } = body

          if (!provider) {
            return new Response(
              JSON.stringify({ error: 'Provider configuration is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          if (!provider.apiKey) {
            return new Response(
              JSON.stringify({ error: 'API key is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          if (!provider.baseURL) {
            return new Response(
              JSON.stringify({ error: 'Base URL is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          if (!provider.defaultModel) {
            return new Response(
              JSON.stringify({ error: 'Model is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const openai = createOpenAI({
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
          });

          const modelMessages = await convertToModelMessages(messages);
          const result = streamText({
            model: openai.chat(provider.defaultModel),
            messages: modelMessages,
          });

          return result.toUIMessageStreamResponse();
        } catch (error) {
          console.error('Chat API error:', error)
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Internal server error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
