import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Clock,
  Cpu,
  HardDrive,
  Key,
  LayoutGrid,
  List,
  Power,
  RotateCcw,
  Server,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  User,
} from 'lucide-react';
import { paginateSlice, type ServerPowerAction } from '../api/calagopusCore';
import {
  computeServerOverviewMetrics,
  formatMegabytes,
  formatPercent,
  type CalagopusActivityEntry,
  type CalagopusServerSummary,
  type ClientDashboardPayload,
} from '../api/calagopusDashboard';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  SkeletonBlock,
} from '../components/FeedbackStates';
import { SearchField, SelectDropdown, SwitchInput } from '../components/FormControls';
import { Pagination } from '../components/Navigation';
import { ConfirmDialog, ModalDialog } from '../components/Overlays';
import { PetalIslandShowcaseCard } from '../components/PetalIslandShowcaseCard';
import { ServerCard } from '../components/ServerCard';
import { StatCard } from '../components/StatCard';
import { Card, PageHeader, ProfileBadge, StatusBadge } from '../components/Surface';
import type { CalagopusUserContext } from '../navigation/calagopusRoutes';
import {
  filterAndSortServers,
  type ServerCategoryFilter,
  type ServerStatusFilter,
} from '../utils/panelEnhancements';
import {
  DEFAULT_DASHBOARD_WIDGETS,
  loadDashboardWidgets,
  saveDashboardWidgets,
  type DashboardWidgetId,
  type DashboardWidgetPreference,
} from '../utils/pwa';
import type { SortDirection } from '../utils/themeHelpers';

export type DashboardServerLayout = 'grid' | 'table';

const LAYOUT_STORAGE_KEY = 'petalnodes.dashboard.serverLayout';

export interface ClientDashboardPageProps {
  user: CalagopusUserContext;
  data: ClientDashboardPayload | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigate: (path: string) => void;
  onServerPowerAction?: (serverId: string, action: ServerPowerAction) => void;
  favoriteServerIds?: readonly string[];
  recentServerIds?: readonly string[];
  onToggleFavorite?: (serverId: string) => void;
  customBanners?: Record<string, string>;
  onSaveCustomBanner?: (serverId: string, dataUri: string | null) => void;
  serverUptimeMap?: Record<string, number>;
  dataSourceLabel?: string;
  twoFactorEnabled?: boolean;
  compact?: boolean;
  confirmDestructive?: boolean;
  onOpenShortcuts?: () => void;
}

function getServerStatusTone(state: CalagopusServerSummary['state']) {
  if (state === 'running') return 'success' as const;
  if (state === 'starting' || state === 'stopping') return 'warning' as const;
  if (state === 'suspended') return 'danger' as const;
  return 'neutral' as const;
}

function resolveInitialLayout(): DashboardServerLayout {
  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved === 'grid' || saved === 'table') return saved;
  } catch {
    // Ignore storage read restrictions
  }
  return 'grid';
}

