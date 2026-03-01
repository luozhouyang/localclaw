import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useCronScheduler } from '@/hooks/use-cron-scheduler'
import { CronParser, type NewCronJob, type MissedTaskStrategy } from '@/crontab'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, ArrowLeft, AlertCircle, CheckCircle2, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/crontab/new')({
  component: NewJobPage,
  ssr: false
})

function NewJobPage() {
  const navigate = useNavigate()
  const { addJob } = useCronScheduler()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schedule, setSchedule] = useState('')
  const [customExpression, setCustomExpression] = useState('')
  const [taskType, setTaskType] = useState('')
  const [input, setInput] = useState('{}')
  const [strategy, setStrategy] = useState<MissedTaskStrategy>('run-once')
  const [maxRuns, setMaxRuns] = useState('')
  const [maxErrors, setMaxErrors] = useState('3')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 验证表单
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Job name is required'
    }

    if (!schedule && !customExpression.trim()) {
      newErrors.schedule = 'Schedule is required'
    }

    const finalSchedule = schedule || customExpression
    if (finalSchedule) {
      const validation = CronParser.validate(finalSchedule)
      if (!validation.valid) {
        newErrors.schedule = validation.error || 'Invalid schedule'
      }
    }

    if (!taskType.trim()) {
      newErrors.taskType = 'Task type is required'
    }

    // 验证 JSON 输入
    try {
      JSON.parse(input || '{}')
    } catch {
      newErrors.input = 'Invalid JSON'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [name, schedule, customExpression, taskType, input])

  // 提交表单
  const handleSubmit = async () => {
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const finalSchedule = schedule || customExpression

      const jobData: NewCronJob = {
        name: name.trim(),
        description: description.trim() || undefined,
        schedule: finalSchedule,
        taskType: taskType.trim(),
        input: JSON.parse(input || '{}'),
        enabled: true,
        missedRunStrategy: strategy,
        maxRuns: maxRuns ? parseInt(maxRuns, 10) : undefined,
        maxConsecutiveErrors: parseInt(maxErrors, 10) || 3,
        priority: 'normal',
      }

      await addJob(jobData)
      navigate({ to: '/crontab' })
    } catch (error) {
      console.error('Failed to create job:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create job' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 获取预设列表
  const presets = CronParser.getPresets()

  // 获取表达式预览
  const getExpressionPreview = () => {
    const expr = schedule || customExpression
    if (!expr) return null

    const validation = CronParser.validate(expr)
    if (!validation.valid) {
      return (
        <div className="flex items-center gap-2 text-red-400 text-sm font-code">
          <AlertCircle className="w-4 h-4" />
          {validation.error}
        </div>
      )
    }

    try {
      const nextRuns = CronParser.getNextRunTimes(expr, 3)
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-400 text-sm font-code">
            <CheckCircle2 className="w-4 h-4" />
            Valid expression
          </div>
          <div className="text-xs text-orange-500/60 font-code space-y-1">
            <div className="text-orange-500/40">NEXT RUNS:</div>
            {nextRuns.map((time, i) => (
              <div key={i} className="text-orange-400">
                {new Date(time).toLocaleString('zh-CN')}
              </div>
            ))}
          </div>
        </div>
      )
    } catch {
      return (
        <div className="flex items-center gap-2 text-amber-400 text-sm font-code">
          <AlertCircle className="w-4 h-4" />
          Cannot calculate next runs
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-50 border-b border-orange-500/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: '/crontab' })}
                className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="relative">
                <Clock className="w-7 h-7 text-orange-500" />
                <div className="absolute inset-0 blur-lg bg-orange-500/50 -z-10" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-white glow-orange-text">
                  NEW CRON JOB
                </h1>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white font-code"
            >
              {isSubmitting ? 'CREATING...' : 'CREATE JOB'}
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="glass-panel border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-white font-display text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-orange-500" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-orange-500/80 font-code text-sm">
                  Job Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Daily Data Sync"
                  className={cn(
                    "glass border-orange-500/30 text-white placeholder:text-orange-500/30 font-code",
                    errors.name && "border-red-500/50"
                  )}
                />
                {errors.name && (
                  <p className="text-red-400 text-xs font-code">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-orange-500/80 font-code text-sm">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description of what this job does..."
                  rows={2}
                  className="glass border-orange-500/30 text-white placeholder:text-orange-500/30 font-code resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="glass-panel border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-white font-display text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Schedule *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-orange-500/80 font-code text-sm">Preset</Label>
                <Select value={schedule} onValueChange={setSchedule}>
                  <SelectTrigger className="glass border-orange-500/30 text-white font-code">
                    <SelectValue placeholder="Select a preset or use custom" />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-orange-500/20">
                    <SelectItem value="" className="font-code text-orange-400">
                      -- Custom Expression --
                    </SelectItem>
                    {presets.map((preset) => (
                      <SelectItem
                        key={preset.value}
                        value={preset.value}
                        className="font-code"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white">{preset.label}</span>
                          <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400">
                            {preset.expression}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expression" className="text-orange-500/80 font-code text-sm">
                  Custom Cron Expression
                </Label>
                <Input
                  id="expression"
                  value={customExpression}
                  onChange={(e) => setCustomExpression(e.target.value)}
                  placeholder="e.g., */5 * * * * (every 5 minutes)"
                  disabled={!!schedule}
                  className={cn(
                    "glass border-orange-500/30 text-white placeholder:text-orange-500/30 font-code",
                    errors.schedule && "border-red-500/50",
                    schedule && "opacity-50 cursor-not-allowed"
                  )}
                />
                {errors.schedule && (
                  <p className="text-red-400 text-xs font-code">{errors.schedule}</p>
                )}

                {/* Expression Preview */}
                {(schedule || customExpression) && (
                  <div className="mt-3 p-3 rounded-lg bg-black/30 border border-orange-500/20">
                    {getExpressionPreview()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task Configuration */}
          <Card className="glass-panel border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-white font-display text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-orange-500" />
                Task Configuration *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskType" className="text-orange-500/80 font-code text-sm">
                  Task Type
                </Label>
                <Input
                  id="taskType"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  placeholder="e.g., sync-data, cleanup-temp"
                  className={cn(
                    "glass border-orange-500/30 text-white placeholder:text-orange-500/30 font-code",
                    errors.taskType && "border-red-500/50"
                  )}
                />
                {errors.taskType && (
                  <p className="text-red-400 text-xs font-code">{errors.taskType}</p>
                )}
                <p className="text-xs text-orange-500/40 font-code">
                  Must be a registered task type in TaskRegistry
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="input" className="text-orange-500/80 font-code text-sm">
                  Input Parameters (JSON)
                </Label>
                <Textarea
                  id="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='{"target": "/data", "recursive": true}'
                  rows={4}
                  className={cn(
                    "glass border-orange-500/30 text-white placeholder:text-orange-500/30 font-code resize-none font-mono text-sm",
                    errors.input && "border-red-500/50"
                  )}
                />
                {errors.input && (
                  <p className="text-red-400 text-xs font-code">{errors.input}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card className="glass-panel border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-white font-display text-base">Advanced Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-orange-500/80 font-code text-sm">
                  Missed Run Strategy
                </Label>
                <Select
                  value={strategy}
                  onValueChange={(v) => setStrategy(v as MissedTaskStrategy)}
                >
                  <SelectTrigger className="glass border-orange-500/30 text-white font-code">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-orange-500/20">
                    <SelectItem value="skip" className="font-code">
                      <div>
                        <div className="text-white">Skip</div>
                        <div className="text-xs text-orange-500/60">Skip missed runs, start from now</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="run-once" className="font-code">
                      <div>
                        <div className="text-white">Run Once</div>
                        <div className="text-xs text-orange-500/60">Run once to represent all missed</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="run-all" className="font-code">
                      <div>
                        <div className="text-white">Run All</div>
                        <div className="text-xs text-orange-500/60">Execute all missed runs (with limit)</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxRuns" className="text-orange-500/80 font-code text-sm">
                    Max Runs (optional)
                  </Label>
                  <Input
                    id="maxRuns"
                    type="number"
                    value={maxRuns}
                    onChange={(e) => setMaxRuns(e.target.value)}
                    placeholder="∞"
                    min="1"
                    className="glass border-orange-500/30 text-white placeholder:text-orange-500/30 font-code"
                  />
                  <p className="text-xs text-orange-500/40 font-code">
                    Auto-complete after N runs
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxErrors" className="text-orange-500/80 font-code text-sm">
                    Max Consecutive Errors
                  </Label>
                  <Input
                    id="maxErrors"
                    type="number"
                    value={maxErrors}
                    onChange={(e) => setMaxErrors(e.target.value)}
                    placeholder="3"
                    min="1"
                    className="glass border-orange-500/30 text-white placeholder:text-orange-500/30 font-code"
                  />
                  <p className="text-xs text-orange-500/40 font-code">
                    Auto-pause after N errors
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {errors.submit && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-code text-sm">
              {errors.submit}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/crontab' })}
              className="glass border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-code"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white font-code"
            >
              {isSubmitting ? 'CREATING...' : 'CREATE JOB'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
