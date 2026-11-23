import {
  calagopusFetch,
  extractSafeApiErrorMessage,
  normalizeDirectoryPath,
  sanitizeDownloadFilename,
  sanitizeSubEndpoint,
  validateServerIdentifier,
} from './calagopusCore';
import type { SortDirection } from '../utils/themeHelpers';
import { sortRowsByKey } from '../utils/themeHelpers';

export interface CalagopusDatabaseRecord {
  id: string;
  serverId: string;
  name: string;
  username: string;
  host: string;
  port: number;
  connectionsFrom: string;
  maxConnections: number;
  password: string;
}

export interface CalagopusBackupRecord {
  id: string;
  uuidShort: string;
  serverId: string;
  name: string;
  checksum: string;
  bytes: number;
  createdAt: string;
  isLocked: boolean;
  isSuccessful: boolean;
  ignoredFiles: string;
}

export interface CalagopusScheduleTask {
  id: string;
  sequenceId: number;
  action: 'command' | 'power' | 'backup';
  payload: string;
  timeOffsetSeconds: number;
}

export interface CalagopusScheduleRecord {
  id: string;
  serverId: string;
  name: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  isActive: boolean;
  onlyWhenOnline: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  tasks: readonly CalagopusScheduleTask[];
}

export interface CalagopusAllocationRecord {
  id: string;
  serverId: string;
  ip: string;
  alias: string;
  port: number;
  notes: string;
  isPrimary: boolean;
}

export interface CalagopusStartupVariable {
  envKey: string;
  name: string;
  description: string;
  value: string;
  rules: string;
  isEditable: boolean;
}

export interface CalagopusStartupConfig {
  serverId: string;
  startupCommand: string;
  dockerImage: string;
  availableImages: readonly { label: string; value: string }[];
  variables: readonly CalagopusStartupVariable[];
}

export interface CalagopusSubuserRecord {
  id: string;
  serverId: string;
  username: string;
  email: string;
  permissions: readonly string[];
  createdAt: string;
}

export interface CalagopusSshKeyRecord {
  id: string;
  name: string;
  fingerprint: string;
  publicKeyPreview: string;
  createdAt: string;
}

export interface PetalnodesUiPreferences {
  confirmDestructiveActions: boolean;
  compactTableRows: boolean;
  consoleAutoScrollDefault: boolean;
}

export interface CalagopusAdminNode {
  id: string;
  name: string;
  fqdn: string;
  location: string;
  memoryMb: number;
  memoryAllocatedMb: number;
  diskMb: number;
  diskAllocatedMb: number;
  serversCount: number;
  status: 'online' | 'maintenance';
}

export interface CalagopusAdminExtension {
  identifier: string;
  name: string;
  version: string;
  author: string;
  status: 'active' | 'disabled';
  description: string;
}

export const DEFAULT_UI_PREFERENCES: PetalnodesUiPreferences = {
  confirmDestructiveActions: true,
  compactTableRows: false,
  consoleAutoScrollDefault: true,
};

export function validateDatabaseName(name: string, existingNames: readonly string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Database name is required.';
  if (!/^[a-zA-Z0-9_]{2,48}$/.test(trimmed)) {
    return 'Use 2–48 alphanumeric characters or underscores only.';
  }
  if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
    return `Database "${trimmed}" already exists on this server.`;
  }
  return null;
}

