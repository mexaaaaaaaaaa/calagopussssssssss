import React from 'react';
import {
  Archive,
  Check,
  Cpu,
  Globe,
  HardDrive,
  Layers,
  Network,
  Plus,
  Save,
  Server,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import {
  formatMegabytes,
  type AdminDashboardPayload,
  type CalagopusActivityEntry,
  type CalagopusServerSummary,
} from '../api/calagopusDashboard';
import {
  filterRecordsByText,
  type CalagopusAdminAllocation,
  type CalagopusAdminExtension,
  type CalagopusAdminNode,
  type CalagopusAdminRole,
  type CalagopusAdminSettings,
  type CalagopusAdminUser,
  type CalagopusBackupRecord,
} from '../api/calagopusModules';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState, ErrorState } from '../components/FeedbackStates';
import {
  NumberInput,
  SearchField,
  SelectDropdown,
  SwitchInput,
  TextInput,
} from '../components/FormControls';
import { ModalDialog, showToast } from '../components/Overlays';
import { StatCard } from '../components/StatCard';
import { Card, PageHeader, StatusBadge } from '../components/Surface';
import { hasPermission, type CalagopusUserContext } from '../navigation/calagopusRoutes';
import {
  CALAGOPUS_EGG_CATALOG,
  resolveEggArtworkId,
  type CalagopusEggEntry,
} from '../utils/eggCatalog';
import { getEggArtworkUrl } from '../utils/eggArtworkAssets';
import type { ServerPowerAction } from '../api/calagopusCore';
import { ActivityLogPage } from './ActivityLogPage';
import { AdminAnalyticsPage } from './AdminAnalyticsPage';
import { AdminNestsEggsPage } from './AdminNestsEggsPage';

export interface AdminResourcesPageProps {
  currentPath: string;
  user: CalagopusUserContext;
  adminData?: AdminDashboardPayload | null;
  nodes: readonly CalagopusAdminNode[];
  allocations?: readonly CalagopusAdminAllocation[];
  extensions: readonly CalagopusAdminExtension[];
  servers: readonly CalagopusServerSummary[];
  backups?: readonly CalagopusBackupRecord[];
  users?: readonly CalagopusAdminUser[];
  roles?: readonly CalagopusAdminRole[];
  settings?: CalagopusAdminSettings;
  auditLogs: readonly CalagopusActivityEntry[];
  eggs?: readonly CalagopusEggEntry[];
  onSaveSettings?: (next: CalagopusAdminSettings) => Promise<void> | void;
  onCreateUser?: (input: { username: string; email: string; roleName: string }) => Promise<void> | void;
  onCreateServer?: (input: {
    name: string;
    egg: CalagopusEggEntry;
    nodeName: string;
    allocation: string;
    memoryLimitMb: number;
    diskLimitMb: number;
  }) => Promise<void> | void;
  onToggleNodeMaintenance?: (nodeId: string) => void;
  onBulkServerPowerAction?: (serverIds: string[], action: ServerPowerAction) => void;
  onToggleServerSuspend?: (serverId: string) => void;
  onNavigate: (path: string) => void;
  isLiveMode?: boolean;
  compact?: boolean;
}

