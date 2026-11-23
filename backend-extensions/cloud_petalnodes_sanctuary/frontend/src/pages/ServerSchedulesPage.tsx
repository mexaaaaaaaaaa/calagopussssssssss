import React from 'react';
import { Clock, Play, Plus, Trash2 } from 'lucide-react';
import type { CalagopusServerDetail } from '../api/calagopusCore';
import {
  formatCronSummary,
  validateScheduleInput,
  type CalagopusScheduleRecord,
  type CalagopusScheduleTask,
} from '../api/calagopusModules';
import { Button } from '../components/Button';
import { EmptyState } from '../components/FeedbackStates';
import { Checkbox, SelectDropdown, TextInput } from '../components/FormControls';
import { ConfirmDialog, ModalDialog, showToast } from '../components/Overlays';
import { Card, PageHeader, StatusBadge } from '../components/Surface';

export interface ServerSchedulesPageProps {
  server: CalagopusServerDetail;
  schedules: readonly CalagopusScheduleRecord[];
  onCreateSchedule: (input: {
    name: string;
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
    onlyWhenOnline: boolean;
    taskAction: CalagopusScheduleTask['action'];
    taskPayload: string;
  }) => Promise<void> | void;
  onToggleScheduleActive: (scheduleId: string) => Promise<void> | void;
  onRunScheduleNow: (scheduleId: string) => Promise<void> | void;
  onDeleteSchedule: (scheduleId: string) => Promise<void> | void;
  confirmDestructive?: boolean;
}

