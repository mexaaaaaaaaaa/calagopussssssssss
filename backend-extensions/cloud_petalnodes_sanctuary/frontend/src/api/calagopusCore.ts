import type { CalagopusServerSummary, ServerRuntimeState } from './calagopusDashboard';
import { sortRowsByKey, type SortDirection } from '../utils/themeHelpers';

export type ServerPowerAction = 'start' | 'restart' | 'stop' | 'kill';

export interface ServerTelemetryPoint {
  label: string;
  cpu: number;
  memoryMb: number;
  netInKb: number;
  netOutKb: number;
}

export interface CalagopusServerDetail extends CalagopusServerSummary {
  description: string;
  uptimeSeconds: number;
  netInBytesSec: number;
  netOutBytesSec: number;
  latencyMs: number;
  sftpHost: string;
  sftpPort: number;
  sftpUsername: string;
  javaOrRuntime: string;
  telemetryHistory: readonly ServerTelemetryPoint[];
}

export interface CalagopusConsoleLine {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CMD';
  source: string;
  message: string;
}

export interface CalagopusFileEntry {
  id: string;
  path: string;
  directory: string;
  name: string;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string;
  modifiedEpoch: number;
  permissions: string;
  mimeType: string;
  content?: string;
}

export interface CalagopusApiKey {
  id: string;
  identifier: string;
  description: string;
  allowedIps: readonly string[];
  permissions: readonly string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(kib >= 100 ? 0 : 1)} KiB`;
  const mib = kib / 1024;
  if (mib < 1024) return `${mib.toFixed(mib >= 100 ? 1 : 2)} MiB`;
  const gib = mib / 1024;
  return `${gib.toFixed(gib >= 10 ? 1 : 2)} GiB`;
}

export function formatBytesPerSecond(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatUptime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return 'Offline';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

export function normalizeDirectoryPath(dir: string): string {
  const rawSegments = dir
    .replace(/\\/g, '/')
    .replace(/\0/g, '')
    .trim()
    .split('/');
  const resolved: string[] = [];
  for (const seg of rawSegments) {
    const clean = seg.trim();
    if (!clean || clean === '.') continue;
    if (clean === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(clean);
  }
  return resolved.length > 0 ? `/${resolved.join('/')}` : '/';
}

const SAFE_SERVER_ID_RE = /^[a-zA-Z0-9_-]{2,64}$/;
const SAFE_SUB_ENDPOINT_RE = /^[a-zA-Z0-9/_-]+$/;
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;

const SAFE_RASTER_DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

export function sanitizeHref(href: string | undefined | null): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return undefined;
  if (trimmed.startsWith('//')) return undefined;
  if (trimmed === '#' || (trimmed.startsWith('#') && trimmed.length > 1)) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function sanitizeImageSrc(src: string | undefined | null): string | undefined {
  if (!src) return undefined;
  const trimmed = src.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return undefined;
  if (trimmed.startsWith('//')) return undefined;
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  if (SAFE_RASTER_DATA_IMAGE_RE.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function encodeUtf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function validateServerIdentifier(serverUuidShort: string): string {
  const clean = serverUuidShort.trim();
  if (!SAFE_SERVER_ID_RE.test(clean)) {
    throw new Error('Invalid server identifier.');
  }
  return clean;
}

export function sanitizeSubEndpoint(subEndpoint: string): string {
  const clean = subEndpoint.trim().replace(/^\/+|\/+$/g, '');
  if (
    !clean ||
    clean.includes('..') ||
    clean.includes('://') ||
    clean.includes('?') ||
    clean.includes('#') ||
    !SAFE_SUB_ENDPOINT_RE.test(clean)
  ) {
    throw new Error('Invalid Calagopus API endpoint path.');
  }
  return clean;
}

export async function calagopusFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const onExternalAbort = () => controller.abort(externalSignal?.reason);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timer = globalThis.setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  try {
    return await fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers,
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export async function extractSafeApiErrorMessage(
  res: Response,
  fallbackPrefix: string,
): Promise<string> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('application/json')) {
    try {
      const body = (await res.json()) as {
        message?: unknown;
        error?: unknown;
        errors?: Array<{ detail?: unknown }>;
      };
      const candidate =
        typeof body?.errors?.[0]?.detail === 'string'
          ? body.errors[0].detail
          : typeof body?.message === 'string'
            ? body.message
            : typeof body?.error === 'string'
              ? body.error
              : null;
      if (candidate) {
        const clean = candidate.replace(CONTROL_CHAR_RE, ' ').trim().slice(0, 180);
        if (clean) return `${fallbackPrefix} (${res.status}): ${clean}`;
      }
    } catch {
      // Fall back to status-only message on malformed error JSON
    }
  }
  return `${fallbackPrefix} returned HTTP ${res.status}`;
}

export interface DirectoryCrumb {
  label: string;
  path: string;
}

export function resolveDirectoryBreadcrumbs(directory: string): DirectoryCrumb[] {
  const normalized = normalizeDirectoryPath(directory);
  const crumbs: DirectoryCrumb[] = [{ label: 'container', path: '/' }];
  if (normalized === '/') return crumbs;

  const segments = normalized.split('/').filter(Boolean);
  let running = '';
  for (const seg of segments) {
    running += `/${seg}`;
    crumbs.push({ label: seg, path: running });
  }
  return crumbs;
}

export function filterFilesByQuery(
  entries: readonly CalagopusFileEntry[],
  currentDirectory: string,
  query: string,
): CalagopusFileEntry[] {
  const targetDir = normalizeDirectoryPath(currentDirectory);
  const q = query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (normalizeDirectoryPath(entry.directory) !== targetDir) {
      return false;
    }
    if (!q) return true;
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.permissions.toLowerCase().includes(q) ||
      entry.mimeType.toLowerCase().includes(q)
    );
  });
}

export type FileSortKey = 'name' | 'sizeBytes' | 'modifiedEpoch';

export function sortFiles(
  entries: readonly CalagopusFileEntry[],
  sortKey: FileSortKey,
  direction: SortDirection,
): CalagopusFileEntry[] {
  const dirs = entries.filter((e) => e.isDirectory);
  const files = entries.filter((e) => !e.isDirectory);

  return [
    ...sortRowsByKey(dirs, sortKey, direction),
    ...sortRowsByKey(files, sortKey, direction),
  ];
}

export function validateFilename(name: string, existingNames: readonly string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required.';
  if (trimmed === '.' || trimmed === '..') return 'Reserved relative path is not allowed.';
  if (trimmed.includes('/') || trimmed.includes('\\') || CONTROL_CHAR_RE.test(trimmed)) {
    return 'Name cannot contain slashes or null characters.';
  }
  if (trimmed.length > 120) return 'Name must be 120 characters or fewer.';
  if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
    return `"${trimmed}" already exists in this directory.`;
  }
  return null;
}

export function validateFileMode(mode: string): string | null {
  const trimmed = mode.trim();
  if (!trimmed) return 'Permission mode is required.';
  const isPosix = /^[-d]([r-][w-][x-]){3}$/.test(trimmed);
  const isOctal = /^0?[0-7]{3,4}$/.test(trimmed);
  if (!isPosix && !isOctal) {
    return 'Enter a valid POSIX string (e.g. -rw-r--r--) or octal mode (e.g. 644).';
  }
  return null;
}

export function sanitizeDownloadFilename(name: string): string {
  const cleaned = name
    .replace(/[/\\\0]/g, '_')
    .replace(CONTROL_CHAR_RE, '')
    .trim();
  if (!cleaned || cleaned === '.' || cleaned === '..') return 'download.bin';
  return cleaned;
}

export function filterConsoleLines(
  lines: readonly CalagopusConsoleLine[],
  query: string,
): CalagopusConsoleLine[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...lines];
  return lines.filter(
    (line) =>
      line.message.toLowerCase().includes(q) ||
      line.source.toLowerCase().includes(q) ||
      line.level.toLowerCase().includes(q),
  );
}

export function filterApiKeys(
  keys: readonly CalagopusApiKey[],
  query: string,
  permissionFilter: string,
): CalagopusApiKey[] {
  const q = query.trim().toLowerCase();
  return keys.filter((key) => {
    const matchesPermission =
      !permissionFilter ||
      permissionFilter === 'all' ||
      key.permissions.includes(permissionFilter);
    if (!matchesPermission) return false;
    if (!q) return true;
    return (
      key.description.toLowerCase().includes(q) ||
      key.identifier.toLowerCase().includes(q) ||
      key.allowedIps.some((ip) => ip.toLowerCase().includes(q))
    );
  });
}

function isValidIpv4OrCidr(entry: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(entry);
  if (!match) return false;
  for (let i = 1; i <= 4; i += 1) {
    const octet = Number(match[i]);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return false;
  }
  if (match[5] !== undefined) {
    const prefix = Number(match[5]);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  }
  return true;
}

function isValidIpv6OrCidr(entry: string): boolean {
  if (!entry.includes(':')) return false;
  const [addr, prefixRaw, ...extra] = entry.split('/');
  if (extra.length > 0 || !addr) return false;
  if (prefixRaw !== undefined) {
    if (!/^\d{1,3}$/.test(prefixRaw)) return false;
    const prefix = Number(prefixRaw);
    if (prefix < 0 || prefix > 128) return false;
  }
  if (!/^[0-9a-fA-F:]+$/.test(addr)) return false;
  const doubleColons = addr.split('::');
  if (doubleColons.length > 2) return false;
  const groups = addr.split(':').filter((g, i, arr) => !(g === '' && (i === 0 || i === arr.length - 1)));
  if (doubleColons.length === 1 && groups.length !== 8) return false;
  if (doubleColons.length === 2 && groups.length > 7) return false;
  return groups.every((g) => g.length <= 4 && (/^[0-9a-fA-F]{1,4}$/.test(g) || g === ''));
}

export function validateApiKeyInput(
  description: string,
  allowedIpsRaw: string,
): { descriptionError?: string; allowedIpsError?: string; parsedIps: string[] } {
  const trimmedDesc = description.trim();
  let descriptionError: string | undefined;
  if (!trimmedDesc) {
    descriptionError = 'Description is required.';
  } else if (trimmedDesc.length < 3) {
    descriptionError = 'Description must be at least 3 characters.';
  }

  const parsedIps = allowedIpsRaw
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  let allowedIpsError: string | undefined;
  for (const ip of parsedIps) {
    if (!isValidIpv4OrCidr(ip) && !isValidIpv6OrCidr(ip)) {
      allowedIpsError = `Invalid IP or CIDR entry: "${ip}"`;
      break;
    }
  }

  return { descriptionError, allowedIpsError, parsedIps };
}

export function paginateSlice<T>(
  items: readonly T[],
  currentPage: number,
  pageSize: number,
): { pageItems: T[]; safePage: number } {
  const safeSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * safeSize;
  return {
    pageItems: items.slice(start, start + safeSize),
    safePage,
  };
}

export function nextRuntimeStateForPowerAction(action: ServerPowerAction): ServerRuntimeState {
  if (action === 'start' || action === 'restart') return 'running';
  if (action === 'stop') return 'stopping';
  return 'offline';
}

export async function sendServerPowerSignal(
  serverUuidShort: string,
  action: ServerPowerAction,
  signal?: AbortSignal,
): Promise<void> {
  const safeId = validateServerIdentifier(serverUuidShort);
  const res = await calagopusFetch(`/api/client/servers/${encodeURIComponent(safeId)}/power`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signal: action }),
  });
  if (!res.ok) {
    throw new Error(await extractSafeApiErrorMessage(res, 'Calagopus power endpoint'));
  }
}

export async function saveServerFileContentApi(
  serverUuidShort: string,
  filePath: string,
  content: string,
  signal?: AbortSignal,
): Promise<void> {
  const safeId = validateServerIdentifier(serverUuidShort);
  const safeFilePath = normalizeDirectoryPath(filePath);
  if (safeFilePath === '/') {
    throw new Error('Target file path is required.');
  }
  const res = await calagopusFetch(
    `/api/client/servers/${encodeURIComponent(safeId)}/files/write?file=${encodeURIComponent(safeFilePath)}`,
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: content,
    },
  );
  if (!res.ok) {
    throw new Error(await extractSafeApiErrorMessage(res, 'Calagopus file write API'));
  }
}

export const SANDBOX_EXTRA_SERVERS: readonly CalagopusServerSummary[] = [
  {
    id: 'srv-delta-04',
    uuidShort: 'delta-04',
    name: 'Creative PlotWorld',
    node: 'eu-west-1',
    allocation: '198.51.100.14:25580',
    eggName: 'Purpur 1.21',
    state: 'running',
    cpuPercent: 12.4,
    memoryUsedMb: 2150,
    memoryLimitMb: 4096,
    diskUsedMb: 8400,
    diskLimitMb: 25600,
  },
  {
    id: 'srv-echo-05',
    uuidShort: 'echo-05',
    name: 'Cobblemon Fabric SMP',
    node: 'ap-south-1',
    allocation: '203.0.113.88:25568',
    eggName: 'Fabric 1.21',
    state: 'running',
    cpuPercent: 41.8,
    memoryUsedMb: 5320,
    memoryLimitMb: 8192,
    diskUsedMb: 14200,
    diskLimitMb: 30720,
  },
  {
    id: 'srv-foxtrot-06',
    uuidShort: 'foxtrot-06',
    name: 'Bedrock Crossplay Realm',
    node: 'us-east-2',
    allocation: '203.0.113.42:19132',
    eggName: 'Bedrock Dedicated',
    state: 'offline',
    cpuPercent: 0,
    memoryUsedMb: 0,
    memoryLimitMb: 4096,
    diskUsedMb: 5120,
    diskLimitMb: 20480,
  },
];

export const SANDBOX_SERVER_DETAILS: Record<string, CalagopusServerDetail> = {
  'alpha-01': {
    id: 'srv-alpha-01',
    uuidShort: 'alpha-01',
    name: 'PaperMC Survival',
    description: 'Primary survival SMP node running Paper 1.21 with Geyser crossplay bridge.',
    node: 'eu-west-1',
    allocation: '198.51.100.14:25565',
    eggName: 'Paper 1.21',
    state: 'running',
    cpuPercent: 34.2,
    memoryUsedMb: 4280,
    memoryLimitMb: 8192,
    diskUsedMb: 18400,
    diskLimitMb: 51200,
    uptimeSeconds: 230280,
    netInBytesSec: 18432,
    netOutBytesSec: 46080,
    latencyMs: 42,
    sftpHost: 'sftp.eu-west-1.calagopus.local',
    sftpPort: 2022,
    sftpUsername: 'elena.alpha-01',
    javaOrRuntime: 'Eclipse Temurin Java 21 LTS',
    telemetryHistory: [
      { label: '23:00', cpu: 28, memoryMb: 3920, netInKb: 14, netOutKb: 38 },
      { label: '23:05', cpu: 31, memoryMb: 4010, netInKb: 16, netOutKb: 41 },
      { label: '23:10', cpu: 39, memoryMb: 4150, netInKb: 22, netOutKb: 52 },
      { label: '23:15', cpu: 36, memoryMb: 4220, netInKb: 19, netOutKb: 49 },
      { label: '23:20', cpu: 32, memoryMb: 4260, netInKb: 17, netOutKb: 43 },
      { label: '23:25', cpu: 34, memoryMb: 4280, netInKb: 18, netOutKb: 45 },
    ],
  },
  'bravo-02': {
    id: 'srv-bravo-02',
    uuidShort: 'bravo-02',
    name: 'Velocity Proxy',
    description: 'Edge Velocity proxy routing survival and creative lobby players.',
    node: 'eu-west-1',
    allocation: '198.51.100.14:25577',
    eggName: 'Velocity',
    state: 'running',
    cpuPercent: 8.6,
    memoryUsedMb: 640,
    memoryLimitMb: 2048,
    diskUsedMb: 1200,
    diskLimitMb: 10240,
    uptimeSeconds: 412800,
    netInBytesSec: 24576,
    netOutBytesSec: 65536,
    latencyMs: 28,
    sftpHost: 'sftp.eu-west-1.calagopus.local',
    sftpPort: 2022,
    sftpUsername: 'elena.bravo-02',
    javaOrRuntime: 'Eclipse Temurin Java 21 LTS',
    telemetryHistory: [
      { label: '23:00', cpu: 7, memoryMb: 610, netInKb: 21, netOutKb: 58 },
      { label: '23:05', cpu: 9, memoryMb: 625, netInKb: 25, netOutKb: 63 },
      { label: '23:10', cpu: 8, memoryMb: 630, netInKb: 23, netOutKb: 61 },
      { label: '23:15', cpu: 10, memoryMb: 638, netInKb: 26, netOutKb: 67 },
      { label: '23:20', cpu: 8, memoryMb: 635, netInKb: 22, netOutKb: 62 },
      { label: '23:25', cpu: 9, memoryMb: 640, netInKb: 24, netOutKb: 64 },
    ],
  },
  'charlie-03': {
    id: 'srv-charlie-03',
    uuidShort: 'charlie-03',
    name: 'Staging Forge Modpack',
    description: 'Pre-release modpack validation server on us-east-2.',
    node: 'us-east-2',
    allocation: '203.0.113.42:25566',
    eggName: 'Forge Server',
    state: 'offline',
    cpuPercent: 0,
    memoryUsedMb: 0,
    memoryLimitMb: 6144,
    diskUsedMb: 9800,
    diskLimitMb: 40960,
    uptimeSeconds: 0,
    netInBytesSec: 0,
    netOutBytesSec: 0,
    latencyMs: 0,
    sftpHost: 'sftp.us-east-2.calagopus.local',
    sftpPort: 2022,
    sftpUsername: 'elena.charlie-03',
    javaOrRuntime: 'Eclipse Temurin Java 17 LTS',
    telemetryHistory: [
      { label: '23:00', cpu: 0, memoryMb: 0, netInKb: 0, netOutKb: 0 },
      { label: '23:05', cpu: 0, memoryMb: 0, netInKb: 0, netOutKb: 0 },
      { label: '23:10', cpu: 0, memoryMb: 0, netInKb: 0, netOutKb: 0 },
      { label: '23:15', cpu: 0, memoryMb: 0, netInKb: 0, netOutKb: 0 },
      { label: '23:20', cpu: 0, memoryMb: 0, netInKb: 0, netOutKb: 0 },
      { label: '23:25', cpu: 0, memoryMb: 0, netInKb: 0, netOutKb: 0 },
    ],
  },
};

export const SANDBOX_CONSOLE_LOGS: readonly CalagopusConsoleLine[] = [
  {
    id: 'log-1',
    timestamp: '16:39:39',
    level: 'INFO',
    source: 'Geyser-Spigot',
    message: 'Registered 1 custom items for Bedrock parity.',
  },
  {
    id: 'log-2',
    timestamp: '16:39:42',
    level: 'INFO',
    source: 'StunObserver',
    message: 'Running STUN discovery through stun.cloudflare.com:3478 on udp/19132',
  },
  {
    id: 'log-3',
    timestamp: '16:39:43',
    level: 'INFO',
    source: 'ServerLevel',
    message: 'Saving chunks for level minecraft:overworld, minecraft:the_nether, minecraft:the_end',
  },
  {
    id: 'log-4',
    timestamp: '16:39:44',
    level: 'INFO',
    source: 'Server',
    message: 'Done (19.78s)! For help, type "help"',
  },
  {
    id: 'log-5',
    timestamp: '16:40:06',
    level: 'WARN',
    source: 'PaperVersionCheck',
    message: 'Currently running Paper build #142 (4 builds behind upstream release).',
  },
  {
    id: 'log-6',
    timestamp: '16:50:44',
    level: 'INFO',
    source: 'System',
    message: 'There are 3 of a max of 20 players online: elena_dev, aria_mc, kira_builds',
  },
];

export const SANDBOX_SERVER_FILES: readonly CalagopusFileEntry[] = [
  {
    id: 'file-dir-cache',
    path: '/.cache',
    directory: '/',
    name: '.cache',
    isDirectory: true,
    sizeBytes: 12288,
    modifiedAt: '6 days ago',
    modifiedEpoch: 1731715200,
    permissions: 'drwxr-xr-x',
    mimeType: 'inode/directory',
  },
  {
    id: 'file-dir-config',
    path: '/config',
    directory: '/',
    name: 'config',
    isDirectory: true,
    sizeBytes: 17326,
    modifiedAt: '3 days ago',
    modifiedEpoch: 1731974400,
    permissions: 'drwxr-xr-x',
    mimeType: 'inode/directory',
  },
  {
    id: 'file-dir-logs',
    path: '/logs',
    directory: '/',
    name: 'logs',
    isDirectory: true,
    sizeBytes: 16538,
    modifiedAt: '2 hours ago',
    modifiedEpoch: 1732309200,
    permissions: 'drwxr-xr-x',
    mimeType: 'inode/directory',
  },
  {
    id: 'file-dir-plugins',
    path: '/plugins',
    directory: '/',
    name: 'plugins',
    isDirectory: true,
    sizeBytes: 65221427,
    modifiedAt: '6 days ago',
    modifiedEpoch: 1731715200,
    permissions: 'drwxr-xr-x',
    mimeType: 'inode/directory',
  },
  {
    id: 'file-dir-world',
    path: '/world',
    directory: '/',
    name: 'world',
    isDirectory: true,
    sizeBytes: 214958080,
    modifiedAt: '12 mins ago',
    modifiedEpoch: 1732315680,
    permissions: 'drwxr-xr-x',
    mimeType: 'inode/directory',
  },
  {
    id: 'file-root-eula',
    path: '/eula.txt',
    directory: '/',
    name: 'eula.txt',
    isDirectory: false,
    sizeBytes: 184,
    modifiedAt: '6 days ago',
    modifiedEpoch: 1731715200,
    permissions: '-rw-r--r--',
    mimeType: 'text/plain',
    content: '# By changing the setting below to TRUE you are indicating your agreement to the Minecraft EULA.\neula=true\n',
  },
  {
    id: 'file-root-props',
    path: '/server.properties',
    directory: '/',
    name: 'server.properties',
    isDirectory: false,
    sizeBytes: 1294,
    modifiedAt: '2 days ago',
    modifiedEpoch: 1732060800,
    permissions: '-rw-r--r--',
    mimeType: 'text/plain',
    content:
      'server-port=25565\nmotd=Calagopus Blush SMP - Paper 1.21\nmax-players=20\nview-distance=10\nonline-mode=true\ndifficulty=normal\nwhite-list=true\n',
  },
  {
    id: 'file-root-bukkit',
    path: '/bukkit.yml',
    directory: '/',
    name: 'bukkit.yml',
    isDirectory: false,
    sizeBytes: 1024,
    modifiedAt: '5 days ago',
    modifiedEpoch: 1731801600,
    permissions: '-rw-r--r--',
    mimeType: 'application/yaml',
    content:
      'settings:\n  allow-end: true\n  connection-throttle: 4000\n  shutdown-message: Server restarting cleanly\nspawn-limits:\n  monsters: 70\n  animals: 10\n',
  },
  {
    id: 'file-root-spigot',
    path: '/spigot.yml',
    directory: '/',
    name: 'spigot.yml',
    isDirectory: false,
    sizeBytes: 2480,
    modifiedAt: '5 days ago',
    modifiedEpoch: 1731801600,
    permissions: '-rw-r--r--',
    mimeType: 'application/yaml',
    content: 'settings:\n  bungeecord: false\n  timeout-time: 60\n  restart-on-crash: true\n',
  },
  {
    id: 'file-root-whitelist',
    path: '/whitelist.json',
    directory: '/',
    name: 'whitelist.json',
    isDirectory: false,
    sizeBytes: 412,
    modifiedAt: '1 day ago',
    modifiedEpoch: 1732230000,
    permissions: '-rw-r--r--',
    mimeType: 'application/json',
    content: '[\n  { "uuid": "8d4d2c94-1e4f-41f3-a5a2-1234567890ab", "name": "elena_dev" }\n]\n',
  },
  {
    id: 'file-root-ops',
    path: '/ops.json',
    directory: '/',
    name: 'ops.json',
    isDirectory: false,
    sizeBytes: 296,
    modifiedAt: '1 day ago',
    modifiedEpoch: 1732226400,
    permissions: '-rw-r--r--',
    mimeType: 'application/json',
    content: '[\n  { "uuid": "8d4d2c94-1e4f-41f3-a5a2-1234567890ab", "name": "elena_dev", "level": 4 }\n]\n',
  },
  {
    id: 'file-root-jar',
    path: '/paper-1.21.1-142.jar',
    directory: '/',
    name: 'paper-1.21.1-142.jar',
    isDirectory: false,
    sizeBytes: 49283072,
    modifiedAt: '6 days ago',
    modifiedEpoch: 1731715200,
    permissions: '-rw-r--r--',
    mimeType: 'application/java-archive',
  },
  {
    id: 'file-config-paper',
    path: '/config/paper-global.yml',
    directory: '/config',
    name: 'paper-global.yml',
    isDirectory: false,
    sizeBytes: 3840,
    modifiedAt: '3 days ago',
    modifiedEpoch: 1731974400,
    permissions: '-rw-r--r--',
    mimeType: 'application/yaml',
    content:
      '_version: 29\nproxies:\n  velocity:\n    enabled: true\n    online-mode: true\nchunk-loading-basic:\n  player-max-chunk-load-rate: 100.0\n',
  },
  {
    id: 'file-logs-latest',
    path: '/logs/latest.log',
    directory: '/logs',
    name: 'latest.log',
    isDirectory: false,
    sizeBytes: 18944,
    modifiedAt: '5 mins ago',
    modifiedEpoch: 1732316100,
    permissions: '-rw-r--r--',
    mimeType: 'text/plain',
    content: '[16:39:44 INFO]: Done (19.78s)! For help, type "help"\n[16:50:44 INFO]: Players online: 3/20\n',
  },
  {
    id: 'file-plugins-geyser',
    path: '/plugins/Geyser-Spigot.jar',
    directory: '/plugins',
    name: 'Geyser-Spigot.jar',
    isDirectory: false,
    sizeBytes: 24576000,
    modifiedAt: '6 days ago',
    modifiedEpoch: 1731715200,
    permissions: '-rw-r--r--',
    mimeType: 'application/java-archive',
  },
];

export const SANDBOX_API_KEYS: readonly CalagopusApiKey[] = [
  {
    id: 'key-1',
    identifier: 'ptlc_01J9A7B2',
    description: 'CI/CD Automated Backup Trigger',
    allowedIps: ['198.51.100.9', '198.51.100.10/31'],
    permissions: ['server.read', 'backup.create', 'control.power'],
    lastUsedAt: '2026-11-22 19:30',
    createdAt: '2026-09-14',
  },
  {
    id: 'key-2',
    identifier: 'ptlc_01J8K3M9',
    description: 'Prometheus Node Exporter',
    allowedIps: ['192.0.2.40'],
    permissions: ['server.read'],
    lastUsedAt: '2026-11-22 23:12',
    createdAt: '2026-10-02',
  },
  {
    id: 'key-3',
    identifier: 'ptlc_01J7Z4Q1',
    description: 'Modpack Deployment Sync',
    allowedIps: [],
    permissions: ['server.read', 'file.write', 'control.power'],
    lastUsedAt: '2026-11-18 14:22',
    createdAt: '2026-10-19',
  },
  {
    id: 'key-4',
    identifier: 'ptlc_01J6R8W5',
    description: 'Billing Provisioning Webhook',
    allowedIps: ['203.0.113.15'],
    permissions: ['server.read', 'database.read'],
    lastUsedAt: null,
    createdAt: '2026-11-05',
  },
  {
    id: 'key-5',
    identifier: 'ptlc_01J5P2N8',
    description: 'Readonly Status Discord Bot',
    allowedIps: ['198.51.100.77'],
    permissions: ['server.read'],
    lastUsedAt: '2026-11-22 22:01',
    createdAt: '2026-11-11',
  },
  {
    id: 'key-6',
    identifier: 'ptlc_01J4T9V3',
    description: 'Nightly Log Archiver',
    allowedIps: ['192.0.2.18'],
    permissions: ['server.read', 'file.read'],
    lastUsedAt: '2026-11-21 03:00',
    createdAt: '2026-11-19',
  },
];
