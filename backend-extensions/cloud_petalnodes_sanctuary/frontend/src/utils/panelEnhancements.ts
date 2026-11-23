import {
  filterServersByQuery,
  type CalagopusActivityEntry,
  type CalagopusServerSummary,
} from '../api/calagopusDashboard';
import type { CalagopusAdminExtension } from '../api/calagopusModules';
import { classifyServerSoftware, type ServerSoftwareVisual } from './serverArtwork';
import { sortRowsByKey, type SortDirection } from './themeHelpers';

export interface PanelNotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
  targetPath?: string;
}

export function buildPanelNotifications(
  servers: readonly CalagopusServerSummary[],
  activity: readonly CalagopusActivityEntry[],
  errorMessage?: string | null,
): PanelNotificationItem[] {
  const items: PanelNotificationItem[] = [];

  if (errorMessage) {
    items.push({
      id: 'notif-api-error',
      title: 'Panel connection issue',
      description: errorMessage,
      timestamp: 'Now',
      severity: 'danger',
    });
  }

  for (const srv of servers) {
    if (srv.state === 'suspended') {
      items.push({
        id: `notif-srv-susp-${srv.uuidShort}`,
        title: `${srv.name} suspended`,
        description: `Container ${srv.uuidShort} on ${srv.node} requires attention.`,
        timestamp: 'Status',
        severity: 'danger',
        targetPath: `/server/${srv.uuidShort}/overview`,
      });
    } else if (srv.cpuPercent >= 85) {
      items.push({
        id: `notif-srv-cpu-${srv.uuidShort}`,
        title: `High CPU on ${srv.name}`,
        description: `Container CPU utilization is ${srv.cpuPercent.toFixed(1)}% on ${srv.node}.`,
        timestamp: 'Telemetry',
        severity: 'warning',
        targetPath: `/server/${srv.uuidShort}/overview`,
      });
    }
  }

  for (const act of activity.slice(0, 6)) {
    items.push({
      id: `notif-act-${act.id}`,
      title: act.description,
      description: `${act.event} · ${act.actor}`,
      timestamp: act.timestamp,
      severity:
        act.status === 'failed'
          ? 'danger'
          : act.status === 'warning'
            ? 'warning'
            : 'info',
      targetPath: '/account/activity',
    });
  }

  return items;
}

export type ServerStatusFilter = 'all' | 'running' | 'offline';
export type ServerCategoryFilter = 'all' | ServerSoftwareVisual['category'];

export interface ServerFilterSortOptions {
  query: string;
  stateFilter: ServerStatusFilter;
  categoryFilter: ServerCategoryFilter;
  sortKey: keyof CalagopusServerSummary & string;
  sortDirection: SortDirection;
}

export function filterAndSortServers(
  servers: readonly CalagopusServerSummary[],
  options: ServerFilterSortOptions,
): CalagopusServerSummary[] {
  const byQuery = filterServersByQuery(servers, options.query);
  const byState =
    options.stateFilter === 'all'
      ? byQuery
      : byQuery.filter((srv) =>
          options.stateFilter === 'running'
            ? srv.state === 'running' || srv.state === 'starting'
            : srv.state !== 'running' && srv.state !== 'starting',
        );
  const byCategory =
    options.categoryFilter === 'all'
      ? byState
      : byState.filter(
          (srv) => classifyServerSoftware(srv.eggName, srv.name).category === options.categoryFilter,
        );
  return sortRowsByKey(byCategory, options.sortKey, options.sortDirection);
}

export type ExtensionCategory = 'Theme' | 'Minecraft' | 'Integrations' | 'Infrastructure';

export interface ClassifiedExtension extends CalagopusAdminExtension {
  category: ExtensionCategory;
  shortCode: string;
}