export function validateConnectionsFrom(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '%') return null;
  if (trimmed.length > 64) {
    return 'Host pattern must be 64 characters or fewer.';
  }
  if (/\s/.test(trimmed) || !/^[a-zA-Z0-9.%:/_-]+$/.test(trimmed)) {
    return 'Use %, IPv4/CIDR, or a host wildcard pattern (e.g. 10.40.0.%).';
  }
  if (trimmed.includes('/')) {
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(trimmed);
    if (!match) return 'CIDR notation must be valid IPv4/prefix (e.g. 10.40.0.0/24).';
    for (let i = 1; i <= 4; i += 1) {
      const oct = Number(match[i]);
      if (oct < 0 || oct > 255) return 'IPv4 octets must be between 0 and 255.';
    }
    const prefix = Number(match[5]);
    if (prefix < 0 || prefix > 32) return 'CIDR prefix must be between 0 and 32.';
    return null;
  }
  if (/^\d+(?:\.\d+){3}$/.test(trimmed)) {
    const parts = trimmed.split('.').map(Number);
    if (parts.some((p) => p < 0 || p > 255)) {
      return 'IPv4 octets must be between 0 and 255.';
    }
    return null;
  }
  if (trimmed.includes('%')) {
    return null;
  }
  return 'Enter %, a valid IPv4/CIDR address, or a MySQL wildcard (e.g. 10.40.0.%).';
}

export function validateBackupName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Backup name is required.';
  if (trimmed.length < 3 || trimmed.length > 80) {
    return 'Backup name must be between 3 and 80 characters.';
  }
  return null;
}

export function computeBackupStorageBytes(backups: readonly CalagopusBackupRecord[]): number {
  return backups.reduce((total, b) => total + (b.isSuccessful ? Math.max(0, b.bytes) : 0), 0);
}

const CRON_FIELD_REGEX = /^(\*|\d+|\*\/\d+|\d+-\d+|\d+(,\d+)+)$/;

export function validateScheduleInput(input: {
  name: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}): {
  nameError?: string;
  cronError?: string;
} {
  const trimmedName = input.name.trim();
  const fields = [input.minute, input.hour, input.dayOfMonth, input.month, input.dayOfWeek].map(
    (v) => v.trim(),
  );

  const nameError =
    trimmedName.length < 2 ? 'Schedule name must be at least 2 characters.' : undefined;
  const cronError = fields.some((f) => !CRON_FIELD_REGEX.test(f))
    ? 'Each cron field must be valid syntax (e.g. *, */15, 0, or 1-5).'
    : undefined;

  return { nameError, cronError };
}

export function formatCronSummary(schedule: Pick<CalagopusScheduleRecord, 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'>): string {
  return `${schedule.minute} ${schedule.hour} ${schedule.dayOfMonth} ${schedule.month} ${schedule.dayOfWeek}`;
}

export function validateSubuserEmail(email: string, existingEmails: readonly string[]): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  if (existingEmails.some((e) => e.toLowerCase() === trimmed)) {
    return `"${trimmed}" already has subuser access to this server.`;
  }
  return null;
}

export function validateSshPublicKey(name: string, publicKey: string): {
  nameError?: string;
  keyError?: string;
} {
  const trimmedName = name.trim();
  const trimmedKey = publicKey.trim();
  const nameError = trimmedName.length < 2 ? 'Key label must be at least 2 characters.' : undefined;
  const validPrefix = /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256|sk-ssh-ed25519@openssh\.com)\s+[A-Za-z0-9+/=]{16,}/.test(
    trimmedKey,
  );
  const keyError = validPrefix
    ? undefined
    : 'Paste a valid OpenSSH public key (ssh-ed25519, ssh-rsa, or ecdsa-sha2-*).';
  return { nameError, keyError };
}

export function validatePasswordUpdate(
  currentPassword: string,
  nextPassword: string,
  confirmPassword: string,
): {
  currentError?: string;
  nextError?: string;
  confirmError?: string;
} {
  const currentError = !currentPassword ? 'Current password is required.' : undefined;
  const nextError =
    nextPassword.length < 8 ? 'New password must be at least 8 characters.' : undefined;
  const confirmError =
    nextPassword !== confirmPassword ? 'Confirmation password does not match.' : undefined;
  return { currentError, nextError, confirmError };
}

export function filterRecordsByText<T extends object>(
  items: readonly T[],
  query: string,
  picker: (item: T) => readonly string[],
  sortKey?: keyof T & string,
  sortDirection: SortDirection = 'asc',
): T[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((item) => picker(item).some((val) => val.toLowerCase().includes(q)))
    : [...items];
  return sortKey ? sortRowsByKey(filtered, sortKey, sortDirection) : filtered;
}

