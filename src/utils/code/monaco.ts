/**
 * Monaco Editor configuration and utilities
 */
import type * as monaco from 'monaco-editor';

/**
 * Define custom theme for Code editor
 */
export function defineMonacoTheme(monacoInstance: typeof monaco) {
  monacoInstance.editor.defineTheme('localclaw-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'F97316' },
      { token: 'identifier', foreground: 'E5E5E5' },
      { token: 'string', foreground: '22C55E' },
      { token: 'number', foreground: 'A855F7' },
      { token: 'function', foreground: '3B82F6' },
      { token: 'operator', foreground: 'F97316' },
    ],
    colors: {
      'editor.background': '#0D0D0D',
      'editor.foreground': '#E5E5E5',
      'editor.lineHighlightBackground': '#1A1A1A',
      'editor.selectionBackground': '#F9731633',
      'editor.selectionHighlightBackground': '#F9731622',
      'editor.inactiveSelectionBackground': '#F9731611',
      'editor.findMatchBackground': '#F9731644',
      'editor.findMatchHighlightBackground': '#F9731622',
      'editor.findRangeHighlightBackground': '#F9731611',
      'editor.hoverHighlightBackground': '#F9731622',
      'editor.wordHighlightBackground': '#F9731622',
      'editor.wordHighlightStrongBackground': '#F9731633',
      'editorBracketMatch.background': '#F9731644',
      'editorBracketMatch.border': '#F97316',
      'editorGutter.background': '#0D0D0D',
      'editorGutter.modifiedBackground': '#F97316',
      'editorGutter.addedBackground': '#22C55E',
      'editorGutter.deletedBackground': '#EF4444',
      'minimap.background': '#0D0D0D',
      'minimap.selectionHighlight': '#F97316',
      'minimap.errorHighlight': '#EF4444',
      'minimap.warningHighlight': '#F59E0B',
      'editorOverviewRuler.border': '#1A1A1A',
      'editorOverviewRuler.errorForeground': '#EF4444',
      'editorOverviewRuler.warningForeground': '#F59E0B',
      'editorOverviewRuler.infoForeground': '#3B82F6',
    },
  });
}

/**
 * Configure TypeScript compiler options
 */
export function configureTypeScript(monacoInstance: typeof monaco) {
  monacoInstance.typescript.typescriptDefaults.setCompilerOptions({
    target: monacoInstance.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monacoInstance.typescript.ModuleResolutionKind.NodeJs,
    module: monacoInstance.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: monacoInstance.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    strict: true,
    skipLibCheck: true,
    typeRoots: ['node_modules/@types'],
  });

  monacoInstance.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  monacoInstance.typescript.javascriptDefaults.setCompilerOptions({
    target: monacoInstance.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monacoInstance.typescript.ModuleResolutionKind.NodeJs,
    module: monacoInstance.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    allowJs: true,
    strict: false,
  });
}

/**
 * Create editor options
 */
export function createEditorOptions(
  overrides: Partial<monaco.editor.IStandaloneEditorConstructionOptions> = {}
): monaco.editor.IStandaloneEditorConstructionOptions {
  return {
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
    fontLigatures: true,
    lineHeight: 22,
    lineNumbers: 'on',
    minimap: {
      enabled: true,
      showSlider: 'mouseover',
      renderCharacters: false,
    },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      useShadows: false,
    },
    wordWrap: 'on',
    wrappingStrategy: 'advanced',
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: true,
    trimAutoWhitespace: true,
    formatOnPaste: true,
    formatOnType: false,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderWhitespace: 'selection',
    renderLineHighlight: 'all',
    folding: true,
    foldingStrategy: 'auto',
    showFoldingControls: 'mouseover',
    unfoldOnClickAfterEndOfLine: true,
    bracketPairColorization: {
      enabled: true,
    },
    guides: {
      bracketPairs: true,
      bracketPairsHorizontal: true,
      highlightActiveBracketPair: true,
      indentation: true,
      highlightActiveIndentation: true,
    },
    quickSuggestions: true,
    quickSuggestionsDelay: 100,
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: 'on',
    suggestOnTriggerCharacters: true,
    wordBasedSuggestions: 'currentDocument',
    parameterHints: {
      enabled: true,
      cycle: true,
    },
    hover: {
      enabled: true,
      delay: 300,
      sticky: true,
    },
    ...overrides,
  };
}

/**
 * Setup Monaco environment for workers
 * This should be called in the main entry file
 */
export function setupMonacoEnvironment() {
  // MonacoEnvironment is a global
  self.MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      if (label === 'json') {
        return '/monaco-editor/json.worker.js';
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return '/monaco-editor/css.worker.js';
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return '/monaco-editor/html.worker.js';
      }
      if (label === 'typescript' || label === 'javascript') {
        return '/monaco-editor/ts.worker.js';
      }
      return '/monaco-editor/editor.worker.js';
    },
  };
}
