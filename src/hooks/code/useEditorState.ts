/**
 * Hook for editor state management
 */
import { useState, useCallback, useMemo } from 'react';
import type { OpenFile, EditorSettings } from '@/types/code/editor';
import { DEFAULT_EDITOR_SETTINGS, getLanguageFromPath } from '@/types/code/editor';

interface UseEditorStateReturn {
  // Open files
  openFiles: OpenFile[];
  activeFileId: string | null;
  // Settings
  settings: EditorSettings;
  // Actions
  openFile: (path: string, content: string) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  saveFile: (fileId: string) => void;
  updateSettings: (settings: Partial<EditorSettings>) => void;
  // Computed
  activeFile: OpenFile | null;
  hasDirtyFiles: boolean;
}

/**
 * Hook for editor state management
 */
export function useEditorState(): UseEditorStateReturn {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);

  /**
   * Get active file
   */
  const activeFile = useMemo(() => {
    return openFiles.find((f) => f.id === activeFileId) || null;
  }, [openFiles, activeFileId]);

  /**
   * Check if there are dirty files
   */
  const hasDirtyFiles = useMemo(() => {
    return openFiles.some((f) => f.isDirty);
  }, [openFiles]);

  /**
   * Open a file
   */
  const openFile = useCallback((path: string, content: string) => {
    // Check if file is already open
    const existingFile = openFiles.find((f) => f.path === path);
    if (existingFile) {
      setActiveFileId(existingFile.id);
      return;
    }

    // Create new file entry
    const newFile: OpenFile = {
      id: crypto.randomUUID(),
      path,
      name: path.split('/').pop() || 'untitled',
      content,
      originalContent: content,
      language: getLanguageFromPath(path),
      isDirty: false,
    };

    setOpenFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, [openFiles]);

  /**
   * Close a file
   */
  const closeFile = useCallback((fileId: string) => {
    setOpenFiles((prev) => {
      const index = prev.findIndex((f) => f.id === fileId);
      const newFiles = prev.filter((f) => f.id !== fileId);

      // Update active file if needed
      if (activeFileId === fileId) {
        const newIndex = Math.min(index, newFiles.length - 1);
        setActiveFileId(newFiles[newIndex]?.id || null);
      }

      return newFiles;
    });
  }, [activeFileId]);

  /**
   * Set active file
   */
  const setActiveFile = useCallback((fileId: string) => {
    setActiveFileId(fileId);
  }, []);

  /**
   * Update file content
   */
  const updateFileContent = useCallback((fileId: string, content: string) => {
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, content, isDirty: f.originalContent !== content }
          : f
      )
    );
  }, []);

  /**
   * Mark file as saved
   */
  const saveFile = useCallback((fileId: string) => {
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, originalContent: f.content, isDirty: false } : f
      )
    );
  }, []);

  /**
   * Update editor settings
   */
  const updateSettings = useCallback((newSettings: Partial<EditorSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  return {
    openFiles,
    activeFileId,
    settings,
    openFile,
    closeFile,
    setActiveFile,
    updateFileContent,
    saveFile,
    updateSettings,
    activeFile,
    hasDirtyFiles,
  };
}