export async function uploadServerFilesApi(
  serverUuidShort: string,
  directory: string,
  fileList: FileList | File[],
  signal?: AbortSignal,
): Promise<void> {
  const safeId = validateServerIdentifier(serverUuidShort);
  const safeDirectory = normalizeDirectoryPath(directory);
  const files = Array.from(fileList);
  if (files.length === 0) {
    throw new Error('Select at least one file to upload.');
  }
  const formData = new FormData();
  for (const file of files) {
    const safeName = sanitizeDownloadFilename(file.name);
    formData.append('files', file, safeName);
  }
  const res = await calagopusFetch(
    `/api/client/servers/${encodeURIComponent(safeId)}/files/upload?directory=${encodeURIComponent(safeDirectory)}`,
    {
      method: 'POST',
      signal,
      body: formData,
    },
    60000,
  );
  if (!res.ok) {
    throw new Error(await extractSafeApiErrorMessage(res, 'Calagopus file upload API'));
  }
}

export async function dispatchClientServerAction(
  serverUuidShort: string,
  subEndpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  payload?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const safeId = validateServerIdentifier(serverUuidShort);
  const safeSubEndpoint = sanitizeSubEndpoint(subEndpoint);
  const res = await calagopusFetch(
    `/api/client/servers/${encodeURIComponent(safeId)}/${safeSubEndpoint}`,
    {
      method,
      signal,
      headers: payload !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    },
  );
  if (!res.ok) {
    throw new Error(await extractSafeApiErrorMessage(res, 'Calagopus server endpoint'));
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.toLowerCase().includes('application/json')) {
    return res.json();
  }
  return undefined;
}

