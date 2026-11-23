import React from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import type { PanelNotificationItem } from '../utils/panelEnhancements';
import { Button } from '../components/Button';
import { EmptyState } from '../components/FeedbackStates';
import { SelectDropdown } from '../components/FormControls';
import { Card, PageHeader, StatusBadge } from '../components/Surface';

export interface NotificationsPageProps {
  notifications: readonly PanelNotificationItem[];
  readIds: readonly string[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (path: string) => void;
}

export function NotificationsPage({
  notifications,
  readIds,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: NotificationsPageProps) {
  const [readFilter, setReadFilter] = React.useState<'all' | 'unread' | 'read'>('all');
  const [severityFilter, setSeverityFilter] = React.useState<
    'all' | PanelNotificationItem['severity']
  >('all');

  const readSet = React.useMemo(() => new Set(readIds), [readIds]);

  const filtered = React.useMemo(() => {
    return notifications.filter((n) => {
      const isRead = readSet.has(n.id);
      if (readFilter === 'unread' && isRead) return false;
      if (readFilter === 'read' && !isRead) return false;
      if (severityFilter !== 'all' && n.severity !== severityFilter) return false;
      return true;
    });
  }, [notifications, readFilter, severityFilter, readSet]);

  const unreadCount = notifications.filter((n) => !readSet.has(n.id)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Center"
        description="Real-time alerts derived strictly from server telemetry, security state, and recent panel activity."
        metadata={[`${notifications.length} total`, `${unreadCount} unread`]}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCheck className="h-4 w-4" />}
              onClick={onMarkAllRead}
            >
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      <Card
        title="Notification Feed"
        headerAction={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-36">
              <SelectDropdown
                aria-label="Filter by read status"
                value={readFilter}
                onChange={(val) => setReadFilter((val as 'all' | 'unread' | 'read') ?? 'all')}
                data={[
                  { value: 'all', label: 'All messages' },
                  { value: 'unread', label: 'Unread only' },
                  { value: 'read', label: 'Read only' },
                ]}
              />
            </div>
            <div className="w-full sm:w-36">
              <SelectDropdown
                aria-label="Filter by severity"
                value={severityFilter}
                onChange={(val) =>
                  setSeverityFilter(
                    (val as 'all' | PanelNotificationItem['severity']) ?? 'all',
                  )
                }
                data={[
                  { value: 'all', label: 'All levels' },
                  { value: 'danger', label: 'Critical' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'info', label: 'Activity / Info' },
                  { value: 'success', label: 'Success' },
                ]}
              />
            </div>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title="No notifications to display"
            description={
              notifications.length === 0
                ? 'Panel events and resource warnings will appear here automatically.'
                : 'No items match your active read/level filters.'
            }
            actionLabel={
              readFilter !== 'all' || severityFilter !== 'all' ? 'Reset Filters' : undefined
            }
            onAction={
              readFilter !== 'all' || severityFilter !== 'all'
                ? () => {
                    setReadFilter('all');
                    setSeverityFilter('all');
                  }
                : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--calagopus-border)]">
            {filtered.map((item) => {
              const isRead = readSet.has(item.id);
              const tone =
                item.severity === 'danger'
                  ? 'danger'
                  : item.severity === 'warning'
                    ? 'warning'
                    : item.severity === 'success'
                      ? 'success'
                      : 'pink';
              return (
                <li
                  key={item.id}
                  className={`flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                    isRead ? 'opacity-70' : ''
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        tone={tone}
                        label={item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
                      />
                      <span className="text-[13px] font-semibold text-[var(--calagopus-text)]">
                        {item.title}
                      </span>
                      {!isRead ? (
                        <span className="text-[11px] font-medium text-[var(--calagopus-primary-text)]">
                          · Unread
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[12.5px] text-[var(--calagopus-text-secondary)]">
                      {item.description}
                    </p>
                    <p className="font-mono text-[11px] text-[var(--calagopus-text-secondary)]">
                      {item.timestamp}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isRead ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                        onClick={() => onMarkRead(item.id)}
                      >
                        Mark Read
                      </Button>
                    ) : null}
                    {item.targetPath ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onMarkRead(item.id);
                          onNavigate(item.targetPath!);
                        }}
                      >
                        Inspect
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
