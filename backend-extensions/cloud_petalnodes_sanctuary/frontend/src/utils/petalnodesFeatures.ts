import type { CalagopusConsoleLine } from '../api/calagopusCore';
import type { CalagopusServerSummary } from '../api/calagopusDashboard';
import type { CalagopusBackupRecord } from '../api/calagopusModules';

export type SupportedLocale = 'en' | 'es' | 'de' | 'ja';

export interface ResourceAlertThresholds {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
}

export const DEFAULT_ALERT_THRESHOLDS: ResourceAlertThresholds = {
  cpuPercent: 85,
  memoryPercent: 85,
  diskPercent: 90,
};

const ALERT_THRESHOLDS_STORAGE_KEY = 'petalnodes.alerts.thresholds.v1';
const LOCALE_STORAGE_KEY = 'petalnodes.ui.locale.v1';

export function loadAlertThresholds(
  storage?: Pick<Storage, 'getItem'> | null,
): ResourceAlertThresholds {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const raw = store?.getItem(ALERT_THRESHOLDS_STORAGE_KEY);
    if (!raw) return DEFAULT_ALERT_THRESHOLDS;
    const parsed = JSON.parse(raw) as Partial<ResourceAlertThresholds>;
    return {
      cpuPercent: clampThreshold(parsed.cpuPercent, DEFAULT_ALERT_THRESHOLDS.cpuPercent),
      memoryPercent: clampThreshold(parsed.memoryPercent, DEFAULT_ALERT_THRESHOLDS.memoryPercent),
      diskPercent: clampThreshold(parsed.diskPercent, DEFAULT_ALERT_THRESHOLDS.diskPercent),
    };
  } catch {
    return DEFAULT_ALERT_THRESHOLDS;
  }
}

export function saveAlertThresholds(
  next: ResourceAlertThresholds,
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.setItem(
      ALERT_THRESHOLDS_STORAGE_KEY,
      JSON.stringify({
        cpuPercent: clampThreshold(next.cpuPercent, DEFAULT_ALERT_THRESHOLDS.cpuPercent),
        memoryPercent: clampThreshold(next.memoryPercent, DEFAULT_ALERT_THRESHOLDS.memoryPercent),
        diskPercent: clampThreshold(next.diskPercent, DEFAULT_ALERT_THRESHOLDS.diskPercent),
      }),
    );
  } catch {
    // Ignore storage errors
  }
}

function clampThreshold(val: unknown, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.min(100, Math.max(10, Math.round(val)));
}

export function loadLocalePreference(
  storage?: Pick<Storage, 'getItem'> | null,
): SupportedLocale {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const val = store?.getItem(LOCALE_STORAGE_KEY);
    if (val === 'en' || val === 'es' || val === 'de' || val === 'ja') return val;
    return 'en';
  } catch {
    return 'en';
  }
}

export function saveLocalePreference(
  locale: SupportedLocale,
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage errors
  }
}

const UI_DICTIONARY: Record<SupportedLocale, Record<string, string>> = {
  en: {
    servers: 'Servers',
    profile: 'Account Profile',
    security: 'Security & Authentication',
    minecraftTools: 'Minecraft & Server Tools',
    diagnostics: 'System Diagnostics',
    saveProfile: 'Save Profile',
  },
  es: {
    servers: 'Servidores',
    profile: 'Perfil de Cuenta',
    security: 'Seguridad y Autenticación',
    minecraftTools: 'Herramientas de Minecraft',
    diagnostics: 'Diagnóstico del Sistema',
    saveProfile: 'Guardar Perfil',
  },
  de: {
    servers: 'Server',
    profile: 'Kontoprofil',
    security: 'Sicherheit & Authentifizierung',
    minecraftTools: 'Minecraft-Werkzeuge',
    diagnostics: 'Systemdiagnose',
    saveProfile: 'Profil speichern',
  },
  ja: {
    servers: 'サーバー',
    profile: 'アカウント設定',
    security: 'セキュリティと認証',
    minecraftTools: 'Minecraft ツール',
    diagnostics: 'システム診断',
    saveProfile: '保存する',
  },
};

export function translateUi(locale: SupportedLocale, key: string): string {
  return UI_DICTIONARY[locale]?.[key] ?? UI_DICTIONARY.en[key] ?? key;
}

