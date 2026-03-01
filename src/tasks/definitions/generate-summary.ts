import { z } from 'zod';
import { defineTask } from '../registry';

const inputSchema = z.object({
  threadId: z.string(),
  messageCount: z.number().optional(),
});

const outputSchema = z.object({
  summary: z.string(),
  tokenCount: z.number(),
});

export const generateSummaryTask = defineTask({
  type: 'generate_summary',
  title: 'Generate Thread Summary',
  description: 'Summarize conversation history for context management',
  config: {
    maxRetries: 3,
    timeout: 300000, // 5 minutes
    priority: 'low',
    idempotent: true,
    resumable: true,
    onInterruption: 'auto-retry',
  },
  inputSchema,
  outputSchema,
  async execute(ctx) {
    const { threadId, messageCount = 20 } = ctx.input as z.infer<typeof inputSchema>;

    ctx.log('info', 'Starting summary generation', { threadId, messageCount });

    // Check for checkpoint
    const checkpoint = ctx.getCheckpoint?.();
    const startIndex = (checkpoint?.partialResult as { processedCount?: number })?.processedCount || 0;

    if (startIndex > 0) {
      ctx.log('info', `Resuming from message ${startIndex}`);
    }

    // Simulate processing (replace with actual implementation)
    const messages: string[] = [];
    for (let i = startIndex; i < messageCount; i++) {
      if (ctx.isCancelled()) {
        throw new Error('Task cancelled');
      }

      messages.push(`Message ${i + 1}`);

      const progress = Math.floor(((i + 1) / messageCount) * 100);
      ctx.reportProgress(progress, `Processing message ${i + 1}/${messageCount}`);

      // Save checkpoint every 5 messages
      if ((i + 1) % 5 === 0 && ctx.saveCheckpoint) {
        await ctx.saveCheckpoint({
          progress,
          message: `Processed ${i + 1} messages`,
          canResume: true,
          partialResult: { processedCount: i + 1 },
        });
      }

      // Simulate work
      await new Promise(r => setTimeout(r, 100));
    }

    ctx.reportProgress(100, 'Generating final summary');

    // Simulate LLM call
    const summary = `Summary of ${messages.length} messages in thread ${threadId}`;
    const tokenCount = summary.length / 4;

    ctx.log('info', 'Summary generation complete', { tokenCount });

    return {
      summary,
      tokenCount: Math.floor(tokenCount),
    };
  },
});
