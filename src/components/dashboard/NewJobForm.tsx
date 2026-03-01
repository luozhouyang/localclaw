import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCronScheduler } from '@/hooks/use-cron-scheduler';
import { CronParser, CRON_PRESETS } from '@/crontab';
import { Clock, Loader2 } from 'lucide-react';

interface NewJobFormProps {
  onSuccess?: () => void;
}

export function NewJobForm({ onSuccess }: NewJobFormProps) {
  const { addJob } = useCronScheduler();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState('summary');
  const [schedule, setSchedule] = useState('@hourly');
  const [customSchedule, setCustomSchedule] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetOptions = Object.entries(CRON_PRESETS).map(([preset, expression]) => ({
    value: preset,
    label: `${preset} (${expression})`,
  }));

  const taskTypes = [
    { value: 'summary', label: 'Summary Generation' },
    { value: 'backup', label: 'Backup Task' },
    { value: 'sync', label: 'Sync Task' },
    { value: 'cleanup', label: 'Cleanup Task' },
    { value: 'custom', label: 'Custom Task' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Job name is required');
      return;
    }

    const finalSchedule = schedule === 'custom' ? customSchedule : schedule;

    // Validate schedule
    const validation = CronParser.validate(finalSchedule);
    if (!validation.valid) {
      setError(`Invalid schedule: ${validation.error}`);
      return;
    }

    setIsSubmitting(true);

    try {
      await addJob({
        name: name.trim(),
        description: description.trim() || undefined,
        taskType,
        schedule: finalSchedule,
        enabled,
        input: {},
        priority: 'normal',
        missedRunStrategy: 'run-once',
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-code">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-white font-code">
          Job Name *
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Daily Summary"
          className="bg-black/50 border-orange-500/30 text-white font-code placeholder:text-orange-500/40"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-white font-code">
          Description
        </Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of what this job does"
          className="bg-black/50 border-orange-500/30 text-white font-code placeholder:text-orange-500/40"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskType" className="text-white font-code">
          Task Type
        </Label>
        <Select value={taskType} onValueChange={setTaskType}>
          <SelectTrigger className="bg-black/50 border-orange-500/30 text-white font-code">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-panel border-orange-500/20">
            {taskTypes.map((type) => (
              <SelectItem
                key={type.value}
                value={type.value}
                className="text-white font-code focus:bg-orange-500/20 focus:text-white"
              >
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule" className="text-white font-code">
          Schedule
        </Label>
        <Select value={schedule} onValueChange={setSchedule}>
          <SelectTrigger className="bg-black/50 border-orange-500/30 text-white font-code">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-panel border-orange-500/20">
            {presetOptions.map((preset) => (
              <SelectItem
                key={preset.value}
                value={preset.value}
                className="text-white font-code focus:bg-orange-500/20 focus:text-white"
              >
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem
              value="custom"
              className="text-white font-code focus:bg-orange-500/20 focus:text-white"
            >
              Custom Cron Expression
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {schedule === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="customSchedule" className="text-white font-code">
            Cron Expression *
          </Label>
          <div className="flex gap-2">
            <Input
              id="customSchedule"
              value={customSchedule}
              onChange={(e) => setCustomSchedule(e.target.value)}
              placeholder="0 0 * * *"
              className="bg-black/50 border-orange-500/30 text-white font-code placeholder:text-orange-500/40"
            />
          </div>
          <p className="text-xs text-orange-500/60 font-code">
            Format: minute hour day month dayOfWeek (e.g., "0 9 * * 1" for every Monday at 9am)
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Label htmlFor="enabled" className="text-white font-code cursor-pointer">
            Enable immediately
          </Label>
        </div>
      </div>

      {schedule !== 'custom' && (
        <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 text-sm text-orange-400 font-code">
            <Clock className="w-4 h-4" />
            <span>
              Next run:{' '}
              {new Date(CronParser.getNextRunTime(schedule)).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-orange-500 hover:bg-orange-600 text-white font-code"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              CREATING...
            </>
          ) : (
            'CREATE JOB'
          )}
        </Button>
      </div>
    </form>
  );
}
