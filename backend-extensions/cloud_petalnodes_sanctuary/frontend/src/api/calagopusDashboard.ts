import { calagopusFetch, extractSafeApiErrorMessage } from './calagopusCore';

export type ServerRuntimeState = 'running' | 'starting' | 'stopping' | 'offline' | 'suspended';

export interface CalagopusServerSummary {
  id: string;
  uuidShort: string;
  name: string;
  node: string;
  allocation: string;
  eggName: string;
  state: ServerRuntimeState;
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  diskUsedMb: number;
  diskLimitMb: number;
}

export interface CalagopusActivityEntry {
  id: string;
  event: string;
  description: string;
  actor: string;
  ipAddress: string;
  timestamp: string;
  status: 'completed' | 'warning' | 'failed';
}

export interface CalagopusAdminSystemStats {
  panelVersion: string;
  kernel: string;
  postgresVersion: string;
  cacheEngine: string;
  cacheHitRate: number;
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  nodesOnline: number;
  nodesTotal: number;
  totalServers: number;
  totalUsers: number;
  cpuHistory: readonly { label: string; value: number }[];
  memoryHistory: readonly { label: string; value: number }[];
}

export interface ServerOverviewMetrics {
  total: number;
  running: number;
  offline: number;
  allocatedMemoryMb: number;
}

export function computeServerOverviewMetrics(
  servers: readonly CalagopusServerSummary[],
): ServerOverviewMetrics {
  let running = 0;
  let offline = 0;
  let allocatedMemoryMb = 0;

  for (const server of servers) {
    if (server.state === 'running' || server.state === 'starting') {
      running += 1;
    } else {
      offline += 1;
    }
    allocatedMemoryMb += Math.max(0, server.memoryLimitMb);
  }

  return {
    total: servers.length,
    running,
    offline,
    allocatedMemoryMb,
  };
}

export function filterServersByQuery(
  servers: readonly CalagopusServerSummary[],
  query: string,
): CalagopusServerSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...servers];

  return servers.filter(
    (srv) =>
      srv.name.toLowerCase().includes(normalized) ||
      srv.uuidShort.toLowerCase().includes(normalized) ||
      srv.node.toLowerCase().includes(normalized) ||
      srv.allocation.toLowerCase().includes(normalized) ||
      srv.eggName.toLowerCase().includes(normalized),
  );
}

export function formatMegabytes(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return '0 MiB';
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GiB`;
  }
  return `${Math.round(mb)} MiB`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${Math.max(0, value).toFixed(1)}%`;
}

export interface ClientDashboardPayload {
  servers: CalagopusServerSummary[];
  activity: CalagopusActivityEntry[];
}

export interface AdminDashboardPayload {
  system: CalagopusAdminSystemStats;
  auditLogs: CalagopusActivityEntry[];
}

export async function fetchClientDashboardFromApi(
  signal?: AbortSignal,
): Promise<ClientDashboardPayload> {
  const [serversRes, activityRes] = await Promise.all([
    calagopusFetch('/api/client', { signal }),
    calagopusFetch('/api/client/account/activity', { signal }),
  ]);

  if (!serversRes.ok) {
    throw new Error(await extractSafeApiErrorMessage(serversRes, 'Calagopus client API'));
  }
  if (!activityRes.ok) {
    throw new Error(await extractSafeApiErrorMessage(activityRes, 'Calagopus activity API'));
  }

  const serversJson = (await serversRes.json()) as { data?: CalagopusServerSummary[] };
  const activityJson = (await activityRes.json()) as { data?: CalagopusActivityEntry[] };

  return {
    servers: Array.isArray(serversJson?.data) ? serversJson.data : [],
    activity: Array.isArray(activityJson?.data) ? activityJson.data : [],
  };
}

export async function fetchAdminDashboardFromApi(
  signal?: AbortSignal,
): Promise<AdminDashboardPayload> {
  const [systemRes, logsRes] = await Promise.all([
    calagopusFetch('/api/admin/system', { signal }),
    calagopusFetch('/api/admin/activity', { signal }),
  ]);

  if (!systemRes.ok) {
    throw new Error(await extractSafeApiErrorMessage(systemRes, 'Calagopus admin system API'));
  }
  if (!logsRes.ok) {
    throw new Error(await extractSafeApiErrorMessage(logsRes, 'Calagopus admin audit API'));
  }

  const systemJson = (await systemRes.json()) as { data?: CalagopusAdminSystemStats };
  const logsJson = (await logsRes.json()) as { data?: CalagopusActivityEntry[] };

  if (!systemJson?.data || typeof systemJson.data !== 'object') {
    throw new Error('Calagopus admin system API returned an invalid payload.');
  }

  return {
    system: systemJson.data,
    auditLogs: Array.isArray(logsJson?.data) ? logsJson.data : [],
  };
}

