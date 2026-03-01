import { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  AlertCircle,
  Calendar,
  Loader2,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAsyncTasks } from '@/hooks/use-async-tasks';
import type { TaskInstance, TaskPriority } from '@/tasks/types';

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  queued: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  running: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  interrupted: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function ProgressBar({ progress }: { progress: TaskInstance['progress'] }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-stone-400 mb-1">
        <span>{progress.message || 'Processing...'}</span>
        <span>{progress.percent}%</span>
      </div>
      <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

export function TasksTab() {
  const {
    tasks: asyncTasks,
    isLoading,
    error,
    createTask,
    cancelTask,
    resumeTask,
    deleteTask,
    refresh,
  } = useAsyncTasks();

  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskInstance | null>(null);
  const [filter, setFilter] = useState<TaskInstance['status'] | 'all'>('all');

  // New task form state
  const [newTaskType, setNewTaskType] = useState('');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('normal');

  const stats = {
    total: asyncTasks.length,
    completed: asyncTasks.filter((t) => t.status === 'completed').length,
    inProgress: asyncTasks.filter((t) => t.status === 'running').length,
  };

  const filteredTasks = filter === 'all'
    ? asyncTasks
    : asyncTasks.filter((t) => t.status === filter);

  // Sort by status (running first) and then by createdAt
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (b.status === 'running' && a.status !== 'running') return 1;
    return b.createdAt - a.createdAt;
  });

  const handleCreateTask = async () => {
    if (!newTaskType.trim()) return;

    try {
      let input: unknown = {};
      if (newTaskInput.trim()) {
        try {
          input = JSON.parse(newTaskInput);
        } catch {
          input = { text: newTaskInput.trim() };
        }
      }

      await createTask(newTaskType.trim(), input, {
        priority: newTaskPriority,
        autoStart: true,
      });

      // Reset form
      setNewTaskType('');
      setNewTaskInput('');
      setNewTaskPriority('normal');
      setShowNewTaskDialog(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTask(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="glass rounded-xl h-[600px] flex flex-col border border-orange-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/20">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6 text-orange-400" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">TASK MANAGER</h2>
            <p className="text-xs text-orange-400/70 font-code">
              {stats.completed}/{stats.total} completed • {stats.inProgress} running
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewTaskDialog(true)}
            className="border-orange-500/30 hover:bg-orange-500/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="border-orange-500/30 hover:bg-orange-500/10"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-orange-500/10 bg-stone-900/30">
        <Filter className="w-4 h-4 text-stone-500" />
        <div className="flex gap-1 flex-wrap">
          {(['all', 'pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'interrupted'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(status)}
              className={`text-xs ${
                filter === status
                  ? 'bg-orange-500 hover:bg-orange-400'
                  : 'text-stone-400 hover:text-orange-400'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border-b border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="ghost" size="sm" onClick={refresh} className="ml-auto text-red-400">
            Retry
          </Button>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-500">
            <CheckSquare className="w-16 h-16 mb-4 opacity-30" />
            <p className="font-code text-sm">
              {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
            </p>
            <p className="text-xs mt-2">
              {filter === 'all' ? 'Create a task to get started' : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-lg border transition-all ${
                  task.status === 'completed'
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-orange-500/10 hover:border-orange-500/30 bg-stone-800/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3
                        className={`font-medium text-sm ${
                          task.status === 'completed'
                            ? 'text-stone-500 line-through'
                            : 'text-white'
                        }`}
                      >
                        {task.type}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[task.status]}`}
                      >
                        {task.status}
                      </Badge>
                    </div>

                    {/* Show task input summary */}
                    {Boolean(task.input && typeof task.input === 'object' && task.input !== null) && (
                      <p className="text-sm text-stone-400 mb-2 line-clamp-2">
                        {(() => {
                          const input = task.input as Record<string, unknown>;
                          const inputStr = JSON.stringify(input);
                          return inputStr.slice(0, 100) + (inputStr.length > 100 ? '...' : '');
                        })()}
                      </p>
                    )}

                    {(task.status === 'running' || task.status === 'queued') && task.progress && (
                      <ProgressBar progress={task.progress} />
                    )}

                    {/* Error display */}
                    {task.error && (
                      <p className="text-xs text-red-400 mt-2 line-clamp-2">
                        Error: {task.error.message}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.createdAt)}
                      </span>
                      {task.retryCount > 0 && (
                        <span className="text-orange-400">
                          {task.retryCount} retries
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {task.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resumeTask(task.id)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        title="Start"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}

                    {task.status === 'interrupted' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resumeTask(task.id)}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                        title="Resume"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}

                    {(task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resumeTask(task.id)}
                        className="text-stone-400 hover:text-orange-400"
                        title="Retry"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}

                    {task.status !== 'cancelled' && task.status !== 'completed' && task.status !== 'failed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelTask(task.id)}
                        className="text-stone-400 hover:text-red-400"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(task)}
                      className="text-stone-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent className="bg-stone-900 border-orange-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Task</DialogTitle>
            <DialogDescription className="text-stone-400">
              Schedule a new async task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newTaskType}
              onChange={(e) => setNewTaskType(e.target.value)}
              placeholder="Task type (e.g., 'file-processor')"
              className="bg-stone-800 border-orange-500/30 text-white"
            />
            <Input
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              placeholder="Input (JSON or text)"
              className="bg-stone-800 border-orange-500/30 text-white"
            />
            <Select
              value={newTaskPriority}
              onValueChange={(v) => setNewTaskPriority(v as TaskPriority)}
            >
              <SelectTrigger className="bg-stone-800 border-orange-500/30 text-white">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-orange-500/20">
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskType.trim()}
              className="bg-orange-500 hover:bg-orange-400"
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-stone-900 border-red-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Delete</DialogTitle>
            <DialogDescription className="text-stone-400">
              Are you sure you want to delete task &quot;{deleteTarget?.type}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
