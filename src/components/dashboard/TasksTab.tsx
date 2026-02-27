import { useState } from 'react'
import { CheckCircle2, Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

interface Task {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate: string
}

const mockTasks: Task[] = [
  { id: '1', title: 'Review project proposal', completed: false, priority: 'high', dueDate: 'Today' },
  { id: '2', title: 'Update documentation', completed: true, priority: 'medium', dueDate: 'Yesterday' },
  { id: '3', title: 'Team standup meeting', completed: false, priority: 'medium', dueDate: 'Today' },
  { id: '4', title: 'Deploy to production', completed: false, priority: 'high', dueDate: 'Tomorrow' },
  { id: '5', title: 'Code review', completed: true, priority: 'low', dueDate: 'Yesterday' },
]

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 hover:bg-red-100'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
    case 'low':
      return 'bg-green-100 text-green-700 hover:bg-green-100'
    default:
      return ''
  }
}

export function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    )
  }

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Tasks
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{completedCount}</span>
            <span>/</span>
            <span>{totalCount}</span>
            <span>completed</span>
          </div>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                task.completed ? 'bg-muted/50' : 'hover:bg-muted/30'
              }`}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium text-sm ${
                    task.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {task.dueDate}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