/**
 * Deterministic preview fixtures used ONLY when explicitly selected in the
 * standalone sandbox preview (since no live Rust/Axum panel backend runs here).
 */
export const SANDBOX_CLIENT_FIXTURE: ClientDashboardPayload = {
  servers: [
    {
      id: 'srv-alpha-01',
      uuidShort: 'alpha-01',
      name: 'PaperMC Survival',
      node: 'eu-west-1',
      allocation: '198.51.100.14:25565',
      eggName: 'Paper 1.21',
      state: 'running',
      cpuPercent: 34.2,
      memoryUsedMb: 4280,
      memoryLimitMb: 8192,
      diskUsedMb: 18400,
      diskLimitMb: 51200,
    },
    {
      id: 'srv-bravo-02',
      uuidShort: 'bravo-02',
      name: 'Velocity Proxy',
      node: 'eu-west-1',
      allocation: '198.51.100.14:25577',
      eggName: 'Velocity',
      state: 'running',
      cpuPercent: 8.6,
      memoryUsedMb: 640,
      memoryLimitMb: 2048,
      diskUsedMb: 1200,
      diskLimitMb: 10240,
    },
    {
      id: 'srv-charlie-03',
      uuidShort: 'charlie-03',
      name: 'Staging Forge Modpack',
      node: 'us-east-2',
      allocation: '203.0.113.42:25566',
      eggName: 'Forge Server',
      state: 'offline',
      cpuPercent: 0,
      memoryUsedMb: 0,
      memoryLimitMb: 6144,
      diskUsedMb: 9800,
      diskLimitMb: 40960,
    },
  ],
  activity: [
    {
      id: 'act-1',
      event: 'server:power.start',
      description: 'Started PaperMC Survival container',
      actor: 'elena.rostova',
      ipAddress: '192.0.2.18',
      timestamp: '2026-11-22 22:48',
      status: 'completed',
    },
    {
      id: 'act-2',
      event: 'server:backup.create',
      description: 'Created snapshot backup on Velocity Proxy',
      actor: 'elena.rostova',
      ipAddress: '192.0.2.18',
      timestamp: '2026-11-22 21:15',
      status: 'completed',
    },
    {
      id: 'act-3',
      event: 'auth:api-key.used',
      description: 'Authenticated client API request',
      actor: 'ci-deploy-token',
      ipAddress: '198.51.100.9',
      timestamp: '2026-11-22 19:30',
      status: 'completed',
    },
    {
      id: 'act-4',
      event: 'server:power.stop',
      description: 'Graceful shutdown on Staging Forge Modpack',
      actor: 'elena.rostova',
      ipAddress: '192.0.2.18',
      timestamp: '2026-11-22 17:04',
      status: 'warning',
    },
  ],
};

export const SANDBOX_ADMIN_FIXTURE: AdminDashboardPayload = {
  system: {
    panelVersion: '1.2.10',
    kernel: 'Linux 6.8 (Rust/Axum)',
    postgresVersion: 'PostgreSQL 16.4',
    cacheEngine: 'Valkey 8.0',
    cacheHitRate: 97.4,
    cpuPercent: 28.5,
    memoryUsedMb: 11264,
    memoryTotalMb: 32768,
    nodesOnline: 3,
    nodesTotal: 3,
    totalServers: 18,
    totalUsers: 42,
    cpuHistory: [
      { label: '18:00', value: 21 },
      { label: '19:00', value: 25 },
      { label: '20:00', value: 34 },
      { label: '21:00', value: 31 },
      { label: '22:00', value: 27 },
      { label: '23:00', value: 29 },
    ],
    memoryHistory: [
      { label: '18:00', value: 31 },
      { label: '19:00', value: 33 },
      { label: '20:00', value: 36 },
      { label: '21:00', value: 35 },
      { label: '22:00', value: 34 },
      { label: '23:00', value: 34 },
    ],
  },
  auditLogs: [
    {
      id: 'adm-1',
      event: 'admin:node.heartbeat',
      description: 'eu-west-1 Wings daemon verified healthy',
      actor: 'system',
      ipAddress: '198.51.100.14',
      timestamp: '2026-11-22 23:10',
      status: 'completed',
    },
    {
      id: 'adm-2',
      event: 'admin:extension.build',
      description: 'Validated cloud.petalnodes.sanctuary theme assets',
      actor: 'elena.rostova',
      ipAddress: '192.0.2.18',
      timestamp: '2026-11-22 22:02',
      status: 'completed',
    },
    {
      id: 'adm-3',
      event: 'admin:role.update',
      description: 'Updated subuser permission scope for Staging',
      actor: 'elena.rostova',
      ipAddress: '192.0.2.18',
      timestamp: '2026-11-22 20:41',
      status: 'completed',
    },
  ],
};
