import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, MessageSquare, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { threadManager } from '@/chat/thread-manager';
import type { Thread, Channel } from '@/chat/types';

interface ThreadSidebarProps {
  currentThreadId: string | null;
  onSelectThread: (id: string) => void;
  onCreateThread: () => void;
  channel?: Channel;
}

/**
 * ThreadSidebar component
 * Displays list of chat threads and allows thread management
 */
export function ThreadSidebar({
  currentThreadId,
  onSelectThread,
  onCreateThread,
  channel = 'local',
}: ThreadSidebarProps) {
  const { t } = useTranslation();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const loadThreads = useCallback(async () => {
    const list = await threadManager.listThreads(channel);
    setThreads(list.filter(t => !t.metadata?.deleted));
  }, [channel]);

  useEffect(() => {
    loadThreads();
    // Refresh every 5 seconds when visible
    const interval = setInterval(loadThreads, 5000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t('common.confirm'))) {
      await threadManager.deleteThread(id);
      loadThreads();
    }
  };

  const startEditing = (e: React.MouseEvent, thread: Thread) => {
    e.stopPropagation();
    setEditingId(thread.id);
    setEditTitle(thread.title);
  };

  const saveTitle = async () => {
    if (editingId && editTitle.trim()) {
      await threadManager.updateThread(editingId, { title: editTitle.trim() });
      setEditingId(null);
      loadThreads();
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-64 h-full flex flex-col bg-stone-900/50 border-r border-orange-500/20">
      {/* Header */}
      <div className="p-4 border-b border-orange-500/20">
        <Button
          onClick={onCreateThread}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('chat.newChat')}
        </Button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {threads.map((thread) => (
          <div
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`
              group relative p-3 rounded-lg cursor-pointer transition-colors
              ${currentThreadId === thread.id
                ? 'bg-orange-500/20 border border-orange-500/30'
                : 'hover:bg-stone-800/50 border border-transparent'
              }
            `}
          >
            {editingId === thread.id ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  className="flex-1 bg-stone-800 text-white text-sm px-2 py-1 rounded border border-orange-500/30 focus:outline-none focus:border-orange-400"
                  autoFocus
                />
                <button onClick={saveTitle} className="text-green-400 hover:text-green-300">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={cancelEditing} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-400/70 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {thread.title}
                    </p>
                    {thread.lastMessagePreview && (
                      <p className="text-xs text-stone-400 truncate mt-0.5">
                        {thread.lastMessagePreview}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-stone-500">
                    {formatDate(thread.updatedAt)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startEditing(e, thread)}
                      className="p-1 text-stone-400 hover:text-orange-400 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, thread.id)}
                      className="p-1 text-stone-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {threads.length === 0 && (
          <div className="text-center py-8 text-stone-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('chat.emptyState.selectOrCreate')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