export function parseServerProperties(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (key) {
      result[key] = value;
    }
  }
  return result;
}

export function serializeServerProperties(
  raw: string,
  updates: Record<string, string>,
): string {
  const lines = raw.split(/\r?\n/);
  const applied = new Set<string>();
  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
      return line;
    }
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) return line;
    const key = line.slice(0, eqIndex).trim();
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      applied.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const [key, val] of Object.entries(updates)) {
    if (!applied.has(key)) {
      nextLines.push(`${key}=${val}`);
    }
  }

  return `${nextLines.join('\n').replace(/\n+$/, '')}\n`;
}

export interface MotdSegment {
  text: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

const MC_COLORS: Record<string, string> = {
  '0': '#000000',
  '1': '#0000AA',
  '2': '#00AA00',
  '3': '#00AAAA',
  '4': '#AA0000',
  '5': '#AA00AA',
  '6': '#FFAA00',
  '7': '#AAAAAA',
  '8': '#555555',
  '9': '#5555FF',
  a: '#55FF55',
  b: '#55FFFF',
  c: '#FF5555',
  d: '#FF55FF',
  e: '#FFFF55',
  f: '#FFFFFF',
};

export function parseMinecraftMotdSegments(motd: string): MotdSegment[] {
  const segments: MotdSegment[] = [];
  let color = '#FFFFFF';
  let bold = false;
  let italic = false;
  let underline = false;
  let strikethrough = false;
  let buffer = '';

  const flush = () => {
    if (buffer.length > 0) {
      segments.push({ text: buffer, color, bold, italic, underline, strikethrough });
      buffer = '';
    }
  };

  for (let i = 0; i < motd.length; i += 1) {
    const ch = motd[i];
    const next = motd[i + 1]?.toLowerCase();
    if ((ch === '&' || ch === '§') && next && /^[0-9a-flmnor]$/.test(next)) {
      flush();
      i += 1;
      if (MC_COLORS[next]) {
        color = MC_COLORS[next];
        bold = false;
        italic = false;
        underline = false;
        strikethrough = false;
      } else if (next === 'l') {
        bold = true;
      } else if (next === 'o') {
        italic = true;
      } else if (next === 'n') {
        underline = true;
      } else if (next === 'm') {
        strikethrough = true;
      } else if (next === 'r') {
        color = '#FFFFFF';
        bold = false;
        italic = false;
        underline = false;
        strikethrough = false;
      }
      continue;
    }
    buffer += ch;
  }
  flush();
  return segments;
}

export interface CrashDiagnosticFinding {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  matchedLine: string;
  remediation: string;
  targetSubRoute: string;
}

export function analyzeCrashLogs(
  consoleLogs: readonly Pick<CalagopusConsoleLine, 'level' | 'message'>[],
  extraLogText = '',
): CrashDiagnosticFinding[] {
  const lines = [
    ...consoleLogs.map((l) => l.message),
    ...extraLogText.split(/\r?\n/).filter((l) => l.trim().length > 0),
  ];

  const findings: CrashDiagnosticFinding[] = [];
  const seen = new Set<string>();

  const pushFinding = (finding: CrashDiagnosticFinding) => {
    if (seen.has(finding.id)) return;
    seen.add(finding.id);
    findings.push(finding);
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('outofmemoryerror') || lower.includes('gc overhead limit exceeded')) {
      pushFinding({
        id: 'oom',
        severity: 'critical',
        title: 'JVM Out of Memory (OOM)',
        matchedLine: line.slice(0, 180),
        remediation:
          'Increase container memory allocation or reduce view-distance / plugin heap usage, and ensure Aikar G1GC flags are configured.',
        targetSubRoute: 'startup',
      });
    } else if (lower.includes('failed to bind to port') || lower.includes('bindexception')) {
      pushFinding({
        id: 'port-bind',
        severity: 'critical',
        title: 'Allocation Port Already Bound',
        matchedLine: line.slice(0, 180),
        remediation:
          'Leave server-ip blank in server.properties and confirm the assigned primary allocation matches server-port.',
        targetSubRoute: 'network',
      });
    } else if (
      lower.includes('unsupportedclassversionerror') ||
      lower.includes('more recent version of the java runtime')
    ) {
      pushFinding({
        id: 'java-version',
        severity: 'critical',
        title: 'Incompatible Java Runtime Version',
        matchedLine: line.slice(0, 180),
        remediation:
          'Switch the container Docker image to Java 21 LTS under the Startup configuration tab.',
        targetSubRoute: 'startup',
      });
    } else if (lower.includes('agree to the eula')) {
      pushFinding({
        id: 'eula-false',
        severity: 'warning',
        title: 'Minecraft EULA Not Accepted',
        matchedLine: line.slice(0, 180),
        remediation: 'Open eula.txt or Minecraft Tools and set eula=true before starting the server.',
        targetSubRoute: 'minecraft',
      });
    } else if (lower.includes('watchdog') || lower.includes('single server tick took')) {
      pushFinding({
        id: 'watchdog-stall',
        severity: 'warning',
        title: 'Main Thread Tick Stall Detected',
        matchedLine: line.slice(0, 180),
        remediation:
          'Capture a Spark profiler report from the console and review entity activation range or heavy chunks.',
        targetSubRoute: 'minecraft',
      });
    } else if (lower.includes('could not load') && lower.includes('plugin')) {
      pushFinding({
        id: 'plugin-load-error',
        severity: 'warning',
        title: 'Plugin Initialization Failure',
        matchedLine: line.slice(0, 180),
        remediation:
          'Inspect missing dependencies or toggle the failing .jar file under Minecraft Tools -> Plugins.',
        targetSubRoute: 'minecraft',
      });
    }
  }

