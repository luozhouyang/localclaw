import { tool } from 'ai';
import { z } from 'zod';
import { executeBashWithTimeout } from '@/tools/bash';

/**
 * Bash-related tools for the agent
 * Using AI SDK's tool() function with Zod schemas
 */

export const bashTool = tool({
  description: 'Execute bash commands in a sandboxed environment. ' +
    'Supports pipes, redirects, and common Unix commands. ' +
    'Available commands: cat, ls, cd, pwd, echo, grep, sed, awk, find, head, tail, jq, and more.',
  inputSchema: z.object({
    command: z.string().describe('Bash command to execute'),
    cwd: z.string().optional().describe('Working directory for the command'),
    timeout: z.number().optional().default(30000).describe('Timeout in milliseconds (default: 30s)'),
  }),
  execute: async ({ command, cwd, timeout }) => {
    const result = await executeBashWithTimeout(command, { cwd }, timeout);

    return {
      command,
      cwd: cwd || '/home/user',
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      success: result.exitCode === 0,
    };
  },
});

export const searchFilesTool = tool({
  description: 'Search for files by name pattern or file content. ' +
    'For content search, uses grep-like functionality.',
  inputSchema: z.object({
    pattern: z.string().describe('Search pattern (glob for names, regex for content)'),
    path: z.string().describe('Path to search in'),
    searchInContent: z.boolean().optional().describe('Search inside file contents (default: false)'),
  }),
  execute: async ({ pattern, path, searchInContent }) => {
    if (searchInContent) {
      // Use bash grep for content search
      const result = await executeBashWithTimeout(
        `grep -r "${pattern.replace(/"/g, '\"')}" "${path}" 2>/dev/null || echo "No matches found"`,
        {},
        10000
      );

      return {
        pattern,
        path,
        type: 'content',
        results: result.stdout.split('\n').filter(Boolean),
        count: result.stdout.split('\n').filter(Boolean).length,
      };
    }

    // Use bash find for name search
    const result = await executeBashWithTimeout(
      `find "${path}" -name "${pattern.replace(/"/g, '\"')}" 2>/dev/null || echo "No matches found"`,
      {},
      10000
    );

    return {
      pattern,
      path,
      type: 'name',
      results: result.stdout.split('\n').filter(Boolean),
      count: result.stdout.split('\n').filter(Boolean).length,
    };
  },
});
