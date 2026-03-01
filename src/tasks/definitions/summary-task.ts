import { z } from 'zod';
import { defineTask } from '../registry';
import { memoryManager } from '@/memory/manager';
import { threadManager } from '@/chat/thread-manager';

const inputSchema = z.object({
  threadId: z.string(),
});

export const summaryTask = defineTask({
  type: 'generate_summary',
  title: 'Generate Thread Summary',
  description: 'Summarize conversation history for long-term context retention',
  config: {
    maxRetries: 3,
    timeout: 300000, // 5 minutes
    priority: 'low',
    idempotent: true,
    resumable: true,
    onInterruption: 'auto-retry',
  },
  inputSchema,
  async execute(ctx) {
    const { threadId } = ctx.input as z.infer<typeof inputSchema>;

    ctx.log('info', 'Loading messages for summary', { threadId });

    // Get last summary end index
    const lastEndIndex = await memoryManager.getLastSummaryEndIndex(threadId);
    ctx.reportProgress(10, 'Loading messages');

    // Load all messages
    const messages = await threadManager.loadMessages(threadId);
    ctx.reportProgress(30, `Loaded ${messages.length} messages`);

    // Get messages since last summary
    const newMessages = messages.slice(lastEndIndex);
    if (newMessages.length === 0) {
      ctx.log('info', 'No new messages to summarize');
      return { summary: 'No new messages to summarize', tokenCount: 0 };
    }

    ctx.reportProgress(40, `Processing ${newMessages.length} new messages`);

    // Simulate summary generation (replace with actual LLM call)
    // In production, this would call an LLM to generate the summary
    const summaryLines: string[] = [];
    for (let i = 0; i < newMessages.length; i += 5) {
      if (ctx.isCancelled()) {
        throw new Error('Task cancelled');
      }

      const batch = newMessages.slice(i, i + 5);
      const progress = 40 + Math.floor((i / newMessages.length) * 50);
      ctx.reportProgress(progress, `Processing messages ${i + 1}-${Math.min(i + 5, newMessages.length)}`);

      // Extract key points from each message batch
      for (const msg of batch) {
        const textParts = msg.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map(p => p.text)
          .join(' ');

        if (textParts.length > 20) {
          summaryLines.push(`- ${textParts.slice(0, 100)}${textParts.length > 100 ? '...' : ''}`);
        }
      }

      // Save checkpoint every 10 messages
      if (i > 0 && i % 10 === 0 && ctx.saveCheckpoint) {
        await ctx.saveCheckpoint({
          progress,
          message: `Processed ${i} messages`,
          canResume: true,
          partialResult: { processedCount: i },
        });
      }

      await new Promise(r => setTimeout(r, 100));
    }

    ctx.reportProgress(90, 'Finalizing summary');

    // Combine with previous summary if exists
    const previousSummary = await memoryManager.getSummary(threadId);
    let combinedContent = '';

    if (previousSummary) {
      combinedContent = `Previous summary:\n${previousSummary.content}\n\nNew messages:\n${summaryLines.join('\n')}`;
    } else {
      combinedContent = summaryLines.join('\n');
    }

    // Create summary object
    const summary = {
      version: 1 as const,
      generatedAt: Date.now(),
      messageRange: {
        start: lastEndIndex,
        end: messages.length,
      },
      content: combinedContent.slice(0, 2000), // Limit size
      tokenCount: Math.floor(combinedContent.length / 4),
    };

    // Save summary
    await memoryManager.saveSummary(threadId, summary);

    ctx.reportProgress(100, 'Summary saved');
    ctx.log('info', 'Summary generation complete', {
      messageCount: newMessages.length,
      tokenCount: summary.tokenCount,
    });

    return {
      summary: summary.content,
      tokenCount: summary.tokenCount,
    };
  },
});