export function classifyAdminExtension(ext: CalagopusAdminExtension): ClassifiedExtension {
  const hay = `${ext.identifier} ${ext.name} ${ext.description}`.toLowerCase();
  let category: ExtensionCategory = 'Infrastructure';

  if (
    hay.includes('theme') ||
    hay.includes('blush') ||
    hay.includes('petalnodes') ||
    hay.includes('sanctuary') ||
    hay.includes('qunix') ||
    hay.includes('mint') ||
    hay.includes('amber')
  ) {
    category = 'Theme';
  } else if (
    hay.includes('mc') ||
    hay.includes('minecraft') ||
    hay.includes('serverproperties') ||
    hay.includes('player') ||
    hay.includes('version')
  ) {
    category = 'Minecraft';
  } else if (
    hay.includes('gdrive') ||
    hay.includes('discord') ||
    hay.includes('content') ||
    hay.includes('ai')
  ) {
    category = 'Integrations';
  }

  const words = ext.name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean);
  const shortCode =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : (words[0]?.slice(0, 2) ?? 'EX').toUpperCase();

  return {
    ...ext,
    category,
    shortCode,
  };
}

export function filterAdminExtensions(
  extensions: readonly ClassifiedExtension[],
  query: string,
  categoryFilter: 'all' | ExtensionCategory,
  statusFilter: 'all' | 'active' | 'disabled',
): ClassifiedExtension[] {
  const q = query.trim().toLowerCase();
  return extensions.filter((ext) => {
    if (categoryFilter !== 'all' && ext.category !== categoryFilter) {
      return false;
    }
    if (statusFilter !== 'all' && ext.status !== statusFilter) {
      return false;
    }
    if (!q) return true;
    return (
      ext.name.toLowerCase().includes(q) ||
      ext.identifier.toLowerCase().includes(q) ||
      ext.author.toLowerCase().includes(q) ||
      ext.description.toLowerCase().includes(q) ||
      ext.category.toLowerCase().includes(q)
    );
  });
}

export const MAX_EXTENSION_ARCHIVE_BYTES = 25 * 1024 * 1024;

export function validateExtensionUploadFile(file: { name: string; size: number }): string | null {
  const lower = file.name.trim().toLowerCase();
  if (!lower.endsWith('.c7s.zip') && !lower.endsWith('.zip')) {
    return 'Select a valid Calagopus extension package (.c7s.zip or .zip).';
  }
  if (file.size <= 0) {
    return 'Selected extension archive appears to be empty.';
  }
  if (file.size > MAX_EXTENSION_ARCHIVE_BYTES) {
    return 'Extension archive exceeds the 25 MiB upload limit.';
  }
  return null;
}

export function generateExtensionBuildLog(
  ext: Pick<CalagopusAdminExtension, 'identifier' | 'name' | 'version' | 'status'>,
): string[] {
  const crateName = ext.identifier.replace(/\./g, '_');
  const lines = [
    `[calagopus-ext] Checking Metadata.toml for ${ext.identifier} (v${ext.version})`,
    `[calagopus-ext] Validated package_name="${ext.identifier}", name="${ext.name}", panel_version=">=1.1.0"`,
    `[cargo] Compiling ${crateName} v${ext.version} (/opt/calagopus-panel/backend-extensions/${crateName}/backend)`,
    `[cargo] Finished \`release\` profile [optimized] in 2.41s`,
    `[pnpm] Building frontend chunk for ${ext.identifier} -> dist/extensions/${crateName}.js`,
    `[vite] ✓ 48 modules transformed, 0 warnings.`,
  ];

  if (ext.status === 'disabled') {
    lines.push(`[calagopus-ext] Extension ${ext.identifier} is staged but currently disabled in active registry.`);
  } else {
    lines.push(`[calagopus-ext] Registered ${ext.identifier} in active Calagopus extension router.`);
  }
  return lines;
}

export type FileVisualKind = 'folder' | 'archive' | 'code' | 'log' | 'jar' | 'text';

