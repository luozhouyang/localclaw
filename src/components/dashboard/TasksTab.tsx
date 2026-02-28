import { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Play,
  Check,
  X,
  RotateCcw,
  AlertCircle,
  Calendar,
  Tag,
  Loader2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useTasks } from '@/hooks/use-tasks';
import type { Task } from '@/types/task';

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const priorityColors = {
  low: 'bg-stone-500/20 text-stone-400',
  medium: 'bg-orange-500/20 text-orange-400',
  high: 'bg-red-500/20 text-red-400',
};

export function TasksTab() {
  const {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    startTask,
    cancelTask,
    getTaskStats,
    refresh,
  } = useTasks();

  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [filter, setFilter] = useState<Task['status'] | 'all'>('all');

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskTags, setNewTaskTags] = useState('');

  const stats = getTaskStats();

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter((t) => t.status === filter);

  // Sort by priority and then by updatedAt
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return b.updatedAt - a.updatedAt;
  });

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await createTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        status: 'pending',
        priority: newTaskPriority,
        tags: newTaskTags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('medium');
      setNewTaskTags('');
      setShowNewTaskDialog(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      await updateTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        tags: editingTask.tags,
      });
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to update task:', err);
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
              {stats.completed}/{stats.total} completed • {stats.inProgress} in progress
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
        <div className="flex gap-1">
          {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
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
              {status === 'all' ? 'All' : status.replace('_', ' ')}
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
              {filter === 'all' ? 'No tasks yet' : `No ${filter.replace('_', ' ')} tasks`}
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
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`font-medium text-sm ${
                          task.status === 'completed'
                            ? 'text-stone-500 line-through'
                            : 'text-white'
                        }`}
                      >
                        {task.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[task.status]}`}
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${priorityColors[task.priority]}`}
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    {task.description && (
                      <p className="text-sm text-stone-400 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.updatedAt)}
                      </span>
                      {task.tags && task.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {task.tags.join(', ')}
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
                        onClick={() => startTask(task.id)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        title="Start"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}

                    {task.status === 'in_progress' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => completeTask(task.id)}
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        title="Complete"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}

                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTask(task)}
                        className="text-stone-400 hover:text-orange-400"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}

                    {(task.status === 'completed' || task.status === 'cancelled') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateTask(task.id, { status: 'pending' })}
                        className="text-stone-400 hover:text-orange-400"
                        title="Reopen"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}

                    {task.status !== 'cancelled' && task.status !== 'completed' && (
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
              Add a new task to track your work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title"
              className="bg-stone-800 border-orange-500/30 text-white"
            />
            <Textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Description (optional)"
              className="bg-stone-800 border-orange-500/30 text-white"
              rows={3}
            />
            <div className="flex gap-2">
              <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as Task['priority'])}>
                <SelectTrigger className="bg-stone-800 border-orange-500/30 text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-orange-500/20">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={newTaskTags}
                onChange={(e) => setNewTaskTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="bg-stone-800 border-orange-500/30 text-white flex-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim()}
              className="bg-orange-500 hover:bg-orange-400"
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="bg-stone-900 border-orange-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <Input
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                placeholder="Task title"
                className="bg-stone-800 border-orange-500/30 text-white"
              />
              <Textarea
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                placeholder="Description"
                className="bg-stone-800 border-orange-500/30 text-white"
                rows={3}
              />
              <Select
                value={editingTask.priority}
                onValueChange={(v) => setEditingTask({ ...editingTask, priority: v as Task['priority'] })}
              >
                <SelectTrigger className="bg-stone-800 border-orange-500/30 text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-orange-500/20">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} className="bg-orange-500 hover:bg-orange-400">
              Save Changes
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
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
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
