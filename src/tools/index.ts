/**
 * Core tools for the agent
 * Re-exports from split modules for backward compatibility
 */

export {
  readFileTool,
  writeFileTool,
  editFileTool,
  listFilesTool,
} from './file-tools';

export {
  bashTool,
  searchFilesTool,
} from './bash-tools';

// Re-import for coreTools object
import { readFileTool, writeFileTool, editFileTool, listFilesTool } from './file-tools';
import { bashTool, searchFilesTool } from './bash-tools';

/**
 * All core tools exported as a record for AI SDK
 */
export const coreTools = {
  read_file: readFileTool,
  write_file: writeFileTool,
  edit_file: editFileTool,
  list_files: listFilesTool,
  search_files: searchFilesTool,
  bash: bashTool,
};

export type CoreTools = typeof coreTools;
