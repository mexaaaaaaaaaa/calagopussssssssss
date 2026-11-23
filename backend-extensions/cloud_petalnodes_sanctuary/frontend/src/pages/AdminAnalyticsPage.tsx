import React from 'react';
import {
  Activity,
  Cpu,
  Download,
  HardDrive,
  RefreshCw,
  Server,
} from 'lucide-react';
import {
  computeServerOverviewMetrics,
  formatMegabytes,
  formatPercent,
  type AdminDashboardPayload,
  type CalagopusServerSummary,
} from '../api/calagopusDashboard';
import type { CalagopusAdminNode } from '../api/calagopusModules';
import type { CalagopusUserContext } from '../navigation/calagopusRoutes';
import { Button } from '../components/Button';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/FeedbackStates';
import { MiniAreaChart } from '../components/MiniChart';
import { showToast } from '../components/Overlays';
import { StatCard } from '../components/StatCard';
import { Card, PageHeader, StatusBadge } from '../components/Surface';

export interface AdminAnalyticsPageProps {
  user: CalagopusUserContext;
  data: AdminDashboardPayload | null;
  nodes: readonly CalagopusAdminNode[];
  servers: readonly CalagopusServerSummary[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onNavigate: (path: string) => void;
  isLiveMode?: boolean;
}

export function AdminAnalyticsPage({
  user,
  data,
  nodes,
  servers,
  loading = false,
  error = null,
  onRefresh,
  onNavigate,
  isLiveMode = false,
}: AdminAnalyticsPageProps) {
  const [rangeWindow, setRangeWindow] = React.useState<'recent' | 'snapshot'>('recent');

  const canAccessAdmin =
    user.isAdmin || user.permissions.some((p) => p.startsWith('admin.'));

  if (!canAccessAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Infrastructure Analytics"
          description="Cluster capacity and resource consumption metrics."
        />
        <ErrorState
          title="Administrator permission required"
          description="Your account role does not hold administrative privileges for analytics."
          retryLabel="Return to Workspace"
          onRetry={() => onNavigate('/')}
        />
      </div>
    );
  }

  const system = data?.system;
  const serverMetrics = React.useMemo(() => computeServerOverviewMetrics(servers), [servers]);

  const totalNodeMemMb = nodes.reduce((sum, n) => sum + n.memoryMb, 0);
  const allocNodeMemMb = nodes.reduce((sum, n) => sum + n.memoryAllocatedMb, 0);
  const totalNodeDiskMb = nodes.reduce((sum, n) => sum + n.diskMb, 0);
  const allocNodeDiskMb = nodes.reduce((sum, n) => sum + n.diskAllocatedMb, 0);

  const memAllocPct = totalNodeMemMb > 0 ? (allocNodeMemMb / totalNodeMemMb) * 100 : 0;
  const diskAllocPct = totalNodeDiskMb > 0 ? (allocNodeDiskMb / totalNodeDiskMb) * 100 : 0;

  const cpuPoints =
    rangeWindow === 'snapshot' && system?.cpuHistory.length
      ? system.cpuHistory.slice(-2)
      : (system?.cpuHistory ?? []);
  const memPoints =
    rangeWindow === 'snapshot' && system?.memoryHistory.length
      ? system.memoryHistory.slice(-2)
      : (system?.memoryHistory ?? []);

