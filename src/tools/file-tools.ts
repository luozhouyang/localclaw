import { tool } from 'ai';
import { z } from 'zod';
import { getFS } from '@/lib/file-utils';

/**
 * File-related tools for the agent
 * Using AI SDK's tool() function with Zod schemas
 */

export const readFileTool = tool({
  description: 'Read the contents of a file at the specified path. ' +
    'Use offset and limit to read specific portions of large files.',
  inputSchema: z.object({
    path: z.string().describe('Relative or absolute path to the file'),
    offset: z.number().optional().describe('Line offset to start reading (0-indexed)'),
    limit: z.number().optional().describe('Maximum number of lines to read'),
  }),
  execute: async ({ path, offset, limit }) => {
    const fs = await getFS();
    let content = await fs.readFile(path, 'utf-8');

    if (offset !== undefined || limit !== undefined) {
      const lines = content.split('\n');
      const start = offset ?? 0;
      const end = limit !== undefined ? start + limit : lines.length;
      content = lines.slice(start, end).join('\n');
    }

    return {
      content,
      path,
      lines: content.split('\n').length,
    };
  },
});

export const writeFileTool = tool({
  description: 'Create a new file or overwrite an existing file with the specified content. ' +
    'Use this for creating new files or completely replacing file contents.',
  inputSchema: z.object({
    path: z.string().describe('Relative or absolute path for the file'),
    content: z.string().describe('Content to write to the file'),
  }),
  execute: async ({ path, content }) => {
    const fs = await getFS();
    const existed = await fs.access(path).then(() => true).catch(() => false);

    await fs.writeFile(path, content);

    return {
      success: true,
      path,
      action: existed ? 'overwritten' : 'created',
      size: content.length,
    };
  },
});

export const editFileTool = tool({
  description: 'Make targeted edits to a file using search/replace blocks. ' +
    'This is preferred for modifying existing files. Each edit must exactly match the text to replace.',
  inputSchema: z.object({
    path: z.string().describe('Relative or absolute path to the file'),
    edits: z.array(z.object({
      oldText: z.string().describe('Exact text to search for and replace'),
      newText: z.string().describe('Replacement text'),
    })).describe('Array of search/replace operations to apply in order'),
  }),
  execute: async ({ path, edits }) => {
    const fs = await getFS();
    let content = await fs.readFile(path, 'utf-8');
    const applied: Array<{ oldText: string; newText: string; success: boolean }> = [];

    for (const edit of edits) {
      if (!content.includes(edit.oldText)) {
        applied.push({ ...edit, success: false });
        continue;
      }
      content = content.replace(edit.oldText, edit.newText);
      applied.push({ ...edit, success: true });
    }

    await fs.writeFile(path, content);

    return {
      success: applied.every(e => e.success),
      path,
      editsApplied: applied.filter(e => e.success).length,
      editsFailed: applied.filter(e => !e.success).length,
      details: applied,
    };
  },
});

export const listFilesTool = tool({
  description: 'List files and directories at a given path. ' +
    'Use recursive option to list all files in subdirectories.',
  inputSchema: z.object({
    path: z.string().describe('Relative or absolute path to list'),
    recursive: z.boolean().optional().describe('List files recursively in subdirectories'),
  }),
  execute: async ({ path, recursive }) => {
    const fs = await getFS();

    async function listDir(dirPath: string, depth = 0): Promise<Array<{ name: string; type: 'file' | 'directory'; depth: number }>> {
      const entries = await fs.readdir(dirPath);
      const results: Array<{ name: string; type: 'file' | 'directory'; depth: number }> = [];

      for (const name of entries) {
        const fullPath = `${dirPath}/${name}`.replace(/\/+/g, '/');
        const stats = await fs.stat(fullPath);
        const isDir = stats.isDirectory;

        results.push({
          name,
          type: isDir ? 'directory' : 'file',
          depth,
        });

        if (recursive && isDir) {
          const subEntries = await listDir(fullPath, depth + 1);
          results.push(...subEntries);
        }
      }

      return results;
    }

    const entries = await listDir(path);

    return {
      path,
      entries,
      count: entries.length,
      files: entries.filter(e => e.type === 'file').length,
      directories: entries.filter(e => e.type === 'directory').length,
    };
  },
});