export async function dispatchClientAccountAction(
  subEndpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  payload?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const safeSubEndpoint = sanitizeSubEndpoint(subEndpoint);
  const res = await calagopusFetch(`/api/client/account/${safeSubEndpoint}`, {
    method,
    signal,
    headers: payload !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) {
    throw new Error(await extractSafeApiErrorMessage(res, 'Calagopus account endpoint'));
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.toLowerCase().includes('application/json')) {
    return res.json();
  }
  return undefined;
}

export const SANDBOX_DATABASES: readonly CalagopusDatabaseRecord[] = [
  {
    id: 'db-01',
    serverId: 'alpha-01',
    name: 's42_luckperms',
    username: 'u42_lp_role',
    host: 'db-eu1.petalnodes.internal',
    port: 3306,
    connectionsFrom: '10.40.0.%',
    maxConnections: 25,
    password: 'pn_db_9K4mX8qR2vT7wZ1n',
  },
  {
    id: 'db-02',
    serverId: 'alpha-01',
    name: 's42_coreprotect',
    username: 'u42_cp_role',
    host: 'db-eu1.petalnodes.internal',
    port: 3306,
    connectionsFrom: '%',
    maxConnections: 40,
    password: 'pn_db_3L7pN6sY9cB4jF8m',
  },
];

export const SANDBOX_BACKUPS: readonly CalagopusBackupRecord[] = [
  {
    id: 'bkp-01',
    uuidShort: 'b84e19c0',
    serverId: 'alpha-01',
    name: 'Nightly Pre-Restart Snapshot',
    checksum: 'sha256:9f84b2...d104',
    bytes: 4294967296,
    createdAt: '2026-11-22 04:00',
    isLocked: true,
    isSuccessful: true,
    ignoredFiles: 'logs/*.gz, .cache/*',
  },
  {
    id: 'bkp-02',
    uuidShort: 'c19a72f4',
    serverId: 'alpha-01',
    name: 'Pre-Plugin Update Save',
    checksum: 'sha256:3c71a8...e920',
    bytes: 3865470566,
    createdAt: '2026-11-20 18:45',
    isLocked: false,
    isSuccessful: true,
    ignoredFiles: 'logs/*',
  },
];

export const SANDBOX_SCHEDULES: readonly CalagopusScheduleRecord[] = [
  {
    id: 'sch-01',
    serverId: 'alpha-01',
    name: 'Nightly World Backup & Restart',
    minute: '0',
    hour: '4',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
    isActive: true,
    onlyWhenOnline: true,
    lastRunAt: '2026-11-22 04:00',
    nextRunAt: '2026-11-23 04:00',
    tasks: [
      {
        id: 'tsk-1',
        sequenceId: 1,
        action: 'command',
        payload: 'say Server backup and restart in 60 seconds.',
        timeOffsetSeconds: 0,
      },
      {
        id: 'tsk-2',
        sequenceId: 2,
        action: 'backup',
        payload: 'logs/*.gz',
        timeOffsetSeconds: 45,
      },
      {
        id: 'tsk-3',
        sequenceId: 3,
        action: 'power',
        payload: 'restart',
        timeOffsetSeconds: 15,
      },
    ],
  },
  {
    id: 'sch-02',
    serverId: 'alpha-01',
    name: 'Periodic Chunk Flush',
    minute: '*/30',
    hour: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
    isActive: true,
    onlyWhenOnline: true,
    lastRunAt: '2026-11-22 23:30',
    nextRunAt: '2026-11-23 00:00',
    tasks: [
      {
        id: 'tsk-4',
        sequenceId: 1,
        action: 'command',
        payload: 'save-all',
        timeOffsetSeconds: 0,
      },
    ],
  },
];

export const SANDBOX_ALLOCATIONS: readonly CalagopusAllocationRecord[] = [
  {
    id: 'alloc-01',
    serverId: 'alpha-01',
    ip: '198.51.100.14',
    alias: 'play.petalnodes.cloud',
    port: 25565,
    notes: 'Primary Minecraft Java endpoint',
    isPrimary: true,
  },
  {
    id: 'alloc-02',
    serverId: 'alpha-01',
    ip: '198.51.100.14',
    alias: 'bedrock.petalnodes.cloud',
    port: 19132,
    notes: 'Geyser-Spigot UDP crossplay listener',
    isPrimary: false,
  },
  {
    id: 'alloc-03',
    serverId: 'alpha-01',
    ip: '198.51.100.14',
    alias: '',
    port: 24454,
    notes: 'Simple Voice Chat UDP port',
    isPrimary: false,
  },
];

export const SANDBOX_STARTUP_CONFIG: CalagopusStartupConfig = {
  serverId: 'alpha-01',
  startupCommand: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} --nogui',
  dockerImage: 'ghcr.io/calagopus/yolks:java_21',
  availableImages: [
    { label: 'Java 21 LTS (Temurin)', value: 'ghcr.io/calagopus/yolks:java_21' },
    { label: 'Java 17 LTS (Temurin)', value: 'ghcr.io/calagopus/yolks:java_17' },
    { label: 'Java 21 GraalVM CE', value: 'ghcr.io/calagopus/yolks:graalvm_21' },
  ],
  variables: [
    {
      envKey: 'SERVER_JARFILE',
      name: 'Server Jar File',
      description: 'The main executable server JAR file launched at container boot.',
      value: 'paper-1.21.1-142.jar',
      rules: 'required|string|max:120',
      isEditable: true,
    },
    {
      envKey: 'MINECRAFT_VERSION',
      name: 'Minecraft Version',
      description: 'Target PaperMC release channel for auto-updates.',
      value: '1.21.1',
      rules: 'required|string|max:24',
      isEditable: true,
    },
    {
      envKey: 'BUILD_NUMBER',
      name: 'Paper Build',
      description: 'Build number or "latest" to pull on reinstall.',
      value: '142',
      rules: 'required|string|max:16',
      isEditable: true,
    },
    {
      envKey: 'SERVER_MEMORY',
      name: 'Allocated Memory (MiB)',
      description: 'System-enforced heap limit assigned by Petalnodes.',
      value: '8192',
      rules: 'integer|min:512',
      isEditable: false,
    },
  ],
};