export function ClientDashboardPage({
  user,
  data,
  loading,
  error,
  onRetry,
  onNavigate,
  onServerPowerAction,
  favoriteServerIds = [],
  recentServerIds = [],
  onToggleFavorite,
  customBanners = {},
  onSaveCustomBanner,
  serverUptimeMap = {},
  dataSourceLabel,
  twoFactorEnabled,
  compact = false,
  confirmDestructive = true,
  onOpenShortcuts,
}: ClientDashboardPageProps) {
  const [onboardingDismissed, setOnboardingDismissed] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem('petalnodes.onboarding.dismissed.v1') === 'true';
    } catch {
      return false;
    }
  });
  const isTwoFactorEnabled = twoFactorEnabled ?? user.twoFactorEnabled ?? false;
  const [serverQuery, setServerQuery] = React.useState('');
  const [stateFilter, setStateFilter] = React.useState<ServerStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<ServerCategoryFilter>('all');
  const [sortKey, setSortKey] = React.useState<keyof CalagopusServerSummary & string>('name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
  const [serverPage, setServerPage] = React.useState(1);
  const [layoutMode, setLayoutMode] = React.useState<DashboardServerLayout>(resolveInitialLayout);
  const [pendingStopServer, setPendingStopServer] = React.useState<CalagopusServerSummary | null>(
    null,
  );
  const [widgets, setWidgets] = React.useState<DashboardWidgetPreference[]>(() =>
    loadDashboardWidgets(),
  );
  const [customizeOpen, setCustomizeOpen] = React.useState(false);

  const servers = data?.servers ?? [];
  const activity = data?.activity ?? [];

  const favoriteSet = React.useMemo(() => new Set(favoriteServerIds), [favoriteServerIds]);
  const favoriteServers = React.useMemo(
    () => servers.filter((srv) => favoriteSet.has(srv.uuidShort)),
    [servers, favoriteSet],
  );
  const recentServers = React.useMemo(
    () =>
      recentServerIds
        .map((id) => servers.find((srv) => srv.uuidShort === id))
        .filter((srv): srv is CalagopusServerSummary => Boolean(srv)),
    [servers, recentServerIds],
  );

  const updateWidgets = (next: DashboardWidgetPreference[]) => {
    setWidgets(next);
    saveDashboardWidgets(next);
  };

  const toggleWidgetVisible = (id: DashboardWidgetId) => {
    updateWidgets(widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };

  const moveWidget = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    updateWidgets(next);
  };

  const metrics = React.useMemo(() => computeServerOverviewMetrics(servers), [servers]);

  const filteredServers = React.useMemo(
    () =>
      filterAndSortServers(servers, {
        query: serverQuery,
        stateFilter,
        categoryFilter,
        sortKey,
        sortDirection,
      }),
    [servers, serverQuery, stateFilter, categoryFilter, sortKey, sortDirection],
  );

  const pageSize = layoutMode === 'grid' ? 6 : 4;
  const { pageItems: pagedServers, safePage: safeServerPage } = React.useMemo(
    () => paginateSlice(filteredServers, serverPage, pageSize),
    [filteredServers, serverPage, pageSize],
  );

  const handleSort = (key: keyof CalagopusServerSummary & string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'cpuPercent' || key === 'memoryUsedMb' ? 'desc' : 'asc');
    }
    setServerPage(1);
  };

  const changeLayoutMode = (next: DashboardServerLayout) => {
    setLayoutMode(next);
    setServerPage(1);
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
  };

  const triggerCardPowerAction = (serverId: string, action: ServerPowerAction) => {
    if (!onServerPowerAction) return;
    if (action === 'stop' && confirmDestructive) {
      const target = servers.find((s) => s.uuidShort === serverId) ?? null;
      if (target) {
        setPendingStopServer(target);
        return;
      }
    }
    onServerPowerAction(serverId, action);
  };

  const canAccessAdmin =
    user.isAdmin || user.permissions.some((p) => p.startsWith('admin.'));

  const hasActiveFilters =
    serverQuery.trim().length > 0 || stateFilter !== 'all' || categoryFilter !== 'all';

  const resetAllFilters = () => {
    setServerQuery('');
    setStateFilter('all');
    setCategoryFilter('all');
    setServerPage(1);
  };

  const serverColumns: readonly TableColumn<CalagopusServerSummary>[] = [
    {
      key: 'name',
      header: 'Server',
      sortable: true,
      render: (srv) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--calagopus-text)] truncate">{srv.name}</p>
          <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
            {srv.uuidShort} · {srv.eggName}
          </p>
        </div>
      ),
    },
    {
      key: 'node',
      header: 'Node & Address',
      sortable: true,
      render: (srv) => (
        <div className="min-w-0">
          <p className="text-[13px] text-[var(--calagopus-text)]">{srv.node}</p>
          <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
            {srv.allocation}
          </p>
        </div>
      ),
    },
    {
      key: 'cpuPercent',
      header: 'CPU',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (srv) => formatPercent(srv.cpuPercent),
    },
    {
      key: 'memoryUsedMb',
      header: 'Memory',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (srv) =>
        `${formatMegabytes(srv.memoryUsedMb)} / ${formatMegabytes(srv.memoryLimitMb)}`,
    },
    {
      key: 'state',
      header: 'Status',
      sortable: true,
      render: (srv) => (
        <StatusBadge
          tone={getServerStatusTone(srv.state)}
          label={srv.state.charAt(0).toUpperCase() + srv.state.slice(1)}
        />
      ),
    },
  ];

  const activityColumns: readonly TableColumn<CalagopusActivityEntry>[] = [
    {
      key: 'description',
      header: 'Event',
      render: (entry) => (
        <div>
          <p className="font-medium text-[var(--calagopus-text)]">{entry.description}</p>
          <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">
            {entry.event}
          </p>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
    },
    {
      key: 'ipAddress',
      header: 'Source IP',
      numeric: true,
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      numeric: true,
    },
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

  return (
    <div className="blush-page-enter space-y-6">
      <PageHeader
        title={`Welcome back, ${user.username}`}
        description="Overview of your Petalnodes server instances, resource allocations, and recent account activity."
        metadata={
          dataSourceLabel
            ? [user.email, user.isAdmin ? 'Administrator' : 'Member', dataSourceLabel]
            : [user.email, user.isAdmin ? 'Administrator' : 'Member']
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
            <div className="w-full sm:w-52">
              <SearchField
                aria-label="Quick search servers"
                placeholder="Search servers..."
                value={serverQuery}
                onChange={(val) => {
                  setServerQuery(val);
                  setServerPage(1);
                }}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={() => setCustomizeOpen(true)}
            >
              Widgets
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Key className="h-4 w-4" />}
              onClick={() => onNavigate('/account/api-keys')}
            >
              API Keys
            </Button>
            {onOpenShortcuts ? (
              <Button variant="secondary" size="sm" aria-label="Keyboard shortcuts" onClick={onOpenShortcuts}>
                Shortcuts (?)
              </Button>
            ) : null}
            {servers[0] ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(`/server/${servers[0].uuidShort}`)}
              >
                Open Primary Console
              </Button>
            ) : null}
          </div>
        }
      />

      {!onboardingDismissed ? (
        <Card
          title="Petalnodes Operator Quick-Start Checklist"
          description="Verify your core server, security, and Minecraft configuration setup."
          headerAction={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOnboardingDismissed(true);
                try {
                  window.localStorage.setItem('petalnodes.onboarding.dismissed.v1', 'true');
                } catch {
                  // Ignore storage restrictions
                }
              }}
            >
              Dismiss
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => onNavigate('/account/security')}
              className="blush-transition blush-focus-ring rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 text-left hover:border-[var(--calagopus-primary-border)] cursor-pointer"
            >
              <p className="text-[12.5px] font-semibold text-[var(--calagopus-text)]">
                1. {isTwoFactorEnabled ? '2FA Protected' : 'Enable 2FA'}
              </p>
              <p className="text-[11.5px] text-[var(--calagopus-text-secondary)]">
                {isTwoFactorEnabled ? 'TOTP security is active' : 'Secure panel & SFTP sessions'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate(`/server/${servers[0]?.uuidShort ?? 'alpha-01'}/minecraft`)}
              className="blush-transition blush-focus-ring rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 text-left hover:border-[var(--calagopus-primary-border)] cursor-pointer"
            >
              <p className="text-[12.5px] font-semibold text-[var(--calagopus-text)]">
                2. Configure Minecraft Tools
              </p>
              <p className="text-[11.5px] text-[var(--calagopus-text-secondary)]">
                Visual properties, MOTD &amp; EULA
              </p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate(`/server/${servers[0]?.uuidShort ?? 'alpha-01'}/backups`)}
              className="blush-transition blush-focus-ring rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 text-left hover:border-[var(--calagopus-primary-border)] cursor-pointer"
            >
              <p className="text-[12.5px] font-semibold text-[var(--calagopus-text)]">
                3. Review Snapshot Backups
              </p>
              <p className="text-[11.5px] text-[var(--calagopus-text-secondary)]">
                Lock critical world archives
              </p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/account/ssh-keys')}
              className="blush-transition blush-focus-ring rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 text-left hover:border-[var(--calagopus-primary-border)] cursor-pointer"
            >
              <p className="text-[12.5px] font-semibold text-[var(--calagopus-text)]">
                4. Add SSH Public Key
              </p>
              <p className="text-[11.5px] text-[var(--calagopus-text-secondary)]">
                Fast key-based SFTP file transfers
              </p>
            </button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <ErrorState
          title="Could not sync dashboard data"
          description={error}
          onRetry={onRetry}
        />
      ) : null}

      {widgets.map((widget) => {
        if (!widget.visible) return null;

        if (widget.id === 'stats') {
          return (
            <div key="stats" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Accessible Servers"
                value={metrics.total}
                helper={`${metrics.running} running · ${metrics.offline} offline`}
                icon={<Server className="h-4 w-4" />}
                loading={loading}
              />
              <StatCard
                label="Active Instances"
                value={metrics.running}
                helper={
                  metrics.total > 0
                    ? `${Math.round((metrics.running / metrics.total) * 100)}% online`
                    : 'No instances'
                }
                progressPercent={
                  metrics.total > 0 ? (metrics.running / metrics.total) * 100 : 0
                }
                icon={<Power className="h-4 w-4" />}
                loading={loading}
              />
              <StatCard
                label="Allocated Memory"
                value={formatMegabytes(metrics.allocatedMemoryMb)}
                helper="Combined container RAM limit"
                icon={<Cpu className="h-4 w-4" />}
                loading={loading}
              />
              <StatCard
                label="Account Security"
                value={isTwoFactorEnabled ? '2FA Active' : 'Password Only'}
                helper={isTwoFactorEnabled ? 'TOTP verification enabled' : 'Recommended: enable 2FA'}
                icon={<ShieldCheck className="h-4 w-4" />}
                loading={loading}
              />
            </div>
          );
        }

        if (widget.id === 'favorites') {
          if (favoriteServers.length === 0 && recentServers.length === 0) return null;
          return (
            <div key="favorites" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card
                title="Pinned Favorites"
                description="Quick-jump access to your starred Petalnodes servers."
              >
                {favoriteServers.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--calagopus-text-secondary)]">
                    Click the star button on any server card below to pin it here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {favoriteServers.map((srv) => (
                      <div
                        key={srv.uuidShort}
                        className="flex items-center justify-between gap-3 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Star className="h-3.5 w-3.5 fill-current text-[var(--calagopus-primary-text)] shrink-0" />
                            <p className="truncate text-[13px] font-medium text-[var(--calagopus-text)]">
                              {srv.name}
                            </p>
                          </div>
                          <p className="font-mono text-[11px] text-[var(--calagopus-text-secondary)] truncate">
                            {srv.uuidShort} · {srv.node} · {srv.allocation}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onNavigate(`/server/${srv.uuidShort}`)}
                          >
                            Console
                          </Button>
                          {onToggleFavorite ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Unfavorite ${srv.name}`}
                              onClick={() => onToggleFavorite(srv.uuidShort)}
                            >
                              Unpin
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card
                title="Recently Accessed"
                description="Servers you opened most recently in this session."
              >
                {recentServers.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--calagopus-text-secondary)]">
                    Opened server consoles and overviews will appear here automatically.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentServers.map((srv) => (
                      <button
                        key={srv.uuidShort}
                        type="button"
                        onClick={() => onNavigate(`/server/${srv.uuidShort}`)}
                        className="blush-transition blush-focus-ring flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3 py-2 text-left hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Clock className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)] shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-[var(--calagopus-text)]">
                              {srv.name}
                            </p>
                            <p className="font-mono text-[11px] text-[var(--calagopus-text-secondary)] truncate">
                              {srv.eggName} · {srv.node}
                            </p>
                          </div>
                        </div>
                        <StatusBadge
                          tone={getServerStatusTone(srv.state)}
                          label={srv.state.charAt(0).toUpperCase() + srv.state.slice(1)}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          );
        }

        if (widget.id === 'servers') {
          return (
            <Card
              key="servers"
              title="Your Servers"
              description="Game-specific container cards with live telemetry, custom cover art, and instant power controls."
              headerAction={
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-0.5"
                    role="group"
                    aria-label="Server view layout"
                  >
                    <button
                      type="button"
                      onClick={() => changeLayoutMode('grid')}
                      aria-pressed={layoutMode === 'grid'}
                      className={`blush-transition blush-focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium cursor-pointer ${
                        layoutMode === 'grid'
                          ? 'bg-[var(--calagopus-surface)] text-[var(--calagopus-primary-text)] shadow-xs'
                          : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Cards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => changeLayoutMode('table')}
                      aria-pressed={layoutMode === 'table'}
                      className={`blush-transition blush-focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium cursor-pointer ${
                        layoutMode === 'table'
                          ? 'bg-[var(--calagopus-surface)] text-[var(--calagopus-primary-text)] shadow-xs'
                          : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
                      }`}
                    >
                      <List className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Table</span>
                    </button>
                  </div>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <p className="text-[12px] font-medium text-[var(--calagopus-text-secondary)] tabular-nums">
                    Showing {filteredServers.length} of {servers.length} server(s)
                    {serverQuery.trim() ? ` matching "${serverQuery.trim()}"` : ''}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-full sm:w-40">
                      <SelectDropdown
                        aria-label="Filter by software type"
                        value={categoryFilter}
                        onChange={(val: string | null) => {
                          setCategoryFilter((val as ServerCategoryFilter) ?? 'all');
                          setServerPage(1);
                        }}
                        data={[
                          { value: 'all', label: 'All types' },
                          { value: 'Minecraft Java', label: 'Minecraft Java' },
                          { value: 'Modded', label: 'Modded' },
                          { value: 'Bedrock', label: 'Bedrock' },
                          { value: 'Proxy Network', label: 'Proxy Network' },
                          { value: 'Infrastructure', label: 'Infrastructure' },
                        ]}
                      />
                    </div>

                    <div className="w-full sm:w-36">
                      <SelectDropdown
                        aria-label="Filter by status"
                        value={stateFilter}
                        onChange={(val: string | null) => {
                          setStateFilter((val as ServerStatusFilter) ?? 'all');
                          setServerPage(1);
                        }}
                        data={[
                          { value: 'all', label: 'All states' },
                          { value: 'running', label: 'Running' },
                          { value: 'offline', label: 'Offline' },
                        ]}
                      />
                    </div>

                    <div className="w-full sm:w-36">
                      <SelectDropdown
                        aria-label="Sort servers by"
                        value={sortKey}
                        onChange={(val: string | null) => {
                          if (val) handleSort(val as keyof CalagopusServerSummary & string);
                        }}
                        data={[
                          { value: 'name', label: 'Sort: Name' },
                          { value: 'cpuPercent', label: 'Sort: CPU %' },
                          { value: 'memoryUsedMb', label: 'Sort: Memory' },
                          { value: 'state', label: 'Sort: Status' },
                        ]}
                      />
                    </div>

                    <button
                      type="button"
                      aria-label={`Sort direction: ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                      title={sortDirection === 'asc' ? 'Ascending order' : 'Descending order'}
                      onClick={() =>
                        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                      }
                      className="blush-transition blush-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-primary-text)] cursor-pointer shrink-0"
                    >
                      {sortDirection === 'asc' ? (
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {loading ? (
                  layoutMode === 'grid' ? (
                    <CardGridSkeleton count={3} />
                  ) : (
                    <SkeletonBlock lines={4} />
                  )
                ) : filteredServers.length === 0 ? (
                  <EmptyState
                    icon={<HardDrive className="h-5 w-5" />}
                    title={hasActiveFilters ? 'No matching servers' : 'No servers assigned'}
                    description={
                      hasActiveFilters
                        ? 'Reset your search or type/status filters to see all servers in your account.'
                        : 'Servers assigned to your account or subuser permissions will appear here.'
                    }
                    actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
                    onAction={hasActiveFilters ? resetAllFilters : undefined}
                  />
                ) : layoutMode === 'grid' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {pagedServers.map((srv) => (
                        <ServerCard
                          key={srv.id}
                          server={srv}
                          uptimeSeconds={serverUptimeMap[srv.uuidShort]}
                          customBannerSrc={customBanners[srv.uuidShort]}
                          isFavorite={favoriteSet.has(srv.uuidShort)}
                          canControlPower={Boolean(onServerPowerAction)}
                          onNavigate={onNavigate}
                          onPowerAction={onServerPowerAction ? triggerCardPowerAction : undefined}
                          onSaveCustomBanner={onSaveCustomBanner}
                          onToggleFavorite={onToggleFavorite}
                        />
                      ))}
                    </div>
                    <Pagination
                      currentPage={safeServerPage}
                      totalItems={filteredServers.length}
                      pageSize={pageSize}
                      onPageChange={setServerPage}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <DataTable
                      caption="Accessible Calagopus Servers"
                      columns={serverColumns}
                      rows={pagedServers}
                      compact={compact}
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      renderActions={(srv) => (
                        <div className="flex items-center gap-1.5">
                          {onToggleFavorite ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={
                                favoriteSet.has(srv.uuidShort)
                                  ? `Unfavorite ${srv.name}`
                                  : `Favorite ${srv.name}`
                              }
                              onClick={() => onToggleFavorite(srv.uuidShort)}
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  favoriteSet.has(srv.uuidShort)
                                    ? 'fill-current text-[var(--calagopus-primary-text)]'
                                    : ''
                                }`}
                              />
                            </Button>
                          ) : null}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onNavigate(`/server/${srv.uuidShort}`)}
                          >
                            Manage
                          </Button>
                        </div>
                      )}
                    />
                    <Pagination
                      currentPage={safeServerPage}
                      totalItems={filteredServers.length}
                      pageSize={pageSize}
                      onPageChange={setServerPage}
                    />
                  </div>
                )}
              </div>
            </Card>
          );
        }

        if (widget.id === 'quick-actions') {
          return (
            <div key="quick-actions" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card title="Account Identity" description="Authenticated Calagopus user profile.">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <ProfileBadge
                      name={user.username}
                      subtitle={user.email}
                      avatarSrc={user.avatarUrl}
                    />
                    <StatusBadge
                      tone={user.isAdmin ? 'pink' : 'neutral'}
                      label={user.isAdmin ? 'Administrator' : 'Member'}
                      showIcon={false}
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--calagopus-border)] pt-3 text-[13px]">
                    <span className="text-[var(--calagopus-text-secondary)]">Access Scope</span>
                    <span className="font-medium text-[var(--calagopus-text)]">
                      {user.isAdmin ? 'Full Panel Access' : 'Client & Assigned Servers'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<User className="h-3.5 w-3.5" />}
                      onClick={() => onNavigate('/account')}
                    >
                      Profile
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Shield className="h-3.5 w-3.5" />}
                      onClick={() => onNavigate('/account/security')}
                    >
                      Security
                    </Button>
                  </div>
                </div>
              </Card>

              <Card
                className="lg:col-span-2"
                title="Quick Actions"
                description="Direct shortcuts to Petalnodes account and server management routes."
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('/account/api-keys')}
                    className="blush-transition blush-focus-ring flex items-center justify-between rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3.5 text-left hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] cursor-pointer"
                  >
                    <span className="block min-w-0">
                      <span className="block text-sm font-medium text-[var(--calagopus-text)]">
                        Manage API Keys
                      </span>
                      <span className="block text-[12px] text-[var(--calagopus-text-secondary)] truncate">
                        Create or revoke client API tokens
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('/account/ssh-keys')}
                    className="blush-transition blush-focus-ring flex items-center justify-between rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3.5 text-left hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] cursor-pointer"
                  >
                    <span className="block min-w-0">
                      <span className="block text-sm font-medium text-[var(--calagopus-text)]">
                        SSH Public Keys
                      </span>
                      <span className="block text-[12px] text-[var(--calagopus-text-secondary)] truncate">
                        Configure SFTP &amp; SSH credentials
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('/account/activity')}
                    className="blush-transition blush-focus-ring flex items-center justify-between rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3.5 text-left hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] cursor-pointer"
                  >
                    <span className="block min-w-0">
                      <span className="block text-sm font-medium text-[var(--calagopus-text)]">
                        Account Activity
                      </span>
                      <span className="block text-[12px] text-[var(--calagopus-text-secondary)] truncate">
                        Inspect login and key audit history
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />
                  </button>

                  {canAccessAdmin ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('/admin/extensions')}
                      className="blush-transition blush-focus-ring flex items-center justify-between rounded-lg border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-subtle)] p-3.5 text-left hover:bg-[var(--calagopus-primary-soft)] cursor-pointer"
                    >
                      <span className="block min-w-0">
                        <span className="block text-sm font-medium text-[var(--calagopus-primary-text)]">
                          Extensions &amp; Admin
                        </span>
                        <span className="block text-[12px] text-[var(--calagopus-text-secondary)] truncate">
                          Manage .c7s.zip extensions, nodes &amp; build logs
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </Card>
            </div>
          );
        }

        if (widget.id === 'sanctuary') {
          return (
            <PetalIslandShowcaseCard
              key="sanctuary"
              onNavigate={onNavigate}
              primaryServerPath={servers[0] ? `/server/${servers[0].uuidShort}` : undefined}
              primaryServerName={servers[0] ? `${servers[0].name} Console` : undefined}
            />
          );
        }

        if (widget.id === 'activity') {
          return (
            <Card
              key="activity"
              title="Recent Activity"
              description="Recent authentication and container lifecycle actions."
              headerAction={
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Activity className="h-3.5 w-3.5" />}
                  onClick={() => onNavigate('/account/activity')}
                >
                  View All
                </Button>
              }
            >
              {loading ? (
                <SkeletonBlock lines={4} />
              ) : (
                <DataTable
                  caption="Recent Account Activity"
                  columns={activityColumns}
                  rows={activity}
                  compact={compact}
                  emptyState={
                    <EmptyState
                      title="No recent activity"
                      description="Account and server actions will be logged here automatically."
                    />
                  }
                />
              )}
            </Card>
          );
        }

        return null;
      })}

      <ModalDialog
        opened={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize Dashboard Widgets"
        description="Toggle section visibility and reorder cards on your workspace. Saved locally in your browser."
        size="md"
      >
        <div className="space-y-3">
          {widgets.map((widget, idx) => (
            <div
              key={widget.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <SwitchInput
                  label={widget.label}
                  checked={widget.visible}
                  onChange={() => toggleWidgetVisible(widget.id)}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={idx === 0}
                  aria-label={`Move ${widget.label} up`}
                  onClick={() => moveWidget(idx, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={idx === widgets.length - 1}
                  aria-label={`Move ${widget.label} down`}
                  onClick={() => moveWidget(idx, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[var(--calagopus-border)] pt-3">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => updateWidgets([...DEFAULT_DASHBOARD_WIDGETS])}
            >
              Reset Layout
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCustomizeOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </ModalDialog>

      <ConfirmDialog
        opened={pendingStopServer !== null}
        onClose={() => setPendingStopServer(null)}
        onConfirm={() => {
          if (pendingStopServer && onServerPowerAction) {
            onServerPowerAction(pendingStopServer.uuidShort, 'stop');
          }
          setPendingStopServer(null);
        }}
        title="Stop Server Gracefully"
        message={`Send a graceful stop signal to ${pendingStopServer?.name ?? 'this server'}? Connected players will be disconnected cleanly.`}
        confirmLabel="Stop Server"
        destructive
      />
    </div>
  );
}
