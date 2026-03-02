import { useCallback } from 'react';
import { TabBar } from './TabBar';
import { MonacoEditor } from './MonacoEditor';
import type { OpenFile, EditorSettings } from '@/types/code/editor';

interface EditorAreaProps {
  files: OpenFile[];
  activeFileId: string | null;
  settings: EditorSettings;
  onSelectFile: (fileId: string) => void;
  onCloseFile: (fileId: string) => void;
  onUpdateContent: (fileId: string, content: string) => void;
  onSaveFile: (fileId: string) => void;
}

/**
 * Editor area component
 * Contains tab bar and Monaco editor
 */
export function EditorArea({
  files,
  activeFileId,
  settings,
  onSelectFile,
  onCloseFile,
  onUpdateContent,
  onSaveFile,
}: EditorAreaProps) {
  const activeFile = files.find((f) => f.id === activeFileId);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeFileId && value !== undefined) {
        onUpdateContent(activeFileId, value);
      }
    },
    [activeFileId, onUpdateContent]
  );

  const handleSave = useCallback(() => {
    if (activeFileId) {
      onSaveFile(activeFileId);
    }
  }, [activeFileId, onSaveFile]);

  return (
    <div className="flex flex-col h-full">
      <TabBar
        files={files}
        activeFileId={activeFileId}
        onSelect={onSelectFile}
        onClose={onCloseFile}
      />

      <div className="flex-1 relative">
        {activeFile ? (
          <MonacoEditor
            key={activeFile.id}
            value={activeFile.content}
            language={activeFile.language}
            settings={settings}
            onChange={handleChange}
            onSave={handleSave}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Select a file to edit</p>
              <p className="text-sm text-gray-600">
                Or create a new file from the explorer
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
