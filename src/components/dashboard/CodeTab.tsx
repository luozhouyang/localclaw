import { useState, useCallback, useEffect } from 'react';
import { useFileSystem } from '@/hooks/code/useFileSystem';
import { useEditorState } from '@/hooks/code/useEditorState';
import { useCodeExecution } from '@/hooks/code/useCodeExecution';
import { FileExplorer } from '@/components/code/FileExplorer/FileExplorer';
import { EditorArea } from '@/components/code/EditorArea/EditorArea';
import { Console } from '@/components/code/Console/Console';
import { Toolbar } from '@/components/code/Toolbar/Toolbar';
import { createSystemOutput } from '@/types/code/execution';

/**
 * CodeTab component
 * Main container for the code editor and execution environment
 */
export function CodeTab() {
  const {
    isReady: fsReady,
    fileTree,
    isLoading: fsLoading,
    readFile,
    writeFile,
    deleteFile,
    createDirectory,
    deleteDirectory,
    rename,
    refresh,
  } = useFileSystem();

  const {
    openFiles,
    activeFileId,
    settings,
    activeFile,
    openFile: openFileState,
    closeFile,
    setActiveFile,
    updateFileContent,
    saveFile: saveFileState,
  } = useEditorState();

  const {
    isExecuting,
    output,
    execute,
    stop,
    clear,
    appendOutput,
  } = useCodeExecution();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [executionLanguage, setExecutionLanguage] = useState<'javascript' | 'typescript'>('javascript');

  // Handle file selection from explorer
  const handleSelectFile = useCallback(async (path: string) => {
    setSelectedPath(path);

    // Check if already open
    const existingFile = openFiles.find((f) => f.path === path);
    if (existingFile) {
      setActiveFile(existingFile.id);
      return;
    }

    // Read and open file
    try {
      const content = await readFile(path);
      openFileState(path, content);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, [openFiles, readFile, openFileState, setActiveFile]);

  // Handle file creation
  const handleCreate = useCallback(async (path: string, type: 'file' | 'directory') => {
    try {
      if (type === 'file') {
        await writeFile(path, '');
        // Open the new file
        handleSelectFile(path);
      } else {
        await createDirectory(path);
      }
    } catch (error) {
      console.error('Failed to create:', error);
    }
  }, [writeFile, createDirectory, handleSelectFile]);

  // Handle file deletion
  const handleDelete = useCallback(async (path: string, type: 'file' | 'directory') => {
    try {
      if (type === 'file') {
        await deleteFile(path);
        // Close file if open
        const openFile = openFiles.find((f) => f.path === path);
        if (openFile) {
          closeFile(openFile.id);
        }
      } else {
        await deleteDirectory(path);
        // Close any open files in this directory
        const filesToClose = openFiles.filter((f) => f.path.startsWith(path));
        filesToClose.forEach((f) => closeFile(f.id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }, [deleteFile, deleteDirectory, openFiles, closeFile]);

  // Handle file rename
  const handleRename = useCallback(async (oldPath: string, newPath: string) => {
    try {
      await rename(oldPath, newPath);
      // Update open file paths
      const openFile = openFiles.find((f) => f.path === oldPath);
      if (openFile) {
        closeFile(openFile.id);
        const newContent = await readFile(newPath);
        openFileState(newPath, newContent);
      }
    } catch (error) {
      console.error('Failed to rename:', error);
    }
  }, [rename, openFiles, closeFile, readFile, openFileState]);

  // Handle save file
  const handleSaveFile = useCallback(async (fileId: string) => {
    const file = openFiles.find((f) => f.id === fileId);
    if (!file) return;

    try {
      await writeFile(file.path, file.content);
      saveFileState(fileId);
      appendOutput(createSystemOutput(`Saved ${file.name}`));
    } catch (error) {
      console.error('Failed to save file:', error);
      appendOutput(createSystemOutput(`Failed to save ${file.name}`));
    }
  }, [openFiles, writeFile, saveFileState, appendOutput]);

  // Handle run code
  const handleRun = useCallback(async () => {
    if (!activeFile) return;

    const code = activeFile.content;
    const language = activeFile.language === 'typescript' ? 'typescript' : 'javascript';

    await execute({
      code,
      language,
    });
  }, [activeFile, execute]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to run
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isExecuting && activeFile) {
          handleRun();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExecuting, activeFile, handleRun]);

  // Show loading state while initializing
  if (!fsReady) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">
            Initializing code editor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] glass rounded-xl border border-orange-500/20 overflow-hidden">
      {/* Toolbar */}
      <Toolbar
        isRunning={isExecuting}
        canRun={!!activeFile && !isExecuting}
        language={executionLanguage}
        onRun={handleRun}
        onStop={stop}
        onLanguageChange={setExecutionLanguage}
      />

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* File Explorer */}
        <div className="w-64 flex-shrink-0 border-r border-orange-500/20">
          <FileExplorer
            fileTree={fileTree}
            selectedPath={selectedPath}
            isLoading={fsLoading}
            onSelect={handleSelectFile}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onRename={handleRename}
            onRefresh={refresh}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <EditorArea
              files={openFiles}
              activeFileId={activeFileId}
              settings={settings}
              onSelectFile={setActiveFile}
              onCloseFile={closeFile}
              onUpdateContent={updateFileContent}
              onSaveFile={handleSaveFile}
            />
          </div>
        </div>
      </div>

      {/* Console */}
      <div className="h-48 border-t border-orange-500/20">
        <Console
          output={output}
          isRunning={isExecuting}
          onClear={clear}
          onStop={stop}
        />
      </div>
    </div>
  );
}