export function ServerSchedulesPage({
  server,
  schedules,
  onCreateSchedule,
  onToggleScheduleActive,
  onRunScheduleNow,
  onDeleteSchedule,
  confirmDestructive = true,
}: ServerSchedulesPageProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [minute, setMinute] = React.useState('0');
  const [hour, setHour] = React.useState('*/6');
  const [dayOfMonth, setDayOfMonth] = React.useState('*');
  const [month, setMonth] = React.useState('*');
  const [dayOfWeek, setDayOfWeek] = React.useState('*');
  const [onlyWhenOnline, setOnlyWhenOnline] = React.useState(true);
  const [taskAction, setTaskAction] = React.useState<CalagopusScheduleTask['action']>('command');
  const [taskPayload, setTaskPayload] = React.useState('save-all');
  const [formErrors, setFormErrors] = React.useState<{ nameError?: string; cronError?: string }>(
    {},
  );
  const [deleteTarget, setDeleteTarget] = React.useState<CalagopusScheduleRecord | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateScheduleInput({ name, minute, hour, dayOfMonth, month, dayOfWeek });
    if (errs.nameError || errs.cronError) {
      setFormErrors(errs);
      return;
    }
    const cleanName = name.trim();
    try {
      await Promise.resolve(
        onCreateSchedule({
          name: cleanName,
          minute: minute.trim(),
          hour: hour.trim(),
          dayOfMonth: dayOfMonth.trim(),
          month: month.trim(),
          dayOfWeek: dayOfWeek.trim(),
          onlyWhenOnline,
          taskAction,
          taskPayload: taskPayload.trim() || 'save-all',
        }),
      );
      showToast({
        title: 'Schedule created',
        message: `${cleanName} (${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek})`,
        tone: 'success',
      });
      setCreateOpen(false);
      setName('');
      setFormErrors({});
    } catch {
      // Error surfaced by caller
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        description={`Automate recurring commands, power actions, and backups on ${server.name}.`}
        metadata={[`${schedules.length} schedules configured`]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Create Schedule
          </Button>
        }
      />

      {schedules.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-5 w-5" />}
          title="No scheduled tasks"
          description="Create a cron schedule to run console commands, restarts, or backups automatically."
          actionLabel="Create Schedule"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <Card
              key={schedule.id}
              title={schedule.name}
              description={`Cron: ${formatCronSummary(schedule)} · Next run ${schedule.nextRunAt}`}
              headerAction={
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    tone={schedule.isActive ? 'success' : 'neutral'}
                    label={schedule.isActive ? 'Enabled' : 'Paused'}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        await Promise.resolve(onToggleScheduleActive(schedule.id));
                      } catch {
                        // Error surfaced by caller
                      }
                    }}
                  >
                    {schedule.isActive ? 'Pause' : 'Enable'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Play className="h-3.5 w-3.5" />}
                    onClick={async () => {
                      try {
                        await Promise.resolve(onRunScheduleNow(schedule.id));
                        showToast({
                          title: 'Schedule triggered',
                          message: `Executed "${schedule.name}" on ${server.name}.`,
                          tone: 'success',
                        });
                      } catch {
                        // Error surfaced by caller
                      }
                    }}
                  >
                    Run Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete schedule ${schedule.name}`}
                    leftIcon={<Trash2 className="h-3.5 w-3.5 text-[var(--calagopus-danger-text)]" />}
                    onClick={async () => {
                      if (confirmDestructive) {
                        setDeleteTarget(schedule);
                      } else {
                        try {
                          await Promise.resolve(onDeleteSchedule(schedule.id));
                          showToast({
                            title: 'Schedule deleted',
                            message: `${schedule.name} was removed.`,
                            tone: 'success',
                          });
                        } catch {
                          // Error surfaced by caller
                        }
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              }
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--calagopus-text-secondary)]">
                  <span>Last run: {schedule.lastRunAt ?? 'Never'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{schedule.onlyWhenOnline ? 'Runs only when server is online' : 'Runs regardless of power state'}</span>
                </div>

                <div className="divide-y divide-[var(--calagopus-border)] rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)]">
                  {schedule.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-[13px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-[var(--calagopus-primary-text)]">
                          #{task.sequenceId}
                        </span>
                        <span className="capitalize font-medium text-[var(--calagopus-text)]">{task.action}</span>
                        <code className="truncate font-mono text-[12px] text-[var(--calagopus-text-secondary)]">
                          {task.payload || '(default)'}
                        </code>
                      </div>
                      <span className="font-mono text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
                        +{task.timeOffsetSeconds}s delay
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ModalDialog
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Cron Schedule"
        description="Define a 5-field cron expression and an initial task."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Schedule Name"
            placeholder="e.g. Hourly World Flush"
            required
            value={name}
            error={formErrors.nameError}
            onChange={(e) => {
              setName(e.currentTarget.value);
              setFormErrors((prev) => ({ ...prev, nameError: undefined }));
            }}
          />

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <TextInput label="Min" value={minute} onChange={(e) => setMinute(e.currentTarget.value)} />
            <TextInput label="Hour" value={hour} onChange={(e) => setHour(e.currentTarget.value)} />
            <TextInput label="Day" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.currentTarget.value)} />
            <TextInput label="Month" value={month} onChange={(e) => setMonth(e.currentTarget.value)} />
            <TextInput label="Weekday" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.currentTarget.value)} />
          </div>
          {formErrors.cronError ? (
            <p className="text-[12px] font-medium text-[var(--calagopus-danger-text)]">{formErrors.cronError}</p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectDropdown
              label="Initial Task Action"
              value={taskAction}
              onChange={(val) =>
                setTaskAction((val as CalagopusScheduleTask['action']) ?? 'command')
              }
              data={[
                { value: 'command', label: 'Send Command' },
                { value: 'power', label: 'Power Signal' },
                { value: 'backup', label: 'Create Backup' },
              ]}
            />
            <TextInput
              label="Task Payload"
              value={taskPayload}
              onChange={(e) => setTaskPayload(e.currentTarget.value)}
            />
          </div>

          <Checkbox
            label="Only run when server is online"
            checked={onlyWhenOnline}
            onChange={(e) => setOnlyWhenOnline(e.currentTarget.checked)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Schedule
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ConfirmDialog
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            try {
              await Promise.resolve(onDeleteSchedule(deleteTarget.id));
              showToast({
                title: 'Schedule deleted',
                message: `${deleteTarget.name} was removed.`,
                tone: 'success',
              });
            } catch {
              // Error surfaced by caller
            }
          }
          setDeleteTarget(null);
        }}
        title="Delete Schedule"
        message={`Delete schedule "${deleteTarget?.name}" and its queued tasks?`}
        confirmLabel="Delete Schedule"
        destructive
      />
    </div>
  );
}
