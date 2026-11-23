import React from 'react';
import {
  ArrowUpRight,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  Puzzle,
  Server,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  formatMegabytes,
  formatPercent,
  type AdminDashboardPayload,
  type CalagopusActivityEntry,
} from '../api/calagopusDashboard';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/FeedbackStates';
import { MiniAreaChart } from '../components/MiniChart';
import { StatCard } from '../components/StatCard';
import { Card, PageHeader, StatusBadge } from '../components/Surface';
import type { CalagopusUserContext } from '../navigation/calagopusRoutes';

export interface AdminDashboardPageProps {
  user: CalagopusUserContext;
  data: AdminDashboardPayload | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigate: (path: string) => void;
  dataSourceLabel?: string;
  compact?: boolean;
}

export function AdminDashboardPage({
  user,
  data,
  loading,
  error,
  onRetry,
  onNavigate,
  dataSourceLabel,
  compact = false,
}: AdminDashboardPageProps) {
  const canAccessAdmin =
    user.isAdmin || user.permissions.some((p) => p.startsWith('admin.'));

  if (!canAccessAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Administration Overview"
          description="System-wide telemetry and infrastructure controls."
        />
        <ErrorState
          title="Administrator permission required"
          description="Your current account role does not hold administrative privileges for /admin."
          retryLabel="Return to Workspace"
          onRetry={() => onNavigate('/')}
        />
      </div>
    );
  }

  const system = data?.system;
  const auditLogs = data?.auditLogs ?? [];

  const memoryPercent =
    system && system.memoryTotalMb > 0
      ? (system.memoryUsedMb / system.memoryTotalMb) * 100
      : 0;

  const auditColumns: readonly TableColumn<CalagopusActivityEntry>[] = [
    {
      key: 'description',
      header: 'Audit Event',
      render: (entry) => (
        <div>
          <p className="font-medium text-[var(--calagopus-text)]">{entry.description}</p>
          <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">{entry.event}</p>
        </div>
      ),
    },
    { key: 'actor', header: 'Actor' },
    { key: 'ipAddress', header: 'Node / IP', numeric: true },
    { key: 'timestamp', header: 'Timestamp', numeric: true },
    {
      key: 'status',
      header: 'Status',
      render: (entry) => (
        <StatusBadge
          tone={entry.status === 'completed' ? 'success' : 'warning'}
          label={entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration Overview"
        description="Petalnodes cluster health, node capacity, cache efficiency, and panel audit events."
        metadata={
          system
            ? [
                `Petalnodes · Calagopus ${system.panelVersion}`,
                system.postgresVersion,
                system.cacheEngine,
                ...(dataSourceLabel ? [dataSourceLabel] : []),
              ]
            : dataSourceLabel
              ? [dataSourceLabel]
              : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Database className="h-4 w-4" />}
              onClick={() => onNavigate('/admin/analytics')}
            >
              Analytics
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Puzzle className="h-4 w-4" />}
              onClick={() => onNavigate('/admin/extensions')}
            >
              Extensions
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState
          title="Unable to load admin telemetry"
          description={error}
          onRetry={onRetry}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Host CPU Utilization"
          value={system ? formatPercent(system.cpuPercent) : '—'}
          helper={system?.kernel}
          progressPercent={system?.cpuPercent}
          icon={<Cpu className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Host Memory Usage"
          value={system ? formatMegabytes(system.memoryUsedMb) : '—'}
          helper={
            system
              ? `of ${formatMegabytes(system.memoryTotalMb)} (${memoryPercent.toFixed(1)}%)`
              : undefined
          }
          progressPercent={memoryPercent}
          icon={<HardDrive className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Cache Hit Rate"
          value={system ? formatPercent(system.cacheHitRate) : '—'}
          helper={system?.cacheEngine}
          progressPercent={system?.cacheHitRate}
          icon={<Database className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Active Infrastructure"
          value={system ? `${system.nodesOnline}/${system.nodesTotal} Nodes` : '—'}
          helper={
            system
              ? `${system.totalServers} servers · ${system.totalUsers} users`
              : undefined
          }
          icon={<Server className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="System Utilization Trend"
          description="Recent CPU and memory percentage samples across the control plane."
        >
          {loading ? (
            <SkeletonBlock lines={5} />
          ) : system ? (
            <MiniAreaChart
              series={[
                { name: 'CPU', color: '#F4A6C1', points: system.cpuHistory },
                { name: 'Memory', color: '#8E7AB5', points: system.memoryHistory },
              ]}
            />
          ) : (
            <EmptyState
              title="Telemetry unavailable"
              description="System metrics are not loaded yet."
              actionLabel="Reload Metrics"
              onAction={onRetry}
            />
          )}
        </Card>

        <Card
          title="Admin Shortcuts"
          description="Jump directly to core administrative configuration areas."
        >
          <div className="space-y-2.5">
            {[
              { label: 'Nodes', desc: 'Wings daemon hosts & capacity', path: '/admin/nodes', icon: <Cpu className="h-4 w-4" /> },
              { label: 'Locations & Allocations', desc: 'Regions & IP/port pool', path: '/admin/allocations', icon: <Globe className="h-4 w-4" /> },
              { label: 'Egg Library', desc: '36 Eggs across 3 repositories', path: '/admin/nests', icon: <Layers className="h-4 w-4" /> },
              { label: 'Infrastructure Analytics', desc: 'Resource growth & reports', path: '/admin/analytics', icon: <Database className="h-4 w-4" /> },
              { label: 'Users & Roles', desc: 'RBAC & permissions', path: '/admin/users', icon: <Users className="h-4 w-4" /> },
              { label: 'Audit Logs', desc: 'Security trail', path: '/admin/audit-logs', icon: <ShieldAlert className="h-4 w-4" /> },
            ].map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className="blush-transition blush-focus-ring flex w-full items-center justify-between rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3.5 py-2.5 text-left hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] cursor-pointer"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="block min-w-0">
                    <span className="block text-[13px] font-medium text-[var(--calagopus-text)] leading-tight">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-[var(--calagopus-text-secondary)] truncate">{item.desc}</span>
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-[var(--calagopus-text-secondary)] shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Recent Admin Audit Logs"
        description="System-level administrative actions and node health events."
        headerAction={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('/admin/audit-logs')}>
            All Logs
          </Button>
        }
      >
        {loading ? (
          <SkeletonBlock lines={4} />
        ) : (
          <DataTable
            caption="Admin Audit Logs"
            columns={auditColumns}
            rows={auditLogs}
            compact={compact}
            emptyState={
              <EmptyState
                title="No audit events recorded"
                description="Administrative events will appear here as actions occur."
              />
            }
          />
        )}
      </Card>
    </div>
  );
}