export function classifyFileVisualKind(name: string, isDirectory: boolean): FileVisualKind {
  if (isDirectory) return 'folder';
  const lower = name.toLowerCase();
  if (lower.endsWith('.jar')) return 'jar';
  if (
    lower.endsWith('.zip') ||
    lower.endsWith('.tar.gz') ||
    lower.endsWith('.gz') ||
    lower.endsWith('.tar')
  ) {
    return 'archive';
  }
  if (
    lower.endsWith('.yml') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.json') ||
    lower.endsWith('.toml') ||
    lower.endsWith('.properties') ||
    lower.endsWith('.sh') ||
    lower.endsWith('.conf')
  ) {
    return 'code';
  }
  if (lower.endsWith('.log')) return 'log';
  return 'text';
}

export interface ConsoleCommandSuggestion {
  command: string;
  description: string;
}

export const CONSOLE_COMMAND_SUGGESTIONS: readonly ConsoleCommandSuggestion[] = [
  { command: 'list', description: 'Show online players' },
  { command: 'tps', description: 'Check tick rate & MSPT' },
  { command: 'save-all', description: 'Flush world chunks to disk' },
  { command: 'whitelist list', description: 'Inspect server whitelist' },
  { command: 'version', description: 'Print server software build' },
  { command: 'plugins', description: 'List loaded server plugins' },
  { command: 'timings report', description: 'Generate performance timings' },
  { command: 'help', description: 'List available console commands' },
];

export function filterConsoleSuggestions(input: string): ConsoleCommandSuggestion[] {
  const clean = input.trim().replace(/^\/+/, '').toLowerCase();
  if (!clean) {
    return CONSOLE_COMMAND_SUGGESTIONS.slice(0, 5);
  }
  return CONSOLE_COMMAND_SUGGESTIONS.filter(
    (item) =>
      item.command.toLowerCase().includes(clean) || item.description.toLowerCase().includes(clean),
  ).slice(0, 5);
}