  const handleExportReport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: isLiveMode ? 'live-panel-api' : 'preview-fixture',
      system: system ?? null,
      serverMetrics,
      nodes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petalnodes-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast({
      title: 'Analytics snapshot exported',
      message: 'Downloaded cluster metrics JSON report.',
      tone: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Infrastructure Analytics"
        description="Real-time server activity, node memory and storage capacity, and host telemetry trends."
        metadata={[
          `${nodes.length} Wings nodes`,
          `${servers.length} monitored servers`,
          isLiveMode ? 'Live telemetry' : 'Preview dataset',
        ]}
        actions={
          <>
            {onRefresh ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={onRefresh}
              >
                Refresh
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportReport}
            >
              Export JSON
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState
          title="Unable to fetch analytics"
          description={error}
          onRetry={onRefresh}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Instances"
          value={`${serverMetrics.running}/${serverMetrics.total}`}
          helper={`${serverMetrics.offline} stopped or suspended`}
          progressPercent={
            serverMetrics.total > 0 ? (serverMetrics.running / serverMetrics.total) * 100 : 0
          }
          icon={<Server className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Host CPU Utilization"
          value={system ? formatPercent(system.cpuPercent) : '—'}
          helper={system?.kernel ?? 'Awaiting telemetry'}
          progressPercent={system?.cpuPercent}
          icon={<Cpu className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Cluster RAM Allocated"
          value={formatMegabytes(allocNodeMemMb)}
          helper={`of ${formatMegabytes(totalNodeMemMb)} (${memAllocPct.toFixed(1)}%)`}
          progressPercent={memAllocPct}
          icon={<Activity className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Cluster Disk Allocated"
          value={formatMegabytes(allocNodeDiskMb)}
          helper={`of ${formatMegabytes(totalNodeDiskMb)} (${diskAllocPct.toFixed(1)}%)`}
          progressPercent={diskAllocPct}
          icon={<HardDrive className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Host CPU & Memory History"
          description={
            isLiveMode
              ? 'Displays sampled Calagopus telemetry points from /api/admin/system. Extended multi-day retention requires an external Prometheus backend.'
              : 'Sampled CPU and memory percentage points across the control plane.'
          }
          headerAction={
            <div
              className="inline-flex rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-0.5"
              role="group"
              aria-label="Analytics window"
            >
              {(['recent', 'snapshot'] as const).map((win) => (
                <button
                  key={win}
                  type="button"
                  onClick={() => setRangeWindow(win)}
                  className={`blush-transition blush-focus-ring rounded-md px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                    rangeWindow === win
                      ? 'bg-[var(--calagopus-surface)] text-[var(--calagopus-primary-text)] shadow-xs'
                      : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
                  }`}
                >
                  {win === 'recent' ? 'Recent Samples' : 'Latest Delta'}
                </button>
              ))}
            </div>
          }
        >
          {loading ? (
            <SkeletonBlock lines={5} />
          ) : system && cpuPoints.length >= 2 ? (
            <MiniAreaChart
              series={[
                { name: 'CPU', color: '#F4A6C1', points: cpuPoints },
                { name: 'Memory', color: '#8E7AB5', points: memPoints },
              ]}
            />
          ) : (
            <EmptyState
              title="No historical samples recorded"
              description="Current CPU/RAM metrics are displayed in the cards above; multi-point history appears once sampling accumulates."
            />
          )}
        </Card>

        <Card
          title="Node Capacity Distribution"
          description="Allocated memory and disk ratios per Wings node."
        >
          {nodes.length === 0 ? (
            <EmptyState
              title="No nodes available"
              description="Register a Wings node in Calagopus to monitor capacity."
            />
          ) : (
            <div className="space-y-4">
              {nodes.map((node) => {
                const memPct =
                  node.memoryMb > 0
                    ? Math.min(100, Math.round((node.memoryAllocatedMb / node.memoryMb) * 100))
                    : 0;
                const dskPct =
                  node.diskMb > 0
                    ? Math.min(100, Math.round((node.diskAllocatedMb / node.diskMb) * 100))
                    : 0;

                return (
                  <div
                    key={node.id}
                    className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--calagopus-text)]">
                          {node.name}
                        </p>
                        <p className="text-[11px] text-[var(--calagopus-text-secondary)]">
                          {node.location} · {node.serversCount} servers
                        </p>
                      </div>
                      <StatusBadge
                        tone={node.status === 'online' ? 'success' : 'warning'}
                        label={node.status === 'online' ? 'Online' : 'Maintenance'}
                      />
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between tabular-nums text-[var(--calagopus-text-secondary)]">
                        <span>RAM</span>
                        <span className="font-mono text-[var(--calagopus-text)]">
                          {formatMegabytes(node.memoryAllocatedMb)} / {formatMegabytes(node.memoryMb)} ({memPct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--calagopus-primary-soft)]">
                        <div
                          className="h-full rounded-full bg-[var(--calagopus-primary)]"
                          style={{ width: `${memPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between pt-1 tabular-nums text-[var(--calagopus-text-secondary)]">
                        <span>Disk</span>
                        <span className="font-mono text-[var(--calagopus-text)]">
                          {formatMegabytes(node.diskAllocatedMb)} / {formatMegabytes(node.diskMb)} ({dskPct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--calagopus-primary-soft)]">
                        <div
                          className="h-full rounded-full bg-[#8E7AB5]"
                          style={{ width: `${dskPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