export function AdminResourcesPage({
  currentPath,
  user,
  adminData = null,
  nodes,
  allocations = [],
  servers,
  backups = [],
  users = [],
  roles = [],
  settings,
  auditLogs,
  eggs = CALAGOPUS_EGG_CATALOG,
  onSaveSettings,
  onCreateUser,
  onCreateServer,
  onToggleNodeMaintenance,
  onBulkServerPowerAction,
  onToggleServerSuspend,
  onNavigate,
  isLiveMode = false,
  compact = false,
}: AdminResourcesPageProps) {
  const [query, setQuery] = React.useState('');
  const [nodeView, setNodeView] = React.useState<'cards' | 'table'>('cards');
  const [nodeStatusFilter, setNodeStatusFilter] = React.useState<'all' | 'online' | 'maintenance'>('all');
  const [inspectedNode, setInspectedNode] = React.useState<CalagopusAdminNode | null>(null);
  const [allocFilter, setAllocFilter] = React.useState<'all' | 'assigned' | 'available'>('all');
  const [selectedServerIds, setSelectedServerIds] = React.useState<string[]>([]);

  // Admin Settings local draft state with dirty tracking
  const [settingsDraft, setSettingsDraft] = React.useState<CalagopusAdminSettings | null>(
    settings ?? null,
  );
  const [settingsDirty, setSettingsDirty] = React.useState(false);

  React.useEffect(() => {
    if (settings) {
      setSettingsDraft(settings);
      setSettingsDirty(false);
    }
  }, [settings]);

  // Create User modal state
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState('');
  const [newUserEmail, setNewUserEmail] = React.useState('');
  const [newUserRole, setNewUserRole] = React.useState('Standard Member');
  const [userFormError, setUserFormError] = React.useState<string | null>(null);

  // Create Server 3-step Wizard modal state
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState<1 | 2 | 3>(1);
  const [wizardEggId, setWizardEggId] = React.useState<string>(eggs[1]?.id ?? eggs[0]?.id ?? 'mc-paper');
  const [wizardServerName, setWizardServerName] = React.useState('');
  const [wizardNodeName, setWizardNodeName] = React.useState(nodes[0]?.name ?? 'eu-west-1');
  const [wizardMemoryMb, setWizardMemoryMb] = React.useState(4096);
  const [wizardDiskMb, setWizardDiskMb] = React.useState(20480);
  const [wizardError, setWizardError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setQuery('');
  }, [currentPath]);

  const canAccessAdmin =
    user.isAdmin || user.permissions.some((p) => p.startsWith('admin.'));

  if (!canAccessAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Administration" description="Petalnodes administrative controls." />
        <ErrorState
          title="Administrator permission required"
          description="Your account role does not hold administrative privileges."
          retryLabel="Return to Workspace"
          onRetry={() => onNavigate('/')}
        />
      </div>
    );
  }

  if (currentPath === '/admin/nests') {
    return (
      <AdminNestsEggsPage
        user={user}
        eggs={eggs}
        onNavigate={onNavigate}
        compact={compact}
      />
    );
  }

  if (currentPath === '/admin/analytics') {
    return (
      <AdminAnalyticsPage
        user={user}
        data={adminData}
        nodes={nodes}
        servers={servers}
        onNavigate={onNavigate}
        isLiveMode={isLiveMode}
      />
    );
  }

  if (currentPath === '/admin/audit-logs') {
    return (
      <ActivityLogPage
        title="Admin Audit Logs"
        description="System-wide administrative actions, node heartbeats, and extension events."
        entries={auditLogs}
        compact={compact}
      />
    );
  }

  // === Nodes & Locations ===
  if (currentPath === '/admin/nodes' || currentPath === '/admin/locations') {
    const filteredNodes = filterRecordsByText(nodes, query, (n) => [
      n.name,
      n.fqdn,
      n.location,
    ]).filter((n) => nodeStatusFilter === 'all' || n.status === nodeStatusFilter);

    const locationGroups = Array.from(
      nodes.reduce((map, n) => {
        const list = map.get(n.location) ?? [];
        list.push(n);
        map.set(n.location, list);
        return map;
      }, new Map<string, CalagopusAdminNode[]>()),
    );

    const onlineNodes = nodes.filter((n) => n.status === 'online').length;
    const totalMem = nodes.reduce((acc, n) => acc + n.memoryMb, 0);
    const usedMem = nodes.reduce((acc, n) => acc + n.memoryAllocatedMb, 0);
    const totalDisk = nodes.reduce((acc, n) => acc + n.diskMb, 0);
    const usedDisk = nodes.reduce((acc, n) => acc + n.diskAllocatedMb, 0);

    const nodeColumns: readonly TableColumn<CalagopusAdminNode>[] = [
      {
        key: 'name',
        header: 'Node',
        render: (n) => (
          <div>
            <p className="font-medium text-[var(--calagopus-text)]">{n.name}</p>
            <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">{n.fqdn}</p>
          </div>
        ),
      },
      { key: 'location', header: 'Location' },
      {
        key: 'memoryAllocatedMb',
        header: 'Memory Allocated',
        align: 'right',
        numeric: true,
        render: (n) => `${formatMegabytes(n.memoryAllocatedMb)} / ${formatMegabytes(n.memoryMb)}`,
      },
      {
        key: 'diskAllocatedMb',
        header: 'Disk Allocated',
        align: 'right',
        numeric: true,
        render: (n) => `${formatMegabytes(n.diskAllocatedMb)} / ${formatMegabytes(n.diskMb)}`,
      },
      {
        key: 'serversCount',
        header: 'Servers',
        align: 'right',
        numeric: true,
      },
      {
        key: 'status',
        header: 'Daemon',
        render: (n) => (
          <StatusBadge
            tone={n.status === 'online' ? 'success' : 'warning'}
            label={n.status === 'online' ? 'Online' : 'Maintenance'}
          />
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          title={currentPath === '/admin/locations' ? 'Locations & Regions' : 'Infrastructure Nodes'}
          description="Regional hosts connected via the Calagopus Wings daemon."
          metadata={[
            `${onlineNodes}/${nodes.length} online`,
            `${locationGroups.length} regions`,
            `${allocations.length} allocations`,
          ]}
          actions={
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Network className="h-4 w-4" />}
              onClick={() => onNavigate('/admin/allocations')}
            >
              Manage Allocations
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Online Wings Nodes"
            value={`${onlineNodes}/${nodes.length}`}
            helper={`${locationGroups.length} geographic regions`}
            icon={<Cpu className="h-4 w-4" />}
          />
          <StatCard
            label="Cluster RAM Allocated"
            value={formatMegabytes(usedMem)}
            helper={`of ${formatMegabytes(totalMem)} total`}
            progressPercent={totalMem > 0 ? (usedMem / totalMem) * 100 : 0}
            icon={<Server className="h-4 w-4" />}
          />
          <StatCard
            label="Cluster Storage Allocated"
            value={formatMegabytes(usedDisk)}
            helper={`of ${formatMegabytes(totalDisk)} total`}
            progressPercent={totalDisk > 0 ? (usedDisk / totalDisk) * 100 : 0}
            icon={<HardDrive className="h-4 w-4" />}
          />
          <StatCard
            label="Available IP Ports"
            value={allocations.filter((a) => !a.assignedServerId).length}
            helper={`of ${allocations.length} tracked allocations`}
            icon={<Network className="h-4 w-4" />}
          />
        </div>

        {currentPath === '/admin/locations' && locationGroups.length > 0 ? (
          <Card title="Regional Clusters" description="Active datacenters grouped by location identifier.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {locationGroups.map(([locName, locNodes]) => {
                const srvTotal = locNodes.reduce((s, n) => s + n.serversCount, 0);
                return (
                  <div
                    key={locName}
                    className="rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-display text-[14px] font-semibold text-[var(--calagopus-text)]">
                        <Globe className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />
                        {locName}
                      </span>
                      <StatusBadge tone="success" label={`${locNodes.length} nodes`} />
                    </div>
                    <p className="text-[12px] text-[var(--calagopus-text-secondary)]">
                      Hosts {srvTotal} active containers across {locNodes.map((n) => n.name).join(', ')}.
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <Card
          title="Cluster Nodes"
          headerAction={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-52">
                <SearchField
                  aria-label="Search nodes"
                  placeholder="Search node, FQDN, region..."
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <div className="w-full sm:w-36">
                <SelectDropdown
                  aria-label="Filter node status"
                  value={nodeStatusFilter}
                  onChange={(val) =>
                    setNodeStatusFilter((val as 'all' | 'online' | 'maintenance') ?? 'all')
                  }
                  data={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'online', label: 'Online' },
                    { value: 'maintenance', label: 'Maintenance' },
                  ]}
                />
              </div>
              <div className="inline-flex rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-0.5">
                {(['cards', 'table'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setNodeView(mode)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                      nodeView === mode
                        ? 'bg-[var(--calagopus-surface)] text-[var(--calagopus-primary-text)] shadow-xs'
                        : 'text-[var(--calagopus-text-secondary)]'
                    }`}
                  >
                    {mode === 'cards' ? 'Cards' : 'Table'}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          {filteredNodes.length === 0 ? (
            <EmptyState
              icon={<Cpu className="h-5 w-5" />}
              title="No matching nodes"
              description="Reset search or status filters to inspect all Wings nodes."
            />
          ) : nodeView === 'cards' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredNodes.map((node) => {
                const memPct =
                  node.memoryMb > 0
                    ? Math.min(100, Math.round((node.memoryAllocatedMb / node.memoryMb) * 100))
                    : 0;
                const dskPct =
                  node.diskMb > 0
                    ? Math.min(100, Math.round((node.diskAllocatedMb / node.diskMb) * 100))
                    : 0;
                const nodeAllocCount = allocations.filter((a) => a.nodeId === node.id).length;

                return (
                  <article
                    key={node.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-4 blush-transition hover:border-[var(--calagopus-primary-border)]"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-display text-[15px] font-semibold text-[var(--calagopus-text)] truncate">
                            {node.name}
                          </h3>
                          <p className="font-mono text-[11.5px] text-[var(--calagopus-text-secondary)] truncate">
                            {node.fqdn}
                          </p>
                        </div>
                        <StatusBadge
                          tone={node.status === 'online' ? 'success' : 'warning'}
                          label={node.status === 'online' ? 'Online' : 'Maintenance'}
                        />
                      </div>

                      <p className="text-[12px] text-[var(--calagopus-text-secondary)]">
                        {node.location} · {node.serversCount} servers · {nodeAllocCount} ports
                      </p>

                      <div className="space-y-2 text-[11.5px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[var(--calagopus-text-secondary)] tabular-nums">
                            <span>Memory</span>
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
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[var(--calagopus-text-secondary)] tabular-nums">
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
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--calagopus-border)] pt-3">
                      {onToggleNodeMaintenance ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleNodeMaintenance(node.id)}
                        >
                          {node.status === 'online' ? 'Set Maintenance' : 'Bring Online'}
                        </Button>
                      ) : (
                        <span />
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setInspectedNode(node)}
                      >
                        Node Details
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <DataTable
              caption="Cluster Nodes"
              columns={nodeColumns}
              rows={filteredNodes}
              compact={compact}
              renderActions={(n) => (
                <Button variant="secondary" size="sm" onClick={() => setInspectedNode(n)}>
                  Inspect
                </Button>
              )}
            />
          )}
        </Card>

        <ModalDialog
          opened={inspectedNode !== null}
          onClose={() => setInspectedNode(null)}
          title={inspectedNode ? `Node · ${inspectedNode.name}` : 'Node Details'}
          description={inspectedNode ? `${inspectedNode.fqdn} · ${inspectedNode.location}` : undefined}
          size="lg"
        >
          {inspectedNode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
                  <p className="text-[11px] text-[var(--calagopus-text-secondary)]">Daemon Status</p>
                  <p className="mt-1 font-semibold text-[var(--calagopus-text)]">
                    {inspectedNode.status === 'online' ? 'Wings Healthy' : 'Maintenance'}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
                  <p className="text-[11px] text-[var(--calagopus-text-secondary)]">Memory Quota</p>
                  <p className="mt-1 font-mono text-[13px] text-[var(--calagopus-text)] tabular-nums">
                    {formatMegabytes(inspectedNode.memoryAllocatedMb)} / {formatMegabytes(inspectedNode.memoryMb)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
                  <p className="text-[11px] text-[var(--calagopus-text-secondary)]">Disk Quota</p>
                  <p className="mt-1 font-mono text-[13px] text-[var(--calagopus-text)] tabular-nums">
                    {formatMegabytes(inspectedNode.diskAllocatedMb)} / {formatMegabytes(inspectedNode.diskMb)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-[13px] font-semibold text-[var(--calagopus-text)]">
                  Allocations on {inspectedNode.name}
                </h4>
                <DataTable
                  caption="Node Allocations"
                  compact
                  columns={[
                    {
                      key: 'ip',
                      header: 'Endpoint',
                      render: (a) => (
                        <span className="font-mono text-[12px]">
                          {a.ip}:{a.port}
                        </span>
                      ),
                    },
                    {
                      key: 'alias',
                      header: 'Alias',
                      render: (a) => a.alias || '—',
                    },
                    {
                      key: 'assignedServerName',
                      header: 'Assigned To',
                      render: (a) =>
                        a.assignedServerName ? (
                          <StatusBadge tone="pink" label={a.assignedServerName} />
                        ) : (
                          <StatusBadge tone="success" label="Available" />
                        ),
                    },
                  ]}
                  rows={allocations.filter((a) => a.nodeId === inspectedNode.id)}
                  emptyState={
                    <EmptyState
                      title="No allocations mapped"
                      description="Add IP/port pairs on the Wings node configuration."
                    />
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button variant="primary" size="sm" onClick={() => setInspectedNode(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </ModalDialog>
      </div>
    );
  }

  // === Allocations ===
  if (currentPath === '/admin/allocations') {
    const filteredAllocs = filterRecordsByText(allocations, query, (a) => [
      a.ip,
      String(a.port),
      a.alias,
      a.nodeName,
      a.assignedServerName ?? '',
    ]).filter((a) => {
      if (allocFilter === 'assigned') return Boolean(a.assignedServerId);
      if (allocFilter === 'available') return !a.assignedServerId;
      return true;
    });

    const allocCols: readonly TableColumn<CalagopusAdminAllocation>[] = [
      {
        key: 'ip',
        header: 'IP & Port',
        numeric: true,
        render: (a) => (
          <span className="font-mono font-medium text-[var(--calagopus-text)]">
            {a.ip}:{a.port}
          </span>
        ),
      },
      { key: 'nodeName', header: 'Node' },
      {
        key: 'alias',
        header: 'Domain Alias',
        render: (a) => (
          <span className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">
            {a.alias || '—'}
          </span>
        ),
      },
      {
        key: 'assignedServerName',
        header: 'Assignment',
        render: (a) =>
          a.assignedServerName ? (
            <StatusBadge tone="pink" label={a.assignedServerName} />
          ) : (
            <StatusBadge tone="success" label="Available" />
          ),
      },
      { key: 'notes', header: 'Notes' },
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          title="Network Allocations"
          description="Global IPv4 and port allocation pool across all Wings nodes."
          metadata={[
            `${allocations.length} total ports`,
            `${allocations.filter((a) => a.assignedServerId).length} assigned`,
            `${allocations.filter((a) => !a.assignedServerId).length} free`,
          ]}
        />

        <Card
          title="Allocation Pool Visualizer"
          description="Visual IP & port map showing free capacity vs active server assignments."
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAllocs.map((a) => (
              <div
                key={`grid-${a.id}`}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                  a.assignedServerId
                    ? 'border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-subtle)]'
                    : 'border-[var(--calagopus-success-border)] bg-[var(--calagopus-success-bg)]'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-mono text-[12.5px] font-semibold text-[var(--calagopus-text)] truncate">
                    {a.ip}:{a.port}
                  </p>
                  <p className="text-[11px] text-[var(--calagopus-text-secondary)] truncate">
                    {a.nodeName}{a.alias ? ` · ${a.alias}` : ''}
                  </p>
                </div>
                <StatusBadge
                  tone={a.assignedServerId ? 'pink' : 'success'}
                  label={a.assignedServerName ?? 'Free'}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Allocation Pool"
          headerAction={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-56">
                <SearchField
                  aria-label="Search allocations"
                  placeholder="Search IP, port, alias, node..."
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <div className="w-full sm:w-36">
                <SelectDropdown
                  aria-label="Filter assignment status"
                  value={allocFilter}
                  onChange={(val) =>
                    setAllocFilter((val as 'all' | 'assigned' | 'available') ?? 'all')
                  }
                  data={[
                    { value: 'all', label: 'All ports' },
                    { value: 'assigned', label: 'Assigned' },
                    { value: 'available', label: 'Available' },
                  ]}
                />
              </div>
            </div>
          }
        >
          <DataTable
            caption="Global Allocations"
            columns={allocCols}
            rows={filteredAllocs}
            compact={compact}
            renderActions={(a) =>
              a.assignedServerId ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate(`/server/${a.assignedServerId}/network`)}
                >
                  Open Server
                </Button>
              ) : null
            }
            emptyState={
              <EmptyState
                icon={<Network className="h-5 w-5" />}
                title="No matching allocations"
                description="Clear filters to inspect the full IP/port pool."
              />
            }
          />
        </Card>
      </div>
    );
  }

  // === Admin Servers + Provisioning Wizard ===
  if (currentPath === '/admin/servers') {
    const filteredServers = filterRecordsByText(servers, query, (s) => [
      s.name,
      s.uuidShort,
      s.node,
      s.eggName,
    ]);
    const toggleSelectServer = (uuidShort: string) => {
      setSelectedServerIds((prev) =>
        prev.includes(uuidShort) ? prev.filter((id) => id !== uuidShort) : [...prev, uuidShort],
      );
    };

    const srvCols: readonly TableColumn<CalagopusServerSummary>[] = [
      {
        key: 'name',
        header: 'Server',
        render: (s) => (
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              aria-label={`Select ${s.name}`}
              checked={selectedServerIds.includes(s.uuidShort)}
              onChange={() => toggleSelectServer(s.uuidShort)}
              className="h-4 w-4 accent-[#F4A6C1] cursor-pointer"
            />
            <div>
              <p className="font-medium text-[var(--calagopus-text)]">{s.name}</p>
              <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">
                {s.uuidShort} · {s.eggName}
              </p>
            </div>
          </div>
        ),
      },
      { key: 'node', header: 'Node' },
      { key: 'allocation', header: 'Allocation', numeric: true },
      {
        key: 'memoryLimitMb',
        header: 'RAM Quota',
        align: 'right',
        numeric: true,
        render: (s) => formatMegabytes(s.memoryLimitMb),
      },
      {
        key: 'state',
        header: 'State',
        render: (s) => (
          <StatusBadge
            tone={s.state === 'running' ? 'success' : s.state === 'suspended' ? 'danger' : 'neutral'}
            label={s.state.charAt(0).toUpperCase() + s.state.slice(1)}
          />
        ),
      },
    ];

    const selectedWizardEgg = eggs.find((e) => e.id === wizardEggId) ?? eggs[0];
    const freeAlloc = allocations.find((a) => !a.assignedServerId && a.nodeName === wizardNodeName)
      ?? allocations.find((a) => !a.assignedServerId);

    const handleCompleteWizard = async () => {
      const cleanName = wizardServerName.trim();
      if (cleanName.length < 3) {
        setWizardError('Server name must be at least 3 characters.');
        return;
      }
      if (!selectedWizardEgg) {
        setWizardError('Select a valid Egg template.');
        return;
      }
      setWizardError(null);
      try {
        if (onCreateServer) {
          await Promise.resolve(
            onCreateServer({
              name: cleanName,
              egg: selectedWizardEgg,
              nodeName: wizardNodeName,
              allocation: freeAlloc ? `${freeAlloc.ip}:${freeAlloc.port}` : '198.51.100.14:25590',
              memoryLimitMb: wizardMemoryMb,
              diskLimitMb: wizardDiskMb,
            }),
          );
        }
        showToast({
          title: 'Server provisioned',
          message: `${cleanName} scheduled on ${wizardNodeName} with ${selectedWizardEgg.name}.`,
          tone: 'success',
        });
        setWizardOpen(false);
        setWizardStep(1);
        setWizardServerName('');
      } catch {
        // Error surfaced by caller
      }
    };

    return (
      <div className="space-y-6">
        <PageHeader
          title="All Servers"
          description="Admin inventory across all Petalnodes nodes."
          metadata={[`${servers.length} servers in scope`]}
          actions={
            hasPermission(user, 'admin.servers.create') ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setWizardStep(1);
                  setWizardError(null);
                  setWizardOpen(true);
                }}
              >
                Create Server
              </Button>
            ) : undefined
          }
        />
        {selectedServerIds.length > 0 && onBulkServerPowerAction ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-subtle)] px-4 py-2.5 text-[13px]">
            <span className="font-medium text-[var(--calagopus-primary-text)]">
              {selectedServerIds.length} server(s) selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onBulkServerPowerAction(selectedServerIds, 'start')}
              >
                Bulk Start
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onBulkServerPowerAction(selectedServerIds, 'restart')}
              >
                Bulk Restart
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onBulkServerPowerAction(selectedServerIds, 'stop')}
              >
                Bulk Stop
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedServerIds([])}>
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        <Card
          title="Server Directory"
          headerAction={
            <div className="w-full sm:w-64">
              <SearchField
                aria-label="Filter admin servers"
                placeholder="Search servers..."
                value={query}
                onChange={setQuery}
              />
            </div>
          }
        >
          <DataTable
            caption="Admin Server Directory"
            columns={srvCols}
            rows={filteredServers}
            compact={compact}
            renderActions={(s) => (
              <div className="inline-flex items-center gap-1.5">
                {onToggleServerSuspend ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleServerSuspend(s.uuidShort)}
                  >
                    {s.state === 'suspended' ? 'Unsuspend' : 'Suspend'}
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={() => onNavigate(`/server/${s.uuidShort}`)}>
                  Console
                </Button>
              </div>
            )}
            emptyState={
              <EmptyState
                icon={<Server className="h-5 w-5" />}
                title="No servers matched"
                description="Clear the search filter to see all servers."
              />
            }
          />
        </Card>

        {/* 3-Step Guided Server Provisioning Wizard */}
        <ModalDialog
          opened={wizardOpen}
          onClose={() => setWizardOpen(false)}
          title="Provision New Server"
          description={`Step ${wizardStep} of 3 · Guided Calagopus Egg & resource allocation`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              {[
                { step: 1 as const, label: '1. Egg Template' },
                { step: 2 as const, label: '2. Identity & Node' },
                { step: 3 as const, label: '3. Quotas & Review' },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`rounded-lg border px-3 py-2 text-center font-medium ${
                    wizardStep === s.step
                      ? 'border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-subtle)] text-[var(--calagopus-primary-text)]'
                      : 'border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] text-[var(--calagopus-text-secondary)]'
                  }`}
                >
                  {s.label}
                </div>
              ))}
            </div>

            {wizardStep === 1 ? (
              <div className="space-y-3">
                <SelectDropdown
                  label="Select Egg Template"
                  value={wizardEggId}
                  onChange={(val) => val && setWizardEggId(val)}
                  data={eggs.map((egg) => ({
                    value: egg.id,
                    label: `${egg.name} (${egg.category})`,
                  }))}
                />
                {selectedWizardEgg ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 sm:flex-row sm:items-center">
                    <img
                      src={getEggArtworkUrl(resolveEggArtworkId(selectedWizardEgg))}
                      alt={`${selectedWizardEgg.name} preview`}
                      className="h-20 w-36 rounded-lg object-cover shrink-0 border border-[var(--calagopus-border)]"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-[var(--calagopus-text)]">
                        {selectedWizardEgg.name}
                      </p>
                      <p className="text-[12px] text-[var(--calagopus-text-secondary)]">
                        {selectedWizardEgg.description}
                      </p>
                      <p className="font-mono text-[11px] text-[var(--calagopus-primary-text)]">
                        {selectedWizardEgg.repository} · {selectedWizardEgg.runtimeLabel}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {wizardStep === 2 ? (
              <div className="space-y-4">
                <TextInput
                  label="Server Display Name"
                  placeholder="e.g. Petalnodes SMP Season 4"
                  required
                  value={wizardServerName}
                  error={wizardError ?? undefined}
                  onChange={(e) => {
                    setWizardServerName(e.currentTarget.value);
                    setWizardError(null);
                  }}
                />
                <SelectDropdown
                  label="Target Wings Node"
                  value={wizardNodeName}
                  onChange={(val) => val && setWizardNodeName(val)}
                  data={nodes.map((n) => ({
                    value: n.name,
                    label: `${n.name} (${n.location})`,
                  }))}
                />
                <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 text-[12px]">
                  <span className="text-[var(--calagopus-text-secondary)]">Next available allocation: </span>
                  <span className="font-mono font-medium text-[var(--calagopus-text)]">
                    {freeAlloc ? `${freeAlloc.ip}:${freeAlloc.port}` : 'Auto-assigned on Wings node'}
                  </span>
                </div>
              </div>
            ) : null}

            {wizardStep === 3 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <NumberInput
                    label="Memory Limit (MiB)"
                    min={512}
                    max={65536}
                    step={512}
                    value={wizardMemoryMb}
                    onChange={(val) => setWizardMemoryMb(Number(val) || 2048)}
                  />
                  <NumberInput
                    label="Disk Quota (MiB)"
                    min={1024}
                    max={512000}
                    step={1024}
                    value={wizardDiskMb}
                    onChange={(val) => setWizardDiskMb(Number(val) || 10240)}
                  />
                </div>

                {wizardError ? <ErrorState title="Validation error" description={wizardError} /> : null}

                <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3.5 text-[12.5px] space-y-1">
                  <p className="font-semibold text-[var(--calagopus-text)]">Provisioning Summary</p>
                  <p className="text-[var(--calagopus-text-secondary)]">
                    Server: <strong className="text-[var(--calagopus-text)]">{wizardServerName || '(Unnamed)'}</strong>
                  </p>
                  <p className="text-[var(--calagopus-text-secondary)]">
                    Egg: <strong className="text-[var(--calagopus-text)]">{selectedWizardEgg?.name}</strong> · Node: <strong className="text-[var(--calagopus-text)]">{wizardNodeName}</strong>
                  </p>
                  <p className="text-[var(--calagopus-text-secondary)]">
                    Resources: <span className="font-mono">{formatMegabytes(wizardMemoryMb)} RAM · {formatMegabytes(wizardDiskMb)} Disk</span>
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-[var(--calagopus-border)] pt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  wizardStep === 1 ? setWizardOpen(false) : setWizardStep((s) => (s === 3 ? 2 : 1))
                }
              >
                {wizardStep === 1 ? 'Cancel' : 'Back'}
              </Button>
              {wizardStep < 3 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setWizardStep((s) => (s === 1 ? 2 : 3))}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Check className="h-3.5 w-3.5" />}
                  onClick={() => void handleCompleteWizard()}
                >
                  Create Server
                </Button>
              )}
            </div>
          </div>
        </ModalDialog>
      </div>
    );
  }

  // === Admin Backups Overview ===
  if (currentPath === '/admin/backups') {
    const filteredBackups = filterRecordsByText(backups, query, (b) => [
      b.name,
      b.uuidShort,
      b.serverId,
      b.checksum,
    ]);
    const totalBackupBytes = backups.reduce((s, b) => s + Math.max(0, b.bytes), 0);

    const backupCols: readonly TableColumn<CalagopusBackupRecord>[] = [
      {
        key: 'name',
        header: 'Snapshot Name',
        render: (b) => (
          <div>
            <p className="font-medium text-[var(--calagopus-text)]">{b.name}</p>
            <p className="font-mono text-[11px] text-[var(--calagopus-text-secondary)]">
              {b.uuidShort} · Server {b.serverId}
            </p>
          </div>
        ),
      },
      {
        key: 'bytes',
        header: 'Size',
        align: 'right',
        numeric: true,
        render: (b) => formatMegabytes(Math.round(b.bytes / (1024 * 1024))),
      },
      { key: 'createdAt', header: 'Created', numeric: true },
      {
        key: 'isLocked',
        header: 'Lock',
        render: (b) => (
          <StatusBadge tone={b.isLocked ? 'pink' : 'neutral'} label={b.isLocked ? 'Locked' : 'Unlocked'} />
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          title="Cluster Backups"
          description="Backup snapshots recorded across managed Petalnodes servers."
          metadata={[
            `${backups.length} snapshots`,
            formatMegabytes(Math.round(totalBackupBytes / (1024 * 1024))),
          ]}
        />
        <Card
          title="Snapshot Inventory"
          headerAction={
            <div className="w-full sm:w-64">
              <SearchField
                aria-label="Search admin backups"
                placeholder="Search backup, UUID, server..."
                value={query}
                onChange={setQuery}
              />
            </div>
          }
        >
          <DataTable
            caption="Admin Backups"
            columns={backupCols}
            rows={filteredBackups}
            compact={compact}
            renderActions={(b) => (
              <Button variant="secondary" size="sm" onClick={() => onNavigate(`/server/${b.serverId}/backups`)}>
                Manage
              </Button>
            )}
            emptyState={
              <EmptyState
                icon={<Archive className="h-5 w-5" />}
                title="No backup snapshots"
                description="Server snapshots created by users or schedules appear here."
              />
            }
          />
        </Card>
      </div>
    );
  }

  // === Admin Users Directory ===
  if (currentPath === '/admin/users') {
    const filteredUsers = filterRecordsByText(users, query, (u) => [
      u.username,
      u.email,
      u.roleName,
    ]);
    const userCols: readonly TableColumn<CalagopusAdminUser>[] = [
      {
        key: 'username',
        header: 'User',
        render: (u) => (
          <div>
            <p className="font-medium text-[var(--calagopus-text)]">{u.username}</p>
            <p className="text-[12px] text-[var(--calagopus-text-secondary)]">{u.email}</p>
          </div>
        ),
      },
      {
        key: 'roleName',
        header: 'Assigned Role',
        render: (u) => (
          <StatusBadge tone={u.isAdmin ? 'pink' : 'neutral'} label={u.roleName} />
        ),
      },
      {
        key: 'twoFactorEnabled',
        header: '2FA',
        render: (u) => (
          <StatusBadge
            tone={u.twoFactorEnabled ? 'success' : 'warning'}
            label={u.twoFactorEnabled ? 'Active' : 'Off'}
          />
        ),
      },
      { key: 'serversCount', header: 'Servers', align: 'right', numeric: true },
      { key: 'lastLoginAt', header: 'Last Active', numeric: true },
    ];

    const handleUserCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newUsername.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail.trim())) {
        setUserFormError('Provide a valid username and email address.');
        return;
      }
      setUserFormError(null);
      try {
        if (onCreateUser) {
          await Promise.resolve(
            onCreateUser({
              username: newUsername.trim(),
              email: newUserEmail.trim(),
              roleName: newUserRole,
            }),
          );
        }
        showToast({
          title: 'User account created',
          message: `Registered ${newUsername.trim()} under ${newUserRole}.`,
          tone: 'success',
        });
        setUserModalOpen(false);
        setNewUsername('');
        setNewUserEmail('');
      } catch {
        // Error surfaced by caller
      }
    };

    return (
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Panel user accounts, role bindings, and two-factor posture."
          metadata={[`${users.length} accounts`, `${users.filter((u) => u.twoFactorEnabled).length} 2FA protected`]}
          actions={
            hasPermission(user, 'admin.users.create') ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setUserModalOpen(true)}
              >
                Create User
              </Button>
            ) : undefined
          }
        />

        <Card
          title="Account Directory"
          headerAction={
            <div className="w-full sm:w-64">
              <SearchField
                aria-label="Search panel users"
                placeholder="Search username, email, role..."
                value={query}
                onChange={setQuery}
              />
            </div>
          }
        >
          <DataTable
            caption="Admin User Directory"
            columns={userCols}
            rows={filteredUsers}
            compact={compact}
            emptyState={
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title="No matching users"
                description="Adjust your search query to view panel accounts."
              />
            }
          />
        </Card>

        <ModalDialog
          opened={userModalOpen}
          onClose={() => setUserModalOpen(false)}
          title="Create Panel User"
          description="Provision a new Calagopus account with RBAC role assignment."
          size="md"
        >
          <form onSubmit={handleUserCreate} className="space-y-4">
            <TextInput
              label="Username"
              required
              placeholder="alex.chen"
              value={newUsername}
              onChange={(e) => {
                setNewUsername(e.currentTarget.value);
                setUserFormError(null);
              }}
            />
            <TextInput
              label="Email Address"
              type="email"
              required
              placeholder="alex@petalnodes.cloud"
              value={newUserEmail}
              error={userFormError ?? undefined}
              onChange={(e) => {
                setNewUserEmail(e.currentTarget.value);
                setUserFormError(null);
              }}
            />
            <SelectDropdown
              label="Role"
              value={newUserRole}
              onChange={(val) => val && setNewUserRole(val)}
              data={
                roles.length > 0
                  ? roles.map((r) => ({ value: r.name, label: r.name }))
                  : [{ value: 'Standard Member', label: 'Standard Member' }]
              }
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setUserModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create Account
              </Button>
            </div>
          </form>
        </ModalDialog>
      </div>
    );
  }

  // === Admin Roles & Permissions ===
  if (currentPath === '/admin/roles') {
    const filteredRoles = filterRecordsByText(roles, query, (r) => [
      r.name,
      r.description,
      ...r.permissions,
    ]);
    return (
      <div className="space-y-6">
        <PageHeader
          title="Roles & Permissions"
          description="Role-based access control scopes enforced by the Calagopus authorization layer."
          metadata={[`${roles.length} configured roles`]}
        />

        <Card
          title="RBAC Policy Matrix"
          headerAction={
            <div className="w-full sm:w-64">
              <SearchField
                aria-label="Filter RBAC roles"
                placeholder="Search role or permission..."
                value={query}
                onChange={setQuery}
              />
            </div>
          }
        >
          {filteredRoles.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-5 w-5" />}
              title="No matching roles"
              description="Clear search filter to see all RBAC roles."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredRoles.map((role) => (
                <article
                  key={role.id}
                  className="rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-[15px] font-semibold text-[var(--calagopus-text)]">
                        {role.name}
                      </h3>
                      <p className="text-[12px] text-[var(--calagopus-text-secondary)] mt-0.5">
                        {role.description}
                      </p>
                    </div>
                    <StatusBadge
                      tone={role.isSystem ? 'pink' : 'neutral'}
                      label={`${role.usersCount} users`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 border-t border-[var(--calagopus-border)] pt-3">
                    {role.permissions.map((perm) => (
                      <code
                        key={perm}
                        className="rounded-md border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--calagopus-text)]"
                      >
                        {perm}
                      </code>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // === Admin Panel Settings ===
  if (currentPath === '/admin/settings' && settingsDraft) {
    const updateField = <K extends keyof CalagopusAdminSettings>(
      key: K,
      value: CalagopusAdminSettings[K],
    ) => {
      setSettingsDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
      setSettingsDirty(true);
    };

    const handleSaveAdminSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!settingsDraft) return;
      try {
        if (onSaveSettings) {
          await Promise.resolve(onSaveSettings(settingsDraft));
        }
        setSettingsDirty(false);
        showToast({
          title: 'Panel settings saved',
          message: 'Updated global Calagopus configuration.',
          tone: 'success',
        });
      } catch {
        // Error surfaced by caller
      }
    };

    return (
      <div className="space-y-6">
        <PageHeader
          title="Panel Settings"
          description="Global Petalnodes Calagopus branding, authentication policies, and mail configuration."
          metadata={[settingsDraft.panelName, isLiveMode ? 'Live API' : 'Preview config']}
        />

        {settingsDirty ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--calagopus-warning-border)] bg-[var(--calagopus-warning-bg)] px-4 py-3 text-[13px] text-[var(--calagopus-warning-text)]"
          >
            <span>You have unsaved configuration changes.</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (settings) setSettingsDraft(settings);
                setSettingsDirty(false);
              }}
            >
              Discard Changes
            </Button>
          </div>
        ) : null}

        <form onSubmit={handleSaveAdminSettings} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Brand & Public URLs" description="Visible across headers, manifests, and emails.">
            <div className="space-y-4">
              <TextInput
                label="Panel Display Name"
                value={settingsDraft.panelName}
                onChange={(e) => updateField('panelName', e.currentTarget.value)}
              />
              <TextInput
                label="Primary Panel URL"
                value={settingsDraft.panelUrl}
                onChange={(e) => updateField('panelUrl', e.currentTarget.value)}
              />
              <TextInput
                label="Tagline"
                value={settingsDraft.tagline}
                onChange={(e) => updateField('tagline', e.currentTarget.value)}
              />
            </div>
          </Card>

          <Card title="Security & Delivery" description="Access toggles, captcha provider, and SMTP relay.">
            <div className="space-y-4">
              <SwitchInput
                label="Require 2FA for all Administrator accounts"
                checked={settingsDraft.requireTwoFactorAdmin}
                onChange={(checked) => updateField('requireTwoFactorAdmin', checked)}
              />
              <SwitchInput
                label="Enable public account registration"
                checked={settingsDraft.registrationEnabled}
                onChange={(checked) => updateField('registrationEnabled', checked)}
              />
              <SwitchInput
                label="Maintenance mode (restrict non-admin access)"
                checked={settingsDraft.maintenanceMode}
                onChange={(checked) => updateField('maintenanceMode', checked)}
              />
              <SelectDropdown
                label="Captcha Provider"
                value={settingsDraft.captchaProvider}
                onChange={(val) =>
                  updateField(
                    'captchaProvider',
                    (val as CalagopusAdminSettings['captchaProvider']) ?? 'none',
                  )
                }
                data={[
                  { value: 'none', label: 'Disabled' },
                  { value: 'turnstile', label: 'Cloudflare Turnstile' },
                  { value: 'hcaptcha', label: 'hCaptcha' },
                ]}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextInput
                  label="SMTP Host"
                  value={settingsDraft.mailHost}
                  onChange={(e) => updateField('mailHost', e.currentTarget.value)}
                />
                <TextInput
                  label="From Address"
                  value={settingsDraft.mailFromAddress}
                  onChange={(e) => updateField('mailFromAddress', e.currentTarget.value)}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Admin · ${currentPath}`}
        description="Administrative endpoint overview."
        actions={
          <Button variant="secondary" size="sm" onClick={() => onNavigate('/admin')}>
            Admin Overview
          </Button>
        }
      />
      <EmptyState
        icon={<Settings className="h-5 w-5" />}
        title="Administrative Route Unavailable"
        description="Select a module from the Administration sidebar."
        actionLabel="Return to Admin Overview"
        onAction={() => onNavigate('/admin')}
      />
    </div>
  );
}