export const SANDBOX_SUBUSERS: readonly CalagopusSubuserRecord[] = [
  {
    id: 'sub-01',
    serverId: 'alpha-01',
    username: 'lucas.meyer',
    email: 'lucas@petalnodes.cloud',
    permissions: ['control.console', 'file.read', 'backup.read'],
    createdAt: '2026-10-12',
  },
  {
    id: 'sub-02',
    serverId: 'alpha-01',
    username: 'hana.sato',
    email: 'hana@petalnodes.cloud',
    permissions: ['control.console', 'control.power', 'file.read', 'file.write', 'schedule.read'],
    createdAt: '2026-11-04',
  },
];

export const SANDBOX_SSH_KEYS: readonly CalagopusSshKeyRecord[] = [
  {
    id: 'ssh-01',
    name: 'Workstation Ed25519',
    fingerprint: 'SHA256:4xR9pQ2kL8mN5vW1yT7cZ0bJ6fH3dE8aP2uG9sV4kM',
    publicKeyPreview: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMk8...elena@workstation',
    createdAt: '2026-09-20',
  },
  {
    id: 'ssh-02',
    name: 'Deploy CI Runner',
    fingerprint: 'SHA256:9mK2tV5wX1yZ8bC4nL7pQ3rS6fJ0hD2aE5uG1vM8kN',
    publicKeyPreview: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPq9...ci@petalnodes.cloud',
    createdAt: '2026-10-28',
  },
];

export const SANDBOX_ADMIN_NODES: readonly CalagopusAdminNode[] = [
  {
    id: 'node-eu1',
    name: 'eu-west-1',
    fqdn: 'eu-west-1.nodes.petalnodes.cloud',
    location: 'Frankfurt (eu-central)',
    memoryMb: 131072,
    memoryAllocatedMb: 73728,
    diskMb: 2048000,
    diskAllocatedMb: 942080,
    serversCount: 11,
    status: 'online',
  },
  {
    id: 'node-us2',
    name: 'us-east-2',
    fqdn: 'us-east-2.nodes.petalnodes.cloud',
    location: 'Ashburn (us-east)',
    memoryMb: 65536,
    memoryAllocatedMb: 36864,
    diskMb: 1024000,
    diskAllocatedMb: 410000,
    serversCount: 5,
    status: 'online',
  },
  {
    id: 'node-ap1',
    name: 'ap-south-1',
    fqdn: 'ap-south-1.nodes.petalnodes.cloud',
    location: 'Singapore (ap-southeast)',
    memoryMb: 65536,
    memoryAllocatedMb: 16384,
    diskMb: 1024000,
    diskAllocatedMb: 128000,
    serversCount: 2,
    status: 'online',
  },
];

export const SANDBOX_ADMIN_EXTENSIONS: readonly CalagopusAdminExtension[] = [
  {
    identifier: 'cloud.petalnodes.sanctuary',
    name: 'Petalnodes Sanctuary Theme (v2.1)',
    version: '2.1.0',
    author: 'Petalnodes · Calagopus Extension',
    status: 'active',
    description: 'Complete Light & Dark Petalnodes experience with Liquid Glass Sidebar, Shadcn cards, Minecraft tools, visual server artwork, and Calagopus theme tokens.',
  },
  {
    identifier: 'gg.ir77.mcversionchooser',
    name: 'Minecraft Version Chooser',
    version: '1.4.2',
    author: 'ir77 · Calagopus Community',
    status: 'active',
    description: 'One-click Paper, Purpur, Fabric, and Vanilla build switcher integrated into server startup management.',
  },
  {
    identifier: 'com.subwaystudios.serverproperties',
    name: 'Visual server.properties Editor',
    version: '1.1.0',
    author: 'SubwayStudios',
    status: 'active',
    description: 'Schema-validated visual editor for Minecraft server.properties keys without raw file typos.',
  },
  {
    identifier: 'dev.caloptreyx.gdrive',
    name: 'Google Drive Offsite Backups',
    version: '2.0.1',
    author: 'Caloptreyx',
    status: 'disabled',
    description: 'Optional remote backup synchronization provider for scheduled container snapshots.',
  },
  {
    identifier: 'dev.minerpl.caddyproxy',
    name: 'Caddy Reverse Proxy Manager',
    version: '1.2.4',
    author: 'MinerPL',
    status: 'active',
    description: 'Automatic TLS domain binding and reverse proxy rules for hosted panel subdomains.',
  },
];