export function normalizeSafeDir(rawDir: string): string {
  const segments = rawDir
    .replace(/\\/g, '/')
    .replace(/\0/g, '')
    .trim()
    .split('/');
  const resolved: string[] = [];
  for (const seg of segments) {
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

export function resolveSafeMoveTarget(
  destinationDir: string,
  entryName: string,
): { directory: string; path: string } | { error: string } {
  const cleanEntry = entryName.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? '';
  if (!cleanEntry || cleanEntry === '.' || cleanEntry === '..') {
    return { error: 'Invalid entry name.' };
  }
  const directory = normalizeSafeDir(destinationDir);
  const path = directory === '/' ? `/${cleanEntry}` : `${directory}/${cleanEntry}`;
  return { directory, path };
}

export type SyntaxTokenKind =
  | 'comment'
  | 'key'
  | 'string'
  | 'number'
  | 'boolean'
  | 'punctuation'
  | 'level-warn'
  | 'level-error'
  | 'plain';

export interface SyntaxToken {
  text: string;
  kind: SyntaxTokenKind;
}

export function tokenizeSyntaxLine(line: string, filenameOrExt: string): SyntaxToken[] {
  if (!line) return [{ text: '', kind: 'plain' }];
  const lowerExt = filenameOrExt.trim().toLowerCase();
  const trimmed = line.trimStart();

  if (lowerExt.endsWith('.log')) {
    if (/\b(ERROR|FATAL|SEVERE|Exception)\b/i.test(line)) {
      return [{ text: line, kind: 'level-error' }];
    }
    if (/\bWARN(?:ING)?\b/i.test(line)) {
      return [{ text: line, kind: 'level-warn' }];
    }
    return [{ text: line, kind: 'plain' }];
  }

  if (
    (lowerExt.endsWith('.yml') ||
      lowerExt.endsWith('.yaml') ||
      lowerExt.endsWith('.properties') ||
      lowerExt.endsWith('.toml') ||
      lowerExt.endsWith('.sh') ||
      lowerExt.endsWith('.conf')) &&
    (trimmed.startsWith('#') || trimmed.startsWith('!'))
  ) {
    return [{ text: line, kind: 'comment' }];
  }

  if (lowerExt.endsWith('.json')) {
    const tokens: SyntaxToken[] = [];
    const jsonRegex = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)|([{}[\],:])/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = jsonRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ text: line.slice(lastIndex, match.index), kind: 'plain' });
      }
      if (match[1]) {
        if (match[2]) {
          tokens.push({ text: match[1], kind: 'key' });
          tokens.push({ text: match[2], kind: 'punctuation' });
        } else {
          tokens.push({ text: match[1], kind: 'string' });
        }
      } else if (match[3]) {
        tokens.push({ text: match[3], kind: 'boolean' });
      } else if (match[4]) {
        tokens.push({ text: match[4], kind: 'number' });
      } else if (match[5]) {
        tokens.push({ text: match[5], kind: 'punctuation' });
      }
      lastIndex = jsonRegex.lastIndex;
    }
    if (lastIndex < line.length) {
      tokens.push({ text: line.slice(lastIndex), kind: 'plain' });
    }
    return tokens;
  }

  const kvMatch = /^(\s*)([^:=\s#][^:=]*?)(\s*[:=]\s*)(.*)$/.exec(line);
  if (kvMatch) {
    const [, indent, key, sep, rawVal] = kvMatch;
    const tokens: SyntaxToken[] = [];
    if (indent) tokens.push({ text: indent, kind: 'plain' });
    tokens.push({ text: key, kind: 'key' });
    tokens.push({ text: sep, kind: 'punctuation' });
    const valTrim = rawVal.trim();
    if (/^(true|false|null)$/i.test(valTrim)) {
      tokens.push({ text: rawVal, kind: 'boolean' });
    } else if (/^-?\d+(\.\d+)?$/.test(valTrim)) {
      tokens.push({ text: rawVal, kind: 'number' });
    } else if (
      (valTrim.startsWith('"') && valTrim.endsWith('"')) ||
      (valTrim.startsWith("'") && valTrim.endsWith("'"))
    ) {
      tokens.push({ text: rawVal, kind: 'string' });
    } else {
      tokens.push({ text: rawVal, kind: 'plain' });
    }
    return tokens;
  }

  return [{ text: line, kind: 'plain' }];
}

export type BackupStatusFilter = 'all' | 'verified' | 'locked' | 'failed';
export type BackupSortKey = 'createdAt' | 'name' | 'bytes' | 'isSuccessful';

export interface BackupFilterSortRecord {
  id: string;
  uuidShort: string;
  name: string;
  checksum: string;
  bytes: number;
  createdAt: string;
  isLocked: boolean;
  isSuccessful: boolean;
}

export function filterAndSortBackups<T extends BackupFilterSortRecord>(
  backups: readonly T[],
  options: {
    query: string;
    statusFilter: BackupStatusFilter;
    sortKey: BackupSortKey;
    sortDirection: SortDirection;
  },
): T[] {
  const q = options.query.trim().toLowerCase();
  const filtered = backups.filter((b) => {
    if (options.statusFilter === 'verified' && !b.isSuccessful) return false;
    if (options.statusFilter === 'failed' && b.isSuccessful) return false;
    if (options.statusFilter === 'locked' && !b.isLocked) return false;
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.uuidShort.toLowerCase().includes(q) ||
      b.checksum.toLowerCase().includes(q)
    );
  });

  return [...filtered].sort((a, b) => {
    let cmp = 0;
    if (options.sortKey === 'bytes') {
      cmp = a.bytes - b.bytes;
    } else if (options.sortKey === 'isSuccessful') {
      cmp = Number(a.isSuccessful) - Number(b.isSuccessful);
    } else if (options.sortKey === 'name') {
      cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    } else {
      cmp = a.createdAt.localeCompare(b.createdAt);
    }
    return options.sortDirection === 'asc' ? cmp : -cmp;
  });
}

