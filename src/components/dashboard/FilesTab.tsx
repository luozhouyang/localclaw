import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Folder,
  FolderOpen,
  MoreVertical,
  Upload,
  Plus,
  ChevronUp,
  Home,
  RefreshCw,
  Trash2,
  Edit2,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFiles } from '@/hooks/use-files';

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format date in localized format
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * FilesTab component
 * File manager interface for browsing and managing files
 */
export function FilesTab() {
  const { t } = useTranslation();
  const {
    files,
    currentPath,
    isLoading,
    error,
    navigateTo,
    navigateUp,
    createDirectory,
    deleteItem,
    renameItem,
    uploadFile,
    refresh,
  } = useFiles('/home/user');

  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderClick = (name: string) => {
    const newPath = `${currentPath}/${name}`.replace(/\/+/g, '/');
    navigateTo(newPath);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createDirectory(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderDialog(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !newName.trim()) return;
    try {
      await renameItem(renameTarget, newName.trim());
      setRenameTarget(null);
      setNewName('');
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
    }
  };

  const handleDownload = async (name: string) => {
    // For now, just alert that download would happen
    alert(`Download ${name} - Feature coming soon`);
  };

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    return [
      { name: 'Home', path: '/home/user' },
      ...parts.slice(2).map((part, index) => ({
        name: part,
        path: '/home/user/' + parts.slice(2, index + 3).join('/'),
      })),
    ];
  };

  return (
    <div className="glass rounded-xl h-[600px] flex flex-col border border-orange-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/20">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-6 h-6 text-orange-400" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">{t('files.title')}</h2>
            <p className="text-xs text-orange-400/70 font-code">
              {t('files.itemsInPath', { count: files.length, path: currentPath })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewFolderDialog(true)}
            className="border-orange-500/30 hover:bg-orange-500/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('files.newFolder')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="border-orange-500/30 hover:bg-orange-500/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('files.upload')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="border-orange-500/30 hover:bg-orange-500/10"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-orange-500/10 bg-stone-900/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={navigateUp}
          disabled={currentPath === '/home/user'}
          className="h-8 px-2 text-stone-400 hover:text-orange-400"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 text-sm">
          {getBreadcrumbs().map((crumb, index, arr) => (
            <span key={crumb.path} className="flex items-center">
              {index === 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo(crumb.path)}
                  className="h-6 px-2 text-orange-400 hover:text-orange-300"
                >
                  <Home className="w-3 h-3" />
                </Button>
              ) : (
                <>
                  <span className="text-stone-600">/</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateTo(crumb.path)}
                    className={`h-6 px-2 ${
                      index === arr.length - 1
                        ? 'text-orange-400'
                        : 'text-stone-400 hover:text-orange-400'
                    }`}
                  >
                    {crumb.name}
                  </Button>
                </>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border-b border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="ghost" size="sm" onClick={refresh} className="ml-auto text-red-400">
            {t('files.retry')}
          </Button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-500">
            <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="font-code text-sm">{t('files.emptyDirectory')}</p>
            <p className="text-xs mt-2">{t('files.uploadOrCreate')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.path}
                className="flex items-center justify-between p-3 rounded-lg border border-orange-500/10 hover:bg-stone-800/50 transition-colors group"
              >
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => file.type === 'directory' && handleFolderClick(file.name)}
                >
                  {file.type === 'directory' ? (
                    <Folder className="w-8 h-8 text-orange-400" />
                  ) : (
                    <FileText className="w-8 h-8 text-stone-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">{file.name}</p>
                    <p className="text-xs text-stone-500 font-code">
                      {file.type === 'directory'
                        ? t('files.folder')
                        : `${formatFileSize(file.size)} • ${formatDate(file.mtime)}`}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-stone-900 border-orange-500/20">
                    {file.type === 'file' && (
                      <DropdownMenuItem onClick={() => handleDownload(file.name)}>
                        <Download className="w-4 h-4 mr-2" />
                        {t('files.actions.download')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameTarget(file.name);
                        setNewName(file.name);
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {t('files.actions.rename')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(file.name)}
                      className="text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('files.actions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="bg-stone-900 border-orange-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">{t('files.dialogs.newFolder.title')}</DialogTitle>
            <DialogDescription className="text-stone-400">
              {t('files.dialogs.newFolder.description', { path: currentPath })}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t('files.dialogs.newFolder.placeholder')}
            className="bg-stone-800 border-orange-500/30 text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              {t('files.dialogs.newFolder.cancel')}
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="bg-orange-500 hover:bg-orange-400"
            >
              {t('files.dialogs.newFolder.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <DialogContent className="bg-stone-900 border-orange-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">{t('files.dialogs.rename.title')}</DialogTitle>
            <DialogDescription className="text-stone-400">
              {t('files.dialogs.rename.description', { name: renameTarget })}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('files.dialogs.rename.placeholder')}
            className="bg-stone-800 border-orange-500/30 text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              {t('files.dialogs.rename.cancel')}
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newName.trim() || newName === renameTarget}
              className="bg-orange-500 hover:bg-orange-400"
            >
              {t('files.dialogs.rename.rename')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-stone-900 border-red-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">{t('files.dialogs.delete.title')}</DialogTitle>
            <DialogDescription className="text-stone-400">
              {t('files.dialogs.delete.description', { name: deleteTarget })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('files.dialogs.delete.cancel')}
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              {t('files.dialogs.delete.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