export interface CalagopusAdminAllocation {
  id: string;
  nodeId: string;
  nodeName: string;
  ip: string;
  port: number;
  alias: string;
  notes: string;
  assignedServerId: string | null;
  assignedServerName: string | null;
}

export interface CalagopusAdminUser {
  id: string;
  username: string;
  email: string;
  roleName: string;
  isAdmin: boolean;
  twoFactorEnabled: boolean;
  serversCount: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface CalagopusAdminRole {
  id: string;
  name: string;
  description: string;
  permissions: readonly string[];
  usersCount: number;
  isSystem: boolean;
}

export interface CalagopusAdminSettings {
  panelName: string;
  panelUrl: string;
  tagline: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  requireTwoFactorAdmin: boolean;
  captchaProvider: 'none' | 'turnstile' | 'hcaptcha';
  mailHost: string;
  mailFromAddress: string;
}

export interface CalagopusUserSession {
  id: string;
  deviceLabel: string;
  ipAddress: string;
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export async function dispatchAdminAction(
  subEndpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  payload?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const safeSubEndpoint = sanitizeSubEndpoint(subEndpoint);
  const res = await calagopusFetch(`/api/admin/${safeSubEndpoint}`, {
    method,
    signal,
    headers: payload !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) {
    throw new Error(await extractSafeApiErrorMessage(res, 'Calagopus admin API'));
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.toLowerCase().includes('application/json')) {
    return res.json();
  }
  return undefined;
}

export const SANDBOX_ADMIN_ALLOCATIONS: readonly CalagopusAdminAllocation[] = [
  {
    id: 'nalloc-01',
    nodeId: 'node-eu1',
    nodeName: 'eu-west-1',
    ip: '198.51.100.14',
    port: 25565,
    alias: 'play.petalnodes.cloud',
    notes: 'Primary PaperMC Survival listener',
    assignedServerId: 'alpha-01',
    assignedServerName: 'PaperMC Survival',
  },
  {
    id: 'nalloc-02',
    nodeId: 'node-eu1',
    nodeName: 'eu-west-1',
    ip: '198.51.100.14',
    port: 25577,
    alias: 'proxy.petalnodes.cloud',
    notes: 'Velocity Proxy edge port',
    assignedServerId: 'bravo-02',
    assignedServerName: 'Velocity Proxy',
  },
  {
    id: 'nalloc-03',
    nodeId: 'node-eu1',
    nodeName: 'eu-west-1',
    ip: '198.51.100.14',
    port: 25567,
    alias: '',
    notes: 'Available pool port',
    assignedServerId: null,
    assignedServerName: null,
  },
  {
    id: 'nalloc-04',
    nodeId: 'node-us2',
    nodeName: 'us-east-2',
    ip: '203.0.113.42',
    port: 25566,
    alias: 'us.petalnodes.cloud',
    notes: 'Staging Forge Modpack endpoint',
    assignedServerId: 'charlie-03',
    assignedServerName: 'Staging Forge Modpack',
  },
  {
    id: 'nalloc-05',
    nodeId: 'node-us2',
    nodeName: 'us-east-2',
    ip: '203.0.113.42',
    port: 25568,
    alias: '',
    notes: 'Available US East listener',
    assignedServerId: null,
    assignedServerName: null,
  },
  {
    id: 'nalloc-06',
    nodeId: 'node-ap1',
    nodeName: 'ap-south-1',
    ip: '192.0.2.88',
    port: 19132,
    alias: 'bedrock-sg.petalnodes.cloud',
    notes: 'Available Bedrock UDP allocation',
    assignedServerId: null,
    assignedServerName: null,
  },
];

export const SANDBOX_ADMIN_USERS: readonly CalagopusAdminUser[] = [
  {
    id: 'usr-01',
    username: 'elena.rostova',
    email: 'elena@petalnodes.cloud',
    roleName: 'Root Administrator',
    isAdmin: true,
    twoFactorEnabled: true,
    serversCount: 6,
    createdAt: '2026-06-14',
    lastLoginAt: '2026-11-23 03:40',
  },
  {
    id: 'usr-02',
    username: 'lucas.meyer',
    email: 'lucas@petalnodes.cloud',
    roleName: 'Infrastructure Operator',
    isAdmin: false,
    twoFactorEnabled: true,
    serversCount: 3,
    createdAt: '2026-08-02',
    lastLoginAt: '2026-11-22 21:14',
  },
  {
    id: 'usr-03',
    username: 'hana.sato',
    email: 'hana@petalnodes.cloud',
    roleName: 'Support Moderator',
    isAdmin: false,
    twoFactorEnabled: false,
    serversCount: 2,
    createdAt: '2026-09-19',
    lastLoginAt: '2026-11-22 18:05',
  },
  {
    id: 'usr-04',
    username: 'mateo.silva',
    email: 'mateo@petalnodes.cloud',
    roleName: 'Standard Member',
    isAdmin: false,
    twoFactorEnabled: false,
    serversCount: 1,
    createdAt: '2026-10-11',
    lastLoginAt: '2026-11-21 15:32',
  },
];

export const SANDBOX_ADMIN_ROLES: readonly CalagopusAdminRole[] = [
  {
    id: 'role-root',
    name: 'Root Administrator',
    description: 'Full unrestricted control over all nodes, extensions, settings, users, and servers.',
    permissions: ['*'],
    usersCount: 1,
    isSystem: true,
  },
  {
    id: 'role-infra',
    name: 'Infrastructure Operator',
    description: 'Manage Wings nodes, locations, allocations, Eggs, and server provisioning without billing or extension deletion.',
    permissions: [
      'admin.overview',
      'admin.locations.read',
      'admin.nodes.read',
      'admin.nests.read',
      'admin.servers.read',
      'admin.activity.read',
    ],
    usersCount: 1,
    isSystem: false,
  },
  {
    id: 'role-support',
    name: 'Support Moderator',
    description: 'Inspect user servers, read audit trails, and assist with container console troubleshooting.',
    permissions: ['admin.overview', 'admin.servers.read', 'admin.users.read', 'admin.activity.read'],
    usersCount: 1,
    isSystem: false,
  },
  {
    id: 'role-member',
    name: 'Standard Member',
    description: 'Access assigned servers, file manager, backups, databases, and personal API/SSH credentials.',
    permissions: ['control.console', 'control.power', 'file.read', 'backup.read', 'database.read'],
    usersCount: 39,
    isSystem: true,
  },
];

export const SANDBOX_ADMIN_SETTINGS: CalagopusAdminSettings = {
  panelName: 'Petalnodes Panel',
  panelUrl: 'https://panel.petalnodes.cloud',
  tagline: 'Plant a seed. Grow a world.',
  maintenanceMode: false,
  registrationEnabled: true,
  requireTwoFactorAdmin: true,
  captchaProvider: 'turnstile',
  mailHost: 'smtp.petalnodes.internal',
  mailFromAddress: 'no-reply@petalnodes.cloud',
};

export const SANDBOX_USER_SESSIONS: readonly CalagopusUserSession[] = [
  {
    id: 'sess-current',
    deviceLabel: 'Chromium 131 · Linux Workstation',
    ipAddress: '192.0.2.18',
    location: 'Frankfurt, DE',
    lastActiveAt: 'Active now',
    isCurrent: true,
  },
  {
    id: 'sess-mobile',
    deviceLabel: 'Safari Mobile · iPhone 16 Pro',
    ipAddress: '198.51.100.77',
    location: 'Amsterdam, NL',
    lastActiveAt: '2026-11-22 21:40',
    isCurrent: false,
  },
];