  return findings;
}

export interface ThresholdAlertItem {
  serverId: string;
  serverName: string;
  metric: 'cpu' | 'memory' | 'disk';
  valuePercent: number;
  thresholdPercent: number;
}

export function evaluateAlertThresholds(
  servers: readonly CalagopusServerSummary[],
  thresholds: ResourceAlertThresholds,
): ThresholdAlertItem[] {
  const alerts: ThresholdAlertItem[] = [];
  for (const srv of servers) {
    if (srv.cpuPercent >= thresholds.cpuPercent) {
      alerts.push({
        serverId: srv.uuidShort,
        serverName: srv.name,
        metric: 'cpu',
        valuePercent: Math.round(srv.cpuPercent),
        thresholdPercent: thresholds.cpuPercent,
      });
    }
    const memPct =
      srv.memoryLimitMb > 0 ? Math.round((srv.memoryUsedMb / srv.memoryLimitMb) * 100) : 0;
    if (memPct >= thresholds.memoryPercent) {
      alerts.push({
        serverId: srv.uuidShort,
        serverName: srv.name,
        metric: 'memory',
        valuePercent: memPct,
        thresholdPercent: thresholds.memoryPercent,
      });
    }
    const diskPct =
      srv.diskLimitMb > 0 ? Math.round((srv.diskUsedMb / srv.diskLimitMb) * 100) : 0;
    if (diskPct >= thresholds.diskPercent) {
      alerts.push({
        serverId: srv.uuidShort,
        serverName: srv.name,
        metric: 'disk',
        valuePercent: diskPct,
        thresholdPercent: thresholds.diskPercent,
      });
    }
  }
  return alerts;
}

const SENSITIVE_KEY_RE = /(password|token|secret|apikey|api_key|authorization|privatekey|setupkey)/i;
const TOKEN_VALUE_RE = /\b(ptlc_[A-Za-z0-9_-]+|ptla_[A-Za-z0-9_-]+|pn_db_[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9._-]+)\b/gi;

export function redactSensitiveDiagnosticData<T>(input: T): T {
  const seen = new WeakSet<object>();

  const walk = (val: unknown): unknown => {
    if (typeof val === 'string') {
      return val
        .replace(TOKEN_VALUE_RE, '[REDACTED_TOKEN]')
        .replace(
          /\b([A-Za-z0-9._%+-]{2})[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
          '$1***@$2',
        );
    }
    if (val === null || typeof val !== 'object') {
      return val;
    }
    if (seen.has(val)) {
      return '[Circular]';
    }
    seen.add(val);

    if (Array.isArray(val)) {
      return val.map(walk);
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = walk(v);
      }
    }
    return out;
  };

  return walk(input) as T;
}

