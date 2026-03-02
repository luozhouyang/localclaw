/**
 * Editor types for Code editor
 */

export interface OpenFile {
  /** Unique file ID */
  id: string;
  /** File path */
  path: string;
  /** File name */
  name: string;
  /** Current content */
  content: string;
  /** Original content (for dirty check) */
  originalContent: string;
  /** Language identifier */
  language: string;
  /** Whether file has unsaved changes */
  isDirty: boolean;
  /** Cursor position */
  cursorPosition?: Position;
  /** Scroll position */
  scrollPosition?: ScrollPosition;
}

export interface Position {
  lineNumber: number;
  column: number;
}

export interface ScrollPosition {
  scrollTop: number;
  scrollLeft: number;
}

export interface EditorSettings {
  /** Editor theme */
  theme: 'vs' | 'vs-dark' | 'hc-black';
  /** Font size in pixels */
  fontSize: number;
  /** Tab size in spaces */
  tabSize: number;
  /** Word wrap mode */
  wordWrap: 'off' | 'on' | 'wordWrapColumn';
  /** Whether to show minimap */
  minimap: boolean;
  /** Line number display */
  lineNumbers: 'on' | 'off' | 'relative';
  /** Automatic layout adjustment */
  automaticLayout: boolean;
  /** Whether to use spaces instead of tabs */
  insertSpaces: boolean;
  /** Format on save */
  formatOnSave: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  automaticLayout: true,
  insertSpaces: true,
  formatOnSave: false,
};

/**
 * Language mapping from file extension to Monaco language
 */
export const LANGUAGE_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  // Data
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  xml: 'xml',
  csv: 'plaintext',
  // Config
  md: 'markdown',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  // Other
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  sql: 'sql',
  graphql: 'graphql',
};

/**
 * Get language from file path
 */
export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[ext] || 'plaintext';
}

/**
 * Check if language is executable in Node.js
 */
export function isExecutableLanguage(language: string): boolean {
  return ['javascript', 'typescript'].includes(language);
}
