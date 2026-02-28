export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  tags?: string[];
}

export interface TaskFilter {
  status?: Task['status'];
  priority?: Task['priority'];
  tags?: string[];
}

export const TASK_STORAGE_KEY = 'tasks:all';