export function computeBackupRetentionCandidates(
  backups: readonly CalagopusBackupRecord[],
  maxKeepCount: number,
): CalagopusBackupRecord[] {
  const safeKeep = Math.max(1, Math.floor(maxKeepCount));
  const sortedUnlocked = [...backups]
    .filter((b) => !b.isLocked && b.isSuccessful)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (sortedUnlocked.length <= safeKeep) {
    return [];
  }
  return sortedUnlocked.slice(safeKeep);
}

export type FeatureSupportLevel =
  | 'supported'
  | 'panel-file-api'
  | 'preview-only'
  | 'backend-required';

export interface PracticalFeatureDescriptor {
  number: number;
  category: string;
  name: string;
  route: string;
  support: FeatureSupportLevel;
}

export const PROMPT_21_FEATURE_MATRIX: readonly PracticalFeatureDescriptor[] = [
  // Category A: Minecraft & Game Server Management
  { number: 1, category: 'Minecraft & Game', name: 'Visual server.properties Editor', route: '/server/alpha-01/minecraft', support: 'panel-file-api' },
  { number: 2, category: 'Minecraft & Game', name: 'Minecraft MOTD Live Previewer', route: '/server/alpha-01/minecraft', support: 'panel-file-api' },
  { number: 3, category: 'Minecraft & Game', name: 'Server Icon Manager (64x64 server-icon.png)', route: '/server/alpha-01/minecraft', support: 'panel-file-api' },
  { number: 4, category: 'Minecraft & Game', name: 'Version / Software Chooser Quick Links', route: '/server/alpha-01/startup', support: 'supported' },
  { number: 5, category: 'Minecraft & Game', name: 'Plugin & Mod Manager (.jar enable/disable)', route: '/server/alpha-01/minecraft', support: 'panel-file-api' },
  { number: 6, category: 'Minecraft & Game', name: 'World & Dimension Manager', route: '/server/alpha-01/minecraft', support: 'panel-file-api' },
  { number: 7, category: 'Minecraft & Game', name: 'Player Whitelist & OP Manager', route: '/server/alpha-01/minecraft', support: 'panel-file-api' },
  { number: 8, category: 'Minecraft & Game', name: 'Ban List Manager (via console / JSON)', route: '/server/alpha-01/minecraft', support: 'panel-file-api' },
  { number: 9, category: 'Minecraft & Game', name: 'EULA Acceptance Shortcut (eula=true)', route: '/server/alpha-01/minecraft', support: 'panel-file-api' },
  { number: 10, category: 'Minecraft & Game', name: 'Startup Flag Preset Helper (Aikar G1GC / Aikars)', route: '/server/alpha-01/startup', support: 'supported' },
  // Category B: Server Operations & DevOps
  { number: 11, category: 'Server Ops', name: 'Console Log Search & Level Filter', route: '/server/alpha-01', support: 'supported' },
  { number: 12, category: 'Server Ops', name: 'Command History & Autocomplete', route: '/server/alpha-01', support: 'supported' },
  { number: 13, category: 'Server Ops', name: 'Crash Log Analyzer', route: '/server/alpha-01/minecraft', support: 'panel-file-api' },
  { number: 14, category: 'Server Ops', name: 'Automated Restart & Backup Schedules', route: '/server/alpha-01/schedules', support: 'supported' },
  { number: 15, category: 'Server Ops', name: 'Backup Retention Policy Helper', route: '/server/alpha-01/backups', support: 'supported' },
  { number: 16, category: 'Server Ops', name: 'Archive Compress & Decompress', route: '/server/alpha-01/files', support: 'supported' },
  { number: 17, category: 'Server Ops', name: 'Drag-and-Drop Multi-File Upload', route: '/server/alpha-01/files', support: 'supported' },
  { number: 18, category: 'Server Ops', name: 'Quick SFTP Connection Launcher', route: '/server/alpha-01/overview', support: 'supported' },
  { number: 19, category: 'Server Ops', name: 'Environment Variables Diff & Validator', route: '/server/alpha-01/startup', support: 'supported' },
  { number: 20, category: 'Server Ops', name: 'Server Reinstall Confirmation Workflow', route: '/server/alpha-01/settings', support: 'supported' },
  // Category C: Monitoring & Telemetry
  { number: 21, category: 'Monitoring', name: 'Live CPU & Memory Telemetry Charts', route: '/server/alpha-01/overview', support: 'supported' },
  { number: 22, category: 'Monitoring', name: 'Network RX/TX Throughput Graph', route: '/server/alpha-01/overview', support: 'supported' },
  { number: 23, category: 'Monitoring', name: 'Disk Space Quota Visualization', route: '/server/alpha-01/overview', support: 'supported' },
  { number: 24, category: 'Monitoring', name: 'Configurable Resource Alert Thresholds', route: '/account', support: 'supported' },
  { number: 25, category: 'Monitoring', name: 'Cluster Analytics Time-Range Filter', route: '/admin/analytics', support: 'supported' },
  { number: 26, category: 'Monitoring', name: 'Server Uptime & Boot History Tracker', route: '/server/alpha-01/overview', support: 'supported' },
  { number: 27, category: 'Monitoring', name: 'Node Capacity Distribution Breakdown', route: '/admin/nodes', support: 'supported' },
  { number: 28, category: 'Monitoring', name: 'JSON & CSV Telemetry Export', route: '/admin/analytics', support: 'supported' },
  // Category D: Administration & Infrastructure
  { number: 29, category: 'Admin & Infra', name: 'Node Maintenance Mode Toggle', route: '/admin/nodes', support: 'supported' },
  { number: 30, category: 'Admin & Infra', name: 'Visual IP:Port Allocation Grid', route: '/admin/allocations', support: 'supported' },
  { number: 31, category: 'Admin & Infra', name: '3-Step Egg Server Provisioning Wizard', route: '/admin/servers', support: 'supported' },
  { number: 32, category: 'Admin & Infra', name: 'Bulk Server Power Actions', route: '/admin/servers', support: 'supported' },
  { number: 33, category: 'Admin & Infra', name: 'Server Suspension / Unsuspension Toggle', route: '/admin/servers', support: 'supported' },
  { number: 34, category: 'Admin & Infra', name: 'Role Permission Templates (RBAC)', route: '/admin/roles', support: 'supported' },
  { number: 35, category: 'Admin & Infra', name: 'Egg Library Repository Browser (100+ Eggs)', route: '/admin/nests', support: 'supported' },
  { number: 36, category: 'Admin & Infra', name: 'Admin Audit Log CSV & JSON Export', route: '/admin/audit-logs', support: 'supported' },
  // Category E: Security & Access Control
  { number: 37, category: 'Security', name: 'TOTP Two-Factor Authentication Flow', route: '/account/security', support: 'supported' },
  { number: 38, category: 'Security', name: 'Active Session Inspector & Revocation', route: '/account/security', support: 'supported' },
  { number: 39, category: 'Security', name: 'Personal API Key Scope & IP Restrictions', route: '/account/api-keys', support: 'supported' },
  { number: 40, category: 'Security', name: 'SSH Public Key Manager', route: '/account/ssh-keys', support: 'supported' },
  { number: 41, category: 'Security', name: 'Granular Subuser Permission Editor', route: '/server/alpha-01/users', support: 'supported' },
  { number: 42, category: 'Security', name: 'Database Host & Access Control Manager', route: '/server/alpha-01/databases', support: 'supported' },
  // Category F: UX, Personalization & Productivity
  { number: 43, category: 'UX & Productivity', name: 'Liquid Glass Expandable Sidebar w/ Search', route: '/', support: 'supported' },
  { number: 44, category: 'UX & Productivity', name: 'Global Command Palette (Ctrl+K)', route: '/', support: 'supported' },
  { number: 45, category: 'UX & Productivity', name: 'Pinned Favorite & Recent Servers', route: '/', support: 'supported' },
  { number: 46, category: 'UX & Productivity', name: 'Keyboard Shortcut Reference Modal (?)', route: '/', support: 'supported' },
  { number: 47, category: 'UX & Productivity', name: 'Customizable Dashboard Widget Order', route: '/', support: 'supported' },
  { number: 48, category: 'UX & Productivity', name: 'Onboarding Checklist & Localization Selector', route: '/', support: 'supported' },
  // Category G: Diagnostics & Optional AI Assistant
  { number: 49, category: 'Diagnostics & AI', name: 'Redacted Diagnostic Bundle Export & API Explorer', route: '/admin/diagnostics', support: 'supported' },
  { number: 50, category: 'Diagnostics & AI', name: 'Server-Side Gemini Troubleshooting Assistant', route: '/admin/diagnostics', support: 'backend-required' },
];
