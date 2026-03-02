import { Tab } from './Tab';
import type { OpenFile } from '@/types/code/editor';

interface TabBarProps {
  files: OpenFile[];
  activeFileId: string | null;
  onSelect: (fileId: string) => void;
  onClose: (fileId: string) => void;
}

/**
 * Tab bar component for managing open files
 */
export function TabBar({ files, activeFileId, onSelect, onClose }: TabBarProps) {
  if (files.length === 0) {
    return (
      <div className="flex items-center h-10 px-4 text-sm text-gray-500 border-b border-orange-500/20 bg-[#0D0D0D]">
        No files open
      </div>
    );
  }

  return (
    <div className="flex items-center h-10 overflow-x-auto border-b border-orange-500/20 bg-[#0D0D0D]">
      {files.map((file) => (
        <Tab
          key={file.id}
          name={file.name}
          isActive={file.id === activeFileId}
          isDirty={file.isDirty}
          onClick={() => onSelect(file.id)}
          onClose={(e) => {
            e.stopPropagation();
            onClose(file.id);
          }}
        />
      ))}
    </div>
  );
}
