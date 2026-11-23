import React from 'react';
import { Activity, Download } from 'lucide-react';
import { paginateSlice } from '../api/calagopusCore';
import type { CalagopusActivityEntry } from '../api/calagopusDashboard';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState } from '../components/FeedbackStates';
import { SearchField, SelectDropdown } from '../components/FormControls';
import { Pagination } from '../components/Navigation';
import { showToast } from '../components/Overlays';
import { Card, PageHeader, StatusBadge } from '../components/Surface';

export interface ActivityLogPageProps {
  title: string;
  description: string;
  entries: readonly CalagopusActivityEntry[];
  compact?: boolean;
}

const PAGE_SIZE = 6;

export function ActivityLogPage({ title, description, entries, compact = false }: ActivityLogPageProps) {
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'completed' | 'warning' | 'failed'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<'all' | 'server' | 'auth' | 'admin'>('all');
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && !entry.event.toLowerCase().startsWith(`${categoryFilter}:`)) {
        return false;
      }
      if (!q) return true;
      return (
        entry.event.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q) ||
        entry.ipAddress.toLowerCase().includes(q) ||
        entry.timestamp.toLowerCase().includes(q)
      );
    });
  }, [entries, query, statusFilter, categoryFilter]);

  const { pageItems, safePage } = React.useMemo(
    () => paginateSlice(filtered, page, PAGE_SIZE),
    [filtered, page],
  );

  const handleExportCsv = () => {
    const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = [
      ['Timestamp', 'Event', 'Description', 'Actor', 'IP Address', 'Status'].join(','),
      ...filtered.map((e) =>
        [
          escapeCell(e.timestamp),
          escapeCell(e.event),
          escapeCell(e.description),
          escapeCell(e.actor),
          escapeCell(e.ipAddress),
          escapeCell(e.status),
        ].join(','),
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petalnodes-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast({
      title: 'Activity exported',
      message: `Exported ${filtered.length} events to CSV.`,
      tone: 'success',
    });
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petalnodes-activity-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast({
      title: 'Activity exported',
      message: `Exported ${filtered.length} events to JSON.`,
      tone: 'success',
    });
  };

  const columns: readonly TableColumn<CalagopusActivityEntry>[] = [
    {
      key: 'description',
      header: 'Event',
      render: (entry) => (
        <div>
          <p className="font-medium text-[var(--calagopus-text)]">{entry.description}</p>
          <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">{entry.event}</p>
        </div>
      ),
    },
    { key: 'actor', header: 'Actor' },
    { key: 'ipAddress', header: 'Source IP', numeric: true },
    { key: 'timestamp', header: 'Timestamp', numeric: true },
    {
      key: 'status',
      header: 'Status',
      render: (entry) => (
        <StatusBadge
          tone={
            entry.status === 'completed'
              ? 'success'
              : entry.status === 'warning'
                ? 'warning'
                : 'danger'
          }
          label={entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
        />
      ),
    },
  ];

  const hasFilters = query.trim().length > 0 || statusFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        metadata={[`${entries.length} logged events`]}
        actions={
          filtered.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                onClick={handleExportCsv}
              >
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                onClick={handleExportJson}
              >
                Export JSON
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card
        title="Audit Trail"
        description="Search events by action, actor, date, or IP address."
        headerAction={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-52">
              <SearchField
                aria-label="Filter activity logs"
                placeholder="Search event, actor, date, IP..."
                value={query}
                onChange={(val) => {
                  setQuery(val);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-full sm:w-36">
              <SelectDropdown
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(val) => {
                  setCategoryFilter((val as 'all' | 'server' | 'auth' | 'admin') ?? 'all');
                  setPage(1);
                }}
                data={[
                  { value: 'all', label: 'All scopes' },
                  { value: 'server', label: 'Server' },
                  { value: 'auth', label: 'Auth & Keys' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
            </div>
            <div className="w-full sm:w-32">
              <SelectDropdown
                aria-label="Filter by outcome"
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter((val as 'all' | 'completed' | 'warning' | 'failed') ?? 'all');
                  setPage(1);
                }}
                data={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <DataTable
            caption="Activity Log"
            columns={columns}
            rows={pageItems}
            compact={compact}
            emptyState={
              <EmptyState
                icon={<Activity className="h-5 w-5" />}
                title="No activity records found"
                description="Try clearing the search query or status filter."
                actionLabel={hasFilters ? 'Reset Filters' : undefined}
                onAction={
                  hasFilters
                    ? () => {
                        setQuery('');
                        setStatusFilter('all');
                        setCategoryFilter('all');
                        setPage(1);
                      }
                    : undefined
                }
              />
            }
          />
          {filtered.length > 0 ? (
            <Pagination
              currentPage={safePage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
