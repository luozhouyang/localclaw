import { createFileRoute, Link } from '@tanstack/react-router'
import { useCronScheduler } from '@/hooks/use-cron-scheduler'
import { CronParser, CRON_PRESET_DESCRIPTIONS, type CronJob } from '@/crontab'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  Calendar,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/crontab/')({
  component: CrontabPage,
  ssr: false
})

function CrontabPage() {
  const {
    jobs,
    isInitialized,
    stats,
    removeJob,
    pauseJob,
    resumeJob,
    runJobNow,
    refresh
  } = useCronScheduler()

  const getStatusBadge = (job: CronJob) => {
    if (job.status === 'error') {
      return (
        <Badge variant="destructive" className="font-code text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          ERROR
        </Badge>
      )
    }
    if (job.status === 'paused' || !job.enabled) {
      return (
        <Badge variant="secondary" className="font-code text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Pause className="w-3 h-3 mr-1" />
          PAUSED
        </Badge>
      )
    }
    if (job.status === 'completed') {
      return (
        <Badge variant="default" className="font-code text-xs bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          COMPLETED
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="font-code text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
        <Clock className="w-3 h-3 mr-1" />
        ACTIVE
      </Badge>
    )
  }

  const formatTime = (timestamp: number | undefined) => {
    if (!timestamp) return '—'
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScheduleDescription = (schedule: string) => {
    if (CronParser.isPreset(schedule)) {
      return CRON_PRESET_DESCRIPTIONS[schedule as keyof typeof CRON_PRESET_DESCRIPTIONS] || schedule
    }
    return CronParser.getDescription(schedule)
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-50 border-b border-orange-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Clock className="w-8 h-8 text-orange-500" />
                <div className="absolute inset-0 blur-lg bg-orange-500/50 -z-10" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-white glow-orange-text">
                  CRON SCHEDULER
                </h1>
                <p className="text-xs text-orange-500/70 font-code tracking-wider">
                  {stats?.activeJobs || 0} ACTIVE JOBS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refresh()}
                className="glass border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-code"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                REFRESH
              </Button>

              <Button
                asChild
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white font-code"
              >
                <Link to="/crontab/new">
                  <Plus className="w-4 h-4 mr-2" />
                  NEW JOB
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-panel border-orange-500/20">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white font-display">
                {stats?.totalJobs || 0}
              </div>
              <div className="text-xs text-orange-500/70 font-code">TOTAL JOBS</div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-orange-500/20">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-400 font-display">
                {stats?.activeJobs || 0}
              </div>
              <div className="text-xs text-orange-500/70 font-code">ACTIVE</div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-orange-500/20">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-400 font-display">
                {stats?.pausedJobs || 0}
              </div>
              <div className="text-xs text-orange-500/70 font-code">PAUSED</div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-orange-500/20">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-400 font-display">
                {stats?.errorJobs || 0}
              </div>
              <div className="text-xs text-orange-500/70 font-code">ERRORS</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Job List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {!isInitialized ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-orange-500 font-code animate-pulse">INITIALIZING...</div>
          </div>
        ) : jobs.length === 0 ? (
          <Card className="glass-panel border-orange-500/20">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="w-16 h-16 text-orange-500/30 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2 font-display">No Jobs Scheduled</h3>
              <p className="text-sm text-orange-500/60 mb-6 font-code text-center max-w-md">
                Create your first cron job to automate tasks. Jobs will persist even when the browser is closed.
              </p>
              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white font-code">
                <Link to="/crontab/new">
                  <Plus className="w-4 h-4 mr-2" />
                  CREATE JOB
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className={cn(
                  "glass-panel border-orange-500/20 transition-all duration-300",
                  job.status === 'error' && "border-red-500/40 bg-red-500/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white truncate font-display">
                          {job.name}
                        </h3>
                        {getStatusBadge(job)}
                        {job.consecutiveErrors > 0 && (
                          <Badge variant="outline" className="text-xs border-red-500/50 text-red-400 font-code">
                            {job.consecutiveErrors} ERRORS
                          </Badge>
                        )}
                      </div>

                      {job.description && (
                        <p className="text-sm text-orange-500/60 mb-3 line-clamp-1 font-code">
                          {job.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-orange-500/80 font-code">
                          <Calendar className="w-4 h-4" />
                          <span>{getScheduleDescription(job.schedule)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-orange-500/60 font-code">
                          <span className="text-xs">TYPE:</span>
                          <span className="text-orange-400">{job.taskType}</span>
                        </div>

                        {job.runCount > 0 && (
                          <div className="flex items-center gap-2 text-orange-500/60 font-code">
                            <span className="text-xs">RUNS:</span>
                            <span className="text-orange-400">{job.runCount}</span>
                            {job.maxRuns && (
                              <span className="text-xs">/ {job.maxRuns}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 mt-3 text-xs font-code">
                        {job.lastRunAt && (
                          <span className="text-orange-500/50">
                            LAST: <span className="text-orange-400">{formatTime(job.lastRunAt)}</span>
                          </span>
                        )}
                        {job.nextRunAt && job.enabled && (
                          <span className="text-orange-500/50">
                            NEXT: <span className="text-green-400">{formatTime(job.nextRunAt)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {job.enabled && job.status !== 'error' && job.status !== 'completed' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => pauseJob(job.id)}
                          className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => resumeJob(job.id)}
                          disabled={job.status === 'completed'}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => runJobNow(job.id)}
                        disabled={!job.enabled}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-orange-500/60 hover:text-orange-400"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel border-orange-500/20">
                          <DropdownMenuItem
                            onClick={() => removeJob(job.id)}
                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10 font-code"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            DELETE
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
