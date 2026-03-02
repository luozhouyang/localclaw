import { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import {
  defineMonacoTheme,
  configureTypeScript,
  createEditorOptions,
} from '@/utils/code/monaco';
import type { EditorSettings } from '@/types/code/editor';

interface MonacoEditorProps {
  value: string;
  language: string;
  settings: EditorSettings;
  onChange?: (value: string) => void;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onSave?: () => void;
}

/**
 * Monaco Editor wrapper component
 */
export function MonacoEditor({
  value,
  language,
  settings,
  onChange,
  onMount,
  onSave,
}: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Handle editor mount
  const handleMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
      editorRef.current = editor;

      // Define custom theme
      defineMonacoTheme(monacoInstance);

      // Configure TypeScript
      configureTypeScript(monacoInstance);

      // Set theme
      monacoInstance.editor.setTheme('localclaw-dark');

      // Add keyboard shortcuts
      editor.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
        () => {
          onSave?.();
        }
      );

      // Notify parent
      onMount?.(editor);
    },
    [onMount, onSave]
  );

  // Update editor options when settings change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        insertSpaces: settings.insertSpaces,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers,
        automaticLayout: settings.automaticLayout,
      });
    }
  }, [settings]);

  return (
    <Editor
      value={value}
      language={language}
      theme="localclaw-dark"
      options={createEditorOptions({
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        insertSpaces: settings.insertSpaces,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers,
        automaticLayout: settings.automaticLayout,
      })}
      onChange={onChange}
      onMount={handleMount}
      loading={
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
          Loading editor...
        </div>
      }
    />
  );
}
