import React from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { SlidersHorizontal } from 'lucide-react';
import {
  AccountApiKeysPage,
  AccountProfilePage,
  AccountSecurityPage,
  AccountSshKeysPage,
  ActivityLogPage,
  AdminDashboardPage,
  AdminDiagnosticsPage,
  AdminExtensionsPage,
  AdminResourcesPage,
  AppShell,
  AuthShell,
  blushCssVariablesResolver,
  blushMantineTheme,
  buildPanelNotifications,
  Button,
  ClientDashboardPage,
  DEFAULT_UI_PREFERENCES,
  dispatchAdminAction,
  dispatchClientAccountAction,
  dispatchClientServerAction,
  DropdownMenu,
  encodeUtf8ToBase64,
  ErrorState,
  fetchAdminDashboardFromApi,
  fetchClientDashboardFromApi,
  inferScopeFromPath,
  loadCustomServerBanners,
  loadFavoriteServerIds,
  loadRecentServerIds,
  ModalDialog,
  nextRuntimeStateForPowerAction,
  NotificationsPage,
  PageHeader,
  PasswordInput,
  PETALNODES_BRAND,
  pushRecentServerId,
  resolveSafeMoveTarget,
  SANDBOX_ADMIN_ALLOCATIONS,
  SANDBOX_ADMIN_EXTENSIONS,
  SANDBOX_ADMIN_FIXTURE,
  SANDBOX_ADMIN_NODES,
  SANDBOX_ADMIN_ROLES,
  SANDBOX_ADMIN_SETTINGS,
  SANDBOX_ADMIN_USERS,
  SANDBOX_ALLOCATIONS,
  SANDBOX_API_KEYS,
  SANDBOX_BACKUPS,
  SANDBOX_CLIENT_FIXTURE,
  SANDBOX_CONSOLE_LOGS,
  SANDBOX_DATABASES,
  SANDBOX_EXTRA_SERVERS,
  SANDBOX_SCHEDULES,
  SANDBOX_SERVER_DETAILS,
  SANDBOX_SERVER_FILES,
  SANDBOX_SSH_KEYS,
  SANDBOX_STARTUP_CONFIG,
  SANDBOX_SUBUSERS,
  SANDBOX_USER_SESSIONS,
  sanitizeDownloadFilename,
  sanitizeHref,
  saveCustomServerBanners,
  saveFavoriteServerIds,
  saveRecentServerIds,
  saveServerFileContentApi,
  sendServerPowerSignal,
  ServerBackupsPage,
  ServerConsolePage,
  ServerDatabasesPage,
  ServerFilesPage,
  ServerMinecraftPage,
  ServerNetworkPage,
  ServerOverviewPage,
  ServerSchedulesPage,
  ServerSettingsPage,
  ServerStartupPage,
  ServerUsersPage,
  showToast,
  TextInput,
  uploadServerFilesApi,
  type AdminDashboardPayload,
  type CalagopusActivityEntry,
  type CalagopusAdminAllocation,
  type CalagopusAdminExtension,
  type CalagopusAdminNode,
  type CalagopusAdminSettings,
  type CalagopusAdminUser,
  type CalagopusAllocationRecord,
  type CalagopusApiKey,
  type CalagopusBackupRecord,
  type CalagopusConsoleLine,
  type CalagopusDatabaseRecord,
  type CalagopusEggEntry,
  type CalagopusFileEntry,
  type CalagopusScheduleRecord,
  type CalagopusScheduleTask,
  type CalagopusServerDetail,
  type CalagopusServerSummary,
  type CalagopusSshKeyRecord,
  type CalagopusStartupConfig,
  type CalagopusSubuserRecord,
  type CalagopusUserContext,
  type CalagopusUserSession,
  type ClientDashboardPayload,
  type ExtensionConfigValues,
  type PetalnodesUiPreferences,
  type ServerPowerAction,
} from '../backend-extensions/cloud_petalnodes_sanctuary/frontend/src/workbench';

type ViewDataMode = 'fixture' | 'live' | 'loading' | 'empty' | 'error';

const UI_PREFS_STORAGE_KEY = 'petalnodes.ui.preferences';

const INITIAL_ADMIN_PROFILE: CalagopusUserContext = {
  id: 'usr-admin-01',
  username: 'elena.rostova',
  email: 'elena@petalnodes.cloud',
  isAdmin: true,
  permissions: ['*'],
};

const INITIAL_MEMBER_PROFILE: CalagopusUserContext = {
  id: 'usr-mem-02',
  username: 'lucas.meyer',
  email: 'lucas@petalnodes.cloud',
  isAdmin: false,
  permissions: [
    'control.console',
    'control.power',
    'file.read',
    'file.write',
    'database.read',
    'backup.read',
    'schedule.read',
    'allocation.read',
    'startup.read',
    'user.read',
    'settings.rename',
    'activity.read',
  ],
};

function loadUiPreferences(): PetalnodesUiPreferences {
  if (typeof window === 'undefined') return DEFAULT_UI_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(UI_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_UI_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<PetalnodesUiPreferences>;
    return {
      confirmDestructiveActions:
        typeof parsed.confirmDestructiveActions === 'boolean'
          ? parsed.confirmDestructiveActions
          : DEFAULT_UI_PREFERENCES.confirmDestructiveActions,
      compactTableRows:
        typeof parsed.compactTableRows === 'boolean'
          ? parsed.compactTableRows
          : DEFAULT_UI_PREFERENCES.compactTableRows,
      consoleAutoScrollDefault:
        typeof parsed.consoleAutoScrollDefault === 'boolean'
          ? parsed.consoleAutoScrollDefault
          : DEFAULT_UI_PREFERENCES.consoleAutoScrollDefault,
    };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

function parseServerRoute(path: string): { serverId: string; subRoute: string } | null {
  if (!path.startsWith('/server/')) return null;
  const segments = path.split('/').filter(Boolean);
  return {
    serverId: segments[1] ?? 'alpha-01',
    subRoute: segments[2] ?? 'console',
  };
}

function cryptoRandomToken(length: number): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('Secure Web Crypto CSPRNG is unavailable in this environment.');
  }
  const bytes = new Uint8Array(length);
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function triggerSafeBrowserDownload(url: string, filename: string): void {
  const safeUrl = sanitizeHref(url);
  if (!safeUrl) {
    throw new Error('Blocked unsafe download URL returned by server.');
  }
  const anchor = document.createElement('a');
  anchor.href = safeUrl;
  anchor.download = sanitizeDownloadFilename(filename);
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function DashboardVerificationHost() {
  const [currentPath, setRawCurrentPath] = React.useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    const p = window.location.pathname || '/';
    return p === '' ? '/' : p;
  });

  const setCurrentPath = React.useCallback((action: React.SetStateAction<string>) => {
    setRawCurrentPath((prev) => {
      const nextRaw = typeof action === 'function' ? action(prev) : action;
      const normalized = nextRaw.startsWith('/') ? nextRaw : `/${nextRaw}`;
      if (typeof window !== 'undefined' && window.location.pathname !== normalized) {
        window.history.pushState({}, '', normalized);
      }
      return normalized;
    });
  }, []);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(
        'data-petalnodes-theme',
        'cloud.petalnodes.sanctuary@2.1.0',
      );
    }
    if (typeof window === 'undefined') return undefined;
    const onPopState = () => {
      setRawCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [isAdminRole, setIsAdminRole] = React.useState<boolean>(true);
  const [adminProfile, setAdminProfile] = React.useState<CalagopusUserContext>(INITIAL_ADMIN_PROFILE);
  const [memberProfile, setMemberProfile] = React.useState<CalagopusUserContext>(INITIAL_MEMBER_PROFILE);

  const [mode, setMode] = React.useState<ViewDataMode>('fixture');
  const [liveClientData, setLiveClientData] = React.useState<ClientDashboardPayload | null>(null);
  const [liveAdminData, setLiveAdminData] = React.useState<AdminDashboardPayload | null>(null);
  const [liveLoading, setLiveLoading] = React.useState<boolean>(false);
  const [liveError, setLiveError] = React.useState<string | null>(null);

  const [authEmail, setAuthEmail] = React.useState('elena@petalnodes.cloud');
  const [authPassword, setAuthPassword] = React.useState('');
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Stateful Calagopus panel modules
  const [serverDetailsMap, setServerDetailsMap] = React.useState<Record<string, CalagopusServerDetail>>(
    () => ({ ...SANDBOX_SERVER_DETAILS }),
  );
  const [consoleLogs, setConsoleLogs] = React.useState<CalagopusConsoleLine[]>(() => [
    ...SANDBOX_CONSOLE_LOGS,
  ]);
  const [serverFiles, setServerFiles] = React.useState<CalagopusFileEntry[]>(() => [
    ...SANDBOX_SERVER_FILES,
  ]);
  const [databases, setDatabases] = React.useState<CalagopusDatabaseRecord[]>(() => [
    ...SANDBOX_DATABASES,
  ]);
  const [backups, setBackups] = React.useState<CalagopusBackupRecord[]>(() => [...SANDBOX_BACKUPS]);
  const [schedules, setSchedules] = React.useState<CalagopusScheduleRecord[]>(() => [
    ...SANDBOX_SCHEDULES,
  ]);
  const [allocations, setAllocations] = React.useState<CalagopusAllocationRecord[]>(() => [
    ...SANDBOX_ALLOCATIONS,
  ]);
  const [startupConfigs, setStartupConfigs] = React.useState<Record<string, CalagopusStartupConfig>>(
    () => ({ 'alpha-01': { ...SANDBOX_STARTUP_CONFIG } }),
  );
  const [subusers, setSubusers] = React.useState<CalagopusSubuserRecord[]>(() => [
    ...SANDBOX_SUBUSERS,
  ]);
  const [apiKeys, setApiKeys] = React.useState<CalagopusApiKey[]>(() => [...SANDBOX_API_KEYS]);
  const [sshKeys, setSshKeys] = React.useState<CalagopusSshKeyRecord[]>(() => [
    ...SANDBOX_SSH_KEYS,
  ]);
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState<boolean>(false);
  const [uiPreferences, setUiPreferences] = React.useState<PetalnodesUiPreferences>(() =>
    loadUiPreferences(),
  );
  const [adminExtensions, setAdminExtensions] = React.useState<CalagopusAdminExtension[]>(() => [
    ...SANDBOX_ADMIN_EXTENSIONS,
  ]);
  const [customBanners, setCustomBanners] = React.useState<Record<string, string>>(() =>
    loadCustomServerBanners(),
  );
  const [activityEntries, setActivityEntries] = React.useState<CalagopusActivityEntry[]>(() => [
    ...SANDBOX_CLIENT_FIXTURE.activity,
  ]);
  const [readNotificationIds, setReadNotificationIds] = React.useState<string[]>([]);
  const [favoriteServerIds, setFavoriteServerIds] = React.useState<string[]>(() =>
    loadFavoriteServerIds(),
  );
  const [recentServerIds, setRecentServerIds] = React.useState<string[]>(() =>
    loadRecentServerIds(),
  );
  const [adminNodes, setAdminNodes] = React.useState<CalagopusAdminNode[]>(() => [
    ...SANDBOX_ADMIN_NODES,
  ]);
  const [adminAllocations, setAdminAllocations] = React.useState<CalagopusAdminAllocation[]>(() => [
    ...SANDBOX_ADMIN_ALLOCATIONS,
  ]);
  const [adminUsers, setAdminUsers] = React.useState<CalagopusAdminUser[]>(() => [
    ...SANDBOX_ADMIN_USERS,
  ]);
  const [adminSettings, setAdminSettings] = React.useState<CalagopusAdminSettings>(() => ({
    ...SANDBOX_ADMIN_SETTINGS,
  }));
  const [userSessions, setUserSessions] = React.useState<CalagopusUserSession[]>(() => [
    ...SANDBOX_USER_SESSIONS,
  ]);
  const [createdServers, setCreatedServers] = React.useState<CalagopusServerSummary[]>([]);
  const [shortcutsOpen, setShortcutsOpen] = React.useState<boolean>(false);

  const user = isAdminRole ? adminProfile : memberProfile;
  const scope = inferScopeFromPath(currentPath);
  const parsedServer = parseServerRoute(currentPath);
  const activeServerId = parsedServer?.serverId ?? 'alpha-01';

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentPath]);

  React.useEffect(() => {
    if (!parsedServer?.serverId) return;
    setRecentServerIds((prev) => {
      const next = pushRecentServerId(prev, parsedServer.serverId);
      saveRecentServerIds(next);
      return next;
    });
  }, [parsedServer?.serverId]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      setShortcutsOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const appendActivity = React.useCallback(
    (event: string, description: string, status: CalagopusActivityEntry['status'] = 'completed') => {
      const entry: CalagopusActivityEntry = {
        id: `act-${Date.now()}`,
        event,
        description,
        actor: user.username,
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status,
      };
      setActivityEntries((prev) => [entry, ...prev]);
    },
    [user.username],
  );

  const allFixtureServers = React.useMemo(
    () =>
      [...SANDBOX_CLIENT_FIXTURE.servers, ...SANDBOX_EXTRA_SERVERS, ...createdServers].map((srv) => {
        const updated = serverDetailsMap[srv.uuidShort];
        return updated
          ? {
              ...srv,
              name: updated.name,
              state: updated.state,
              cpuPercent: updated.cpuPercent,
            }
          : srv;
      }),
    [serverDetailsMap, createdServers],
  );

  const activeServerDetail: CalagopusServerDetail = React.useMemo(() => {
    const existing = serverDetailsMap[activeServerId];
    if (existing) return existing;
    const summary = allFixtureServers.find((s) => s.uuidShort === activeServerId);
    if (summary) {
      return {
        ...SANDBOX_SERVER_DETAILS['alpha-01'],
        ...summary,
        description: `${summary.eggName} container running on ${summary.node}.`,
        sftpHost: `sftp.${summary.node}.petalnodes.cloud`,
        sftpUsername: `${user.username.split('.')[0]}.${summary.uuidShort}`,
      };
    }
    return SANDBOX_SERVER_DETAILS['alpha-01'];
  }, [activeServerId, serverDetailsMap, allFixtureServers, user.username]);

  const activeServerAllocations = React.useMemo(() => {
    const matching = allocations.filter((a) => a.serverId === activeServerDetail.uuidShort);
    if (matching.length > 0) return matching;
    const [ip, portRaw] = activeServerDetail.allocation.split(':');
    return [
      {
        id: `alloc-default-${activeServerDetail.uuidShort}`,
        serverId: activeServerDetail.uuidShort,
        ip: ip ?? '198.51.100.14',
        alias: '',
        port: Number(portRaw) || 25565,
        notes: 'Primary server allocation',
        isPrimary: true,
      },
    ];
  }, [allocations, activeServerDetail]);

  const activeStartupConfig: CalagopusStartupConfig = React.useMemo(() => {
    const existing = startupConfigs[activeServerDetail.uuidShort];
    if (existing) return existing;
    return {
      ...SANDBOX_STARTUP_CONFIG,
      serverId: activeServerDetail.uuidShort,
    };
  }, [startupConfigs, activeServerDetail.uuidShort]);

  const liveControllerRef = React.useRef<AbortController | null>(null);

  const loadLiveApi = React.useCallback(async () => {
    liveControllerRef.current?.abort();
    const controller = new AbortController();
    liveControllerRef.current = controller;

    setLiveLoading(true);
    setLiveError(null);
    try {
      if (currentPath.startsWith('/admin')) {
        const res = await fetchAdminDashboardFromApi(controller.signal);
        if (!controller.signal.aborted) {
          setLiveAdminData(res);
        }
      } else {
        const res = await fetchClientDashboardFromApi(controller.signal);
        if (!controller.signal.aborted) {
          setLiveClientData(res);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setLiveError(
        err instanceof Error
          ? `${err.message}. Connect a running Calagopus Rust/Axum panel backend to stream live telemetry.`
          : 'Unable to reach Calagopus panel API.',
      );
    } finally {
      if (!controller.signal.aborted) {
        setLiveLoading(false);
      }
    }
  }, [currentPath]);

  React.useEffect(() => {
    if (mode === 'live') {
      void loadLiveApi();
      return () => {
        liveControllerRef.current?.abort();
      };
    }
    return undefined;
  }, [mode, loadLiveApi]);

  const resolvedClientData: ClientDashboardPayload | null = React.useMemo(() => {
    if (mode === 'fixture') {
      return {
        servers: allFixtureServers,
        activity: activityEntries,
      };
    }
    if (mode === 'empty') return { servers: [], activity: [] };
    if (mode === 'live') return liveClientData;
    return null;
  }, [mode, allFixtureServers, activityEntries, liveClientData]);

  const resolvedAdminData: AdminDashboardPayload | null = React.useMemo(() => {
    if (mode === 'fixture') return SANDBOX_ADMIN_FIXTURE;
    if (mode === 'empty') {
      return {
        system: {
          ...SANDBOX_ADMIN_FIXTURE.system,
          cpuHistory: [],
          memoryHistory: [],
        },
        auditLogs: [],
      };
    }
    if (mode === 'live') return liveAdminData;
    return null;
  }, [mode, liveAdminData]);

  const isLoading = mode === 'loading' || (mode === 'live' && liveLoading);
  const errorMessage =
    mode === 'error'
      ? 'Simulated backend failure: Calagopus daemon endpoint timed out.'
      : mode === 'live'
        ? liveError
        : null;

  const dataSourceLabel =
    mode === 'fixture'
      ? 'Preview Fixture'
      : mode === 'live'
        ? 'Live Panel API'
        : mode === 'loading'
          ? 'Loading State'
          : mode === 'empty'
            ? 'Empty State'
            : 'Error State';

  const notifyLiveDispatchError = (actionLabel: string, err: unknown) => {
    showToast({
      title: `${actionLabel} failed`,
      message: err instanceof Error ? err.message : 'Unable to reach Calagopus panel API.',
      tone: 'error',
    });
  };

  const handleServerPowerAction = (action: ServerPowerAction, targetServerId?: string) => {
    const resolvedId = targetServerId ?? activeServerDetail.uuidShort;
    if (mode === 'live') {
      void sendServerPowerSignal(resolvedId, action).catch((err) => {
        notifyLiveDispatchError('Power request', err);
      });
      return;
    }

    const summary = allFixtureServers.find((s) => s.uuidShort === resolvedId);
    const baseDetail: CalagopusServerDetail =
      serverDetailsMap[resolvedId] ??
      (summary
        ? {
            ...SANDBOX_SERVER_DETAILS['alpha-01'],
            ...summary,
            description: `${summary.eggName} container running on ${summary.node}.`,
            sftpHost: `sftp.${summary.node}.petalnodes.cloud`,
            sftpUsername: `${user.username.split('.')[0]}.${summary.uuidShort}`,
          }
        : activeServerDetail);

    const nextState = nextRuntimeStateForPowerAction(action);
    const nowTime = new Date().toTimeString().slice(0, 8);
    setServerDetailsMap((prev) => ({
      ...prev,
      [resolvedId]: {
        ...baseDetail,
        state: nextState,
        cpuPercent: nextState === 'running' ? Math.max(12.4, baseDetail.cpuPercent || 18.4) : 0,
        uptimeSeconds: nextState === 'running' ? Math.max(60, baseDetail.uptimeSeconds) : 0,
      },
    }));

    setConsoleLogs((prev) => [
      ...prev,
      {
        id: `log-pwr-${Date.now()}`,
        timestamp: nowTime,
        level: action === 'stop' || action === 'kill' ? 'WARN' : 'INFO',
        source: 'WingsDaemon',
        message: `Power signal "${action}" dispatched for ${baseDetail.name} (${nextState}).`,
      },
    ]);
    appendActivity(`server:power.${action}`, `Dispatched "${action}" signal for ${baseDetail.name}.`);

    showToast({
      title: `Power signal: ${action}`,
      message: `${baseDetail.name} is now ${nextState}.`,
      tone: action === 'stop' || action === 'kill' ? 'warning' : 'success',
    });
  };

  const handleSaveCustomBanner = (serverId: string, dataUri: string | null) => {
    setCustomBanners((prev) => {
      const next = { ...prev };
      if (dataUri) {
        next[serverId] = dataUri;
      } else {
        delete next[serverId];
      }
      saveCustomServerBanners(next);
      return next;
    });
  };

  const handleToggleAdminExtension = async (
    identifier: string,
    nextStatus: 'active' | 'disabled',
  ) => {
    setAdminExtensions((prev) =>
      prev.map((ext) => (ext.identifier === identifier ? { ...ext, status: nextStatus } : ext)),
    );
    appendActivity(
      'admin:extension.toggle',
      `${nextStatus === 'active' ? 'Enabled' : 'Disabled'} extension ${identifier}.`,
      nextStatus === 'active' ? 'completed' : 'warning',
    );
  };

  const handleInstallAdminExtension = async (
    _file: File,
    parsedIdentifier: string,
    parsedName: string,
  ) => {
    setAdminExtensions((prev) => {
      if (prev.some((e) => e.identifier === parsedIdentifier)) {
        return prev.map((e) =>
          e.identifier === parsedIdentifier ? { ...e, status: 'active' } : e,
        );
      }
      return [
        {
          identifier: parsedIdentifier,
          name: parsedName,
          version: '1.0.0',
          author: user.username,
          status: 'active',
          description: 'Uploaded .c7s.zip extension archive staged for Calagopus apply.',
        },
        ...prev,
      ];
    });
    appendActivity('admin:extension.install', `Staged extension ${parsedIdentifier}.`);
  };

  const handleRemoveAdminExtension = async (identifier: string) => {
    setAdminExtensions((prev) => prev.filter((ext) => ext.identifier !== identifier));
    appendActivity('admin:extension.remove', `Removed extension ${identifier}.`, 'warning');
  };

  const handleSaveExtensionConfig = async (
    identifier: string,
    _values: ExtensionConfigValues,
  ) => {
    appendActivity('admin:extension.config', `Saved configuration for ${identifier}.`);
  };

  const handleSendConsoleCommand = (command: string) => {
    if (mode === 'live') {
      void dispatchClientServerAction(activeServerDetail.uuidShort, 'command', 'POST', { command }).catch(
        (err) => notifyLiveDispatchError('Command dispatch', err),
      );
      return;
    }

    const nowTime = new Date().toTimeString().slice(0, 8);
    const responseMessage =
      command === 'list'
        ? 'There are 3 of a max of 20 players online: elena_dev, aria_mc, kira_builds'
        : command === 'tps'
          ? 'TPS from last 1m, 5m, 15m: 20.0, 20.0, 19.98'
          : command === 'save-all'
            ? 'Saved the game (chunks flushed to disk).'
            : `Executed command "${command}" on ${activeServerDetail.name}.`;

    setConsoleLogs((prev) => [
      ...prev,
      {
        id: `cmd-${Date.now()}`,
        timestamp: nowTime,
        level: 'CMD',
        source: user.username,
        message: command,
      },
      {
        id: `res-${Date.now() + 1}`,
        timestamp: nowTime,
        level: 'INFO',
        source: 'Server',
        message: responseMessage,
      },
    ]);
  };

  const handleCreateFileEntry = async (directory: string, name: string, isDirectory: boolean) => {
    if (mode === 'live') {
      try {
        if (isDirectory) {
          await dispatchClientServerAction(
            activeServerDetail.uuidShort,
            'files/create-directory',
            'POST',
            { root: directory, name },
          );
        } else {
          const targetPath = `${directory === '/' ? '' : directory}/${name}`;
          await saveServerFileContentApi(activeServerDetail.uuidShort, targetPath, '');
        }
      } catch (err) {
        notifyLiveDispatchError(isDirectory ? 'Create folder' : 'Create file', err);
        throw err;
      }
      return;
    }

    const cleanDir = directory === '/' ? '' : directory;
    const fullPath = `${cleanDir}/${name}`;
    const newEntry: CalagopusFileEntry = {
      id: `file-${Date.now()}`,
      path: fullPath,
      directory,
      name,
      isDirectory,
      sizeBytes: isDirectory ? 4096 : 0,
      modifiedAt: 'Just now',
      modifiedEpoch: Math.floor(Date.now() / 1000),
      permissions: isDirectory ? 'drwxr-xr-x' : '-rw-r--r--',
      mimeType: isDirectory ? 'inode/directory' : 'text/plain',
      content: isDirectory ? undefined : '',
    };
    setServerFiles((prev) => [...prev, newEntry]);
    appendActivity('server:file.create', `Created ${isDirectory ? 'folder' : 'file'} ${fullPath}.`);
  };

  const handleUploadFiles = async (directory: string, uploadedFiles: File[]) => {
    if (mode === 'live') {
      try {
        await uploadServerFilesApi(activeServerDetail.uuidShort, directory, uploadedFiles);
      } catch (err) {
        notifyLiveDispatchError('File upload', err);
        throw err;
      }
      return;
    }

    const cleanDir = directory === '/' ? '' : directory;
    const timestamp = Math.floor(Date.now() / 1000);

    uploadedFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        const textContent = typeof reader.result === 'string' ? reader.result : '';
        const newEntry: CalagopusFileEntry = {
          id: `file-up-${Date.now()}-${idx}`,
          path: `${cleanDir}/${file.name}`,
          directory,
          name: file.name,
          isDirectory: false,
          sizeBytes: file.size || new Blob([textContent]).size,
          modifiedAt: 'Just now',
          modifiedEpoch: timestamp,
          permissions: '-rw-r--r--',
          mimeType: file.type || 'text/plain',
          content: textContent,
        };
        setServerFiles((prev) => [
          ...prev.filter((f) => !(f.directory === directory && f.name === file.name)),
          newEntry,
        ]);
      };
      reader.onerror = () => {
        showToast({
          title: 'File read failed',
          message: `Unable to read "${file.name}" from disk.`,
          tone: 'error',
        });
      };
      reader.readAsText(file);
    });
    appendActivity(
      'server:file.upload',
      `Uploaded ${uploadedFiles.length} file(s) to ${directory} on ${activeServerDetail.name}.`,
    );
  };

  const handleSaveFileContent = async (fileId: string, nextContent: string) => {
    const target = serverFiles.find((f) => f.id === fileId);
    if (mode === 'live' && target) {
      try {
        await saveServerFileContentApi(activeServerDetail.uuidShort, target.path, nextContent);
      } catch (err) {
        notifyLiveDispatchError('Save file', err);
        throw err;
      }
      return;
    }
    setServerFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              content: nextContent,
              sizeBytes: new Blob([nextContent]).size,
              modifiedAt: 'Just now',
              modifiedEpoch: Math.floor(Date.now() / 1000),
            }
          : f,
      ),
    );
    appendActivity('server:file.write', `Saved file edits on ${activeServerDetail.name}.`);
  };

  const handleRenameFileEntry = async (fileId: string, nextName: string) => {
    const target = serverFiles.find((f) => f.id === fileId);
    if (mode === 'live' && target) {
      try {
        await dispatchClientServerAction(activeServerDetail.uuidShort, 'files/rename', 'PUT', {
          root: target.directory,
          files: [{ from: target.name, to: nextName }],
        });
      } catch (err) {
        notifyLiveDispatchError('Rename entry', err);
        throw err;
      }
      return;
    }
    setServerFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        const prefix = f.directory === '/' ? '' : f.directory;
        return {
          ...f,
          name: nextName,
          path: `${prefix}/${nextName}`,
          modifiedAt: 'Just now',
        };
      }),
    );
  };

  const handleMoveFileEntries = async (fileIds: readonly string[], destinationDir: string) => {
    const targets = serverFiles.filter((f) => fileIds.includes(f.id));
    if (targets.length === 0) return;

    if (mode === 'live') {
      try {
        for (const target of targets) {
          const resolved = resolveSafeMoveTarget(destinationDir, target.name);
          if ('error' in resolved) {
            throw new Error(resolved.error);
          }
          await dispatchClientServerAction(activeServerDetail.uuidShort, 'files/rename', 'PUT', {
            root: '/',
            files: [
              {
                from: target.path.replace(/^\/+/, ''),
                to: resolved.path.replace(/^\/+/, ''),
              },
            ],
          });
        }
      } catch (err) {
        notifyLiveDispatchError('Move entries', err);
        throw err;
      }
      return;
    }

    const idSet = new Set(fileIds);
    setServerFiles((prev) =>
      prev.map((f) => {
        if (!idSet.has(f.id)) return f;
        const resolved = resolveSafeMoveTarget(destinationDir, f.name);
        if ('error' in resolved) return f;
        return {
          ...f,
          directory: resolved.directory,
          path: resolved.path,
          modifiedAt: 'Just now',
        };
      }),
    );
    appendActivity(
      'server:file.move',
      `Moved ${targets.length} item(s) to ${destinationDir} on ${activeServerDetail.name}.`,
    );
  };

  const handleUpdatePermissions = async (fileId: string, nextPermissions: string) => {
    const target = serverFiles.find((f) => f.id === fileId);
    if (mode === 'live' && target) {
      try {
        await dispatchClientServerAction(activeServerDetail.uuidShort, 'files/chmod', 'POST', {
          root: target.directory,
          files: [{ file: target.name, mode: nextPermissions }],
        });
      } catch (err) {
        notifyLiveDispatchError('Update file mode', err);
        throw err;
      }
      return;
    }
    setServerFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, permissions: nextPermissions } : f)),
    );
  };

  const handleDeleteFileEntries = async (fileIds: readonly string[]) => {
    const targets = serverFiles.filter((f) => fileIds.includes(f.id));
    if (mode === 'live' && targets.length > 0) {
      try {
        await dispatchClientServerAction(activeServerDetail.uuidShort, 'files/delete', 'POST', {
          root: targets[0].directory,
          files: targets.map((t) => t.name),
        });
      } catch (err) {
        notifyLiveDispatchError('Delete entries', err);
        throw err;
      }
      return;
    }
    const idSet = new Set(fileIds);
    setServerFiles((prev) => prev.filter((f) => !idSet.has(f.id)));
    appendActivity(
      'server:file.delete',
      `Deleted ${fileIds.length} filesystem item(s) from ${activeServerDetail.name}.`,
      'warning',
    );
  };

  const handleDownloadFile = async (entry: CalagopusFileEntry) => {
    if (mode === 'live') {
      try {
        const res = (await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `files/download`,
          'POST',
          { root: entry.directory, files: [entry.name] },
        )) as { url?: string } | undefined;
        if (res?.url) {
          triggerSafeBrowserDownload(res.url, entry.name);
        }
      } catch (err) {
        notifyLiveDispatchError('Download file', err);
        throw err;
      }
      return;
    }

    if (entry.content !== undefined) {
      const blob = new Blob([entry.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = sanitizeDownloadFilename(entry.name);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      showToast({
        title: 'File downloaded',
        message: entry.name,
        tone: 'success',
      });
      return;
    }

    showToast({
      title: 'Connect live backend for binary download',
      message: `${entry.name} is preview metadata only without a running Wings daemon.`,
      tone: 'info',
    });
  };

  const handleCreateDatabase = async (input: { name: string; connectionsFrom: string }) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(activeServerDetail.uuidShort, 'databases', 'POST', {
          database: input.name,
          remote: input.connectionsFrom,
        });
      } catch (err) {
        notifyLiveDispatchError('Create database', err);
        throw err;
      }
      return;
    }

    const suffix = cryptoRandomToken(8);
    const created: CalagopusDatabaseRecord = {
      id: `db-${Date.now()}`,
      serverId: activeServerDetail.uuidShort,
      name: input.name,
      username: `u_${input.name.slice(0, 10)}`,
      host: `db-${activeServerDetail.node}.petalnodes.internal`,
      port: 3306,
      connectionsFrom: input.connectionsFrom,
      maxConnections: 25,
      password: `pn_db_${suffix}`,
    };
    setDatabases((prev) => [created, ...prev]);
    appendActivity('server:database.create', `Provisioned database ${input.name}.`);
  };

  const handleRotateDatabasePassword = async (databaseId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `databases/${encodeURIComponent(databaseId)}/rotate-password`,
          'POST',
        );
      } catch (err) {
        notifyLiveDispatchError('Rotate database password', err);
        throw err;
      }
      return;
    }
    const nextPass = `pn_db_${cryptoRandomToken(12)}`;
    setDatabases((prev) =>
      prev.map((d) => (d.id === databaseId ? { ...d, password: nextPass } : d)),
    );
    appendActivity('server:database.rotate-password', `Rotated password for database ${databaseId}.`);
  };

  const handleDeleteDatabase = async (databaseId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `databases/${encodeURIComponent(databaseId)}`,
          'DELETE',
        );
      } catch (err) {
        notifyLiveDispatchError('Delete database', err);
        throw err;
      }
      return;
    }
    setDatabases((prev) => prev.filter((d) => d.id !== databaseId));
    appendActivity('server:database.delete', `Dropped database ${databaseId}.`, 'warning');
  };

  const handleCreateBackup = async (input: {
    name: string;
    ignoredFiles: string;
    isLocked: boolean;
  }) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(activeServerDetail.uuidShort, 'backups', 'POST', {
          name: input.name,
          ignored_files: input.ignoredFiles.split(',').map((s) => s.trim()).filter(Boolean),
          locked: input.isLocked,
        });
      } catch (err) {
        notifyLiveDispatchError('Create backup', err);
        throw err;
      }
      return;
    }
    const shortId = cryptoRandomToken(8).toLowerCase();
    const created: CalagopusBackupRecord = {
      id: `bkp-${Date.now()}`,
      uuidShort: shortId,
      serverId: activeServerDetail.uuidShort,
      name: input.name,
      checksum: `sha256:${shortId}...${shortId.slice(0, 4)}`,
      bytes: 1610612736,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      isLocked: input.isLocked,
      isSuccessful: true,
      ignoredFiles: input.ignoredFiles,
    };
    setBackups((prev) => [created, ...prev]);
    appendActivity('server:backup.create', `Created backup snapshot "${input.name}".`);
  };

  const handleToggleBackupLock = async (backupId: string) => {
    const existing = backups.find((b) => b.id === backupId);
    const nextLocked = existing ? !existing.isLocked : true;
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `backups/${encodeURIComponent(backupId)}`,
          'PATCH',
          { locked: nextLocked },
        );
      } catch (err) {
        notifyLiveDispatchError('Toggle backup lock', err);
        throw err;
      }
      return;
    }
    setBackups((prev) =>
      prev.map((b) => (b.id === backupId ? { ...b, isLocked: !b.isLocked } : b)),
    );
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `backups/${encodeURIComponent(backupId)}/restore`,
          'POST',
          { truncate_directory: false },
        );
      } catch (err) {
        notifyLiveDispatchError('Restore backup', err);
        throw err;
      }
      return;
    }
    appendActivity('server:backup.restore', `Initiated restore from backup ${backupId}.`, 'warning');
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `backups/${encodeURIComponent(backupId)}`,
          'DELETE',
        );
      } catch (err) {
        notifyLiveDispatchError('Delete backup', err);
        throw err;
      }
      return;
    }
    setBackups((prev) => prev.filter((b) => b.id !== backupId));
    appendActivity('server:backup.delete', `Deleted backup snapshot ${backupId}.`, 'warning');
  };

  const handleDownloadBackup = async (backup: CalagopusBackupRecord) => {
    if (mode === 'live') {
      try {
        const res = (await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `backups/${encodeURIComponent(backup.id)}/download`,
          'GET',
        )) as { url?: string } | undefined;
        if (res?.url) {
          triggerSafeBrowserDownload(res.url, `${backup.name}.tar.gz`);
        }
      } catch (err) {
        notifyLiveDispatchError('Download backup', err);
        throw err;
      }
      return;
    }
    showToast({
      title: 'Connect live backend to download backup',
      message: `Backup ${backup.uuidShort} requires a signed Calagopus / Wings download URL.`,
      tone: 'info',
    });
  };

  const handleCreateSchedule = async (input: {
    name: string;
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
    onlyWhenOnline: boolean;
    taskAction: CalagopusScheduleTask['action'];
    taskPayload: string;
  }) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(activeServerDetail.uuidShort, 'schedules', 'POST', {
          name: input.name,
          triggers: [
            {
              type: 'cron',
              schedule: `${input.minute} ${input.hour} ${input.dayOfMonth} ${input.month} ${input.dayOfWeek}`,
            },
          ],
          condition: {
            type: input.onlyWhenOnline ? 'server_state' : 'none',
            ...(input.onlyWhenOnline ? { state: 'running' } : {}),
          },
          enabled: true,
        });
      } catch (err) {
        notifyLiveDispatchError('Create schedule', err);
        throw err;
      }
      return;
    }
    const created: CalagopusScheduleRecord = {
      id: `sch-${Date.now()}`,
      serverId: activeServerDetail.uuidShort,
      name: input.name,
      minute: input.minute,
      hour: input.hour,
      dayOfMonth: input.dayOfMonth,
      month: input.month,
      dayOfWeek: input.dayOfWeek,
      isActive: true,
      onlyWhenOnline: input.onlyWhenOnline,
      lastRunAt: null,
      nextRunAt: 'Scheduled next interval',
      tasks: [
        {
          id: `tsk-${Date.now()}`,
          sequenceId: 1,
          action: input.taskAction,
          payload: input.taskPayload,
          timeOffsetSeconds: 0,
        },
      ],
    };
    setSchedules((prev) => [created, ...prev]);
    appendActivity('server:schedule.create', `Created schedule "${input.name}".`);
  };

  const handleToggleScheduleActive = async (scheduleId: string) => {
    const existing = schedules.find((s) => s.id === scheduleId);
    const nextEnabled = existing ? !existing.isActive : true;
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `schedules/${encodeURIComponent(scheduleId)}`,
          'PATCH',
          { enabled: nextEnabled },
        );
      } catch (err) {
        notifyLiveDispatchError('Toggle schedule', err);
        throw err;
      }
      return;
    }
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, isActive: !s.isActive } : s)),
    );
  };

  const handleRunScheduleNow = async (scheduleId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `schedules/${encodeURIComponent(scheduleId)}/trigger`,
          'POST',
          { skip_condition: true },
        );
      } catch (err) {
        notifyLiveDispatchError('Run schedule', err);
        throw err;
      }
      return;
    }
    const nowStamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, lastRunAt: nowStamp } : s)),
    );
    appendActivity('server:schedule.execute', `Manually triggered schedule ${scheduleId}.`);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `schedules/${encodeURIComponent(scheduleId)}`,
          'DELETE',
        );
      } catch (err) {
        notifyLiveDispatchError('Delete schedule', err);
        throw err;
      }
      return;
    }
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    appendActivity('server:schedule.delete', `Removed schedule ${scheduleId}.`, 'warning');
  };

  const handleSetPrimaryAllocation = async (allocationId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `allocations/${encodeURIComponent(allocationId)}`,
          'PATCH',
          { primary: true },
        );
      } catch (err) {
        notifyLiveDispatchError('Set primary allocation', err);
        throw err;
      }
      return;
    }
    setAllocations((prev) => {
      const target = prev.find((a) => a.id === allocationId);
      if (target) {
        setServerDetailsMap((detailsPrev) => ({
          ...detailsPrev,
          [activeServerDetail.uuidShort]: {
            ...activeServerDetail,
            allocation: `${target.ip}:${target.port}`,
          },
        }));
      }
      return prev.map((a) =>
        a.serverId === activeServerDetail.uuidShort
          ? { ...a, isPrimary: a.id === allocationId }
          : a,
      );
    });
  };

  const handleUpdateAllocationNotes = async (allocationId: string, notes: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `allocations/${encodeURIComponent(allocationId)}`,
          'PATCH',
          { notes },
        );
      } catch (err) {
        notifyLiveDispatchError('Update allocation notes', err);
        throw err;
      }
      return;
    }
    setAllocations((prev) =>
      prev.map((a) => (a.id === allocationId ? { ...a, notes } : a)),
    );
  };

  const handleAllocatePort = async () => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(activeServerDetail.uuidShort, 'allocations', 'POST', {});
      } catch (err) {
        notifyLiveDispatchError('Allocate port', err);
        throw err;
      }
      return;
    }
    const maxPort = activeServerAllocations.reduce((m, a) => Math.max(m, a.port), 25565);
    const created: CalagopusAllocationRecord = {
      id: `alloc-${Date.now()}`,
      serverId: activeServerDetail.uuidShort,
      ip: activeServerAllocations[0]?.ip ?? '198.51.100.14',
      alias: '',
      port: maxPort + 1,
      notes: 'Additional UDP/TCP listener',
      isPrimary: false,
    };
    setAllocations((prev) => [...prev, created]);
    appendActivity('server:allocation.create', `Allocated port ${created.port} on ${activeServerDetail.name}.`);
  };

  const handleRemoveAllocation = async (allocationId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `allocations/${encodeURIComponent(allocationId)}`,
          'DELETE',
        );
      } catch (err) {
        notifyLiveDispatchError('Remove allocation', err);
        throw err;
      }
      return;
    }
    setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
    appendActivity('server:allocation.delete', `Released allocation ${allocationId}.`, 'warning');
  };

  const handleUpdateDockerImage = async (dockerImage: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          'startup/docker-image',
          'PUT',
          { image: dockerImage },
        );
      } catch (err) {
        notifyLiveDispatchError('Update Docker image', err);
        throw err;
      }
      return;
    }
    setStartupConfigs((prev) => ({
      ...prev,
      [activeServerDetail.uuidShort]: {
        ...activeStartupConfig,
        dockerImage,
      },
    }));
    appendActivity('server:startup.image', `Updated Docker image to ${dockerImage}.`);
  };

  const handleUpdateStartupVariable = async (envKey: string, value: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          'startup/variables',
          'PUT',
          { variables: [{ env_variable: envKey, value }] },
        );
      } catch (err) {
        notifyLiveDispatchError('Update startup variable', err);
        throw err;
      }
      return;
    }
    setStartupConfigs((prev) => ({
      ...prev,
      [activeServerDetail.uuidShort]: {
        ...activeStartupConfig,
        variables: activeStartupConfig.variables.map((v) =>
          v.envKey === envKey ? { ...v, value } : v,
        ),
      },
    }));
    appendActivity('server:startup.variable', `Updated ${envKey} on ${activeServerDetail.name}.`);
  };

  const handleInviteSubuser = async (email: string, permissions: string[]) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(activeServerDetail.uuidShort, 'subusers', 'POST', {
          email,
          permissions,
        });
      } catch (err) {
        notifyLiveDispatchError('Invite subuser', err);
        throw err;
      }
      return;
    }
    const created: CalagopusSubuserRecord = {
      id: `sub-${Date.now()}`,
      serverId: activeServerDetail.uuidShort,
      username: email.split('@')[0] ?? 'collaborator',
      email,
      permissions,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setSubusers((prev) => [created, ...prev]);
    appendActivity('server:subuser.create', `Invited subuser ${email} to ${activeServerDetail.name}.`);
  };

  const handleUpdateSubuserPermissions = async (subuserId: string, permissions: string[]) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `subusers/${encodeURIComponent(subuserId)}`,
          'PATCH',
          { permissions },
        );
      } catch (err) {
        notifyLiveDispatchError('Update subuser permissions', err);
        throw err;
      }
      return;
    }
    setSubusers((prev) =>
      prev.map((u) => (u.id === subuserId ? { ...u, permissions } : u)),
    );
  };

  const handleRemoveSubuser = async (subuserId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          `subusers/${encodeURIComponent(subuserId)}`,
          'DELETE',
        );
      } catch (err) {
        notifyLiveDispatchError('Remove subuser', err);
        throw err;
      }
      return;
    }
    setSubusers((prev) => prev.filter((u) => u.id !== subuserId));
    appendActivity('server:subuser.delete', `Revoked subuser ${subuserId}.`, 'warning');
  };

  const handleRenameServer = async (name: string, description: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(activeServerDetail.uuidShort, 'settings/rename', 'POST', {
          name,
          description,
        });
      } catch (err) {
        notifyLiveDispatchError('Rename server', err);
        throw err;
      }
      return;
    }
    setServerDetailsMap((prev) => ({
      ...prev,
      [activeServerDetail.uuidShort]: {
        ...activeServerDetail,
        name,
        description,
      },
    }));
    appendActivity('server:settings.rename', `Renamed server ${activeServerDetail.uuidShort} to "${name}".`);
  };

  const handleReinstallServer = async () => {
    if (mode === 'live') {
      try {
        await dispatchClientServerAction(
          activeServerDetail.uuidShort,
          'settings/install',
          'POST',
          { truncate_directory: false, start_on_completion: true },
        );
      } catch (err) {
        notifyLiveDispatchError('Reinstall server', err);
        throw err;
      }
      return;
    }
    const nowTime = new Date().toTimeString().slice(0, 8);
    setConsoleLogs((prev) => [
      ...prev,
      {
        id: `log-reinstall-${Date.now()}`,
        timestamp: nowTime,
        level: 'WARN',
        source: 'WingsInstaller',
        message: `Running egg installer script for ${activeServerDetail.name}...`,
      },
    ]);
    appendActivity('server:settings.reinstall', `Triggered container reinstall for ${activeServerDetail.name}.`, 'warning');
  };

  const handleCreateApiKey = async (input: {
    description: string;
    allowedIps: string[];
    permissions: string[];
  }) => {
    if (mode === 'live') {
      try {
        const res = (await dispatchClientAccountAction('api-keys', 'POST', {
          name: input.description,
          allowed_ips: input.allowedIps,
          permissions: input.permissions,
        })) as { key?: { uuid?: string; key_start?: string; name?: string; created?: string }; token?: string } | undefined;
        const suffix = res?.key?.key_start ?? 'ptlc_live';
        const createdKey: CalagopusApiKey = {
          id: res?.key?.uuid ?? `key-${Date.now()}`,
          identifier: suffix,
          description: res?.key?.name ?? input.description,
          allowedIps: input.allowedIps,
          permissions: input.permissions,
          lastUsedAt: null,
          createdAt: res?.key?.created ?? new Date().toISOString().slice(0, 10),
        };
        return { key: createdKey, secretToken: res?.token ?? '' };
      } catch (err) {
        notifyLiveDispatchError('Create API key', err);
        throw err;
      }
    }

    const suffix = cryptoRandomToken(6).toUpperCase();
    const identifier = `ptlc_01${suffix}`;
    const secretToken = `${identifier}_${cryptoRandomToken(16)}`;
    const newKey: CalagopusApiKey = {
      id: `key-${Date.now()}`,
      identifier,
      description: input.description,
      allowedIps: input.allowedIps,
      permissions: input.permissions,
      lastUsedAt: null,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setApiKeys((prev) => [newKey, ...prev]);
    appendActivity('account:api-key.create', `Issued client API key "${input.description}".`);
    return { key: newKey, secretToken };
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientAccountAction(`api-keys/${encodeURIComponent(keyId)}`, 'DELETE');
      } catch (err) {
        notifyLiveDispatchError('Revoke API key', err);
        throw err;
      }
      return;
    }
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    appendActivity('account:api-key.delete', `Revoked API key ${keyId}.`, 'warning');
  };

  const handleAddSshKey = async (input: { name: string; publicKey: string }) => {
    if (mode === 'live') {
      try {
        await dispatchClientAccountAction('ssh-keys', 'POST', {
          name: input.name,
          public_key: input.publicKey,
        });
      } catch (err) {
        notifyLiveDispatchError('Add SSH key', err);
        throw err;
      }
      return;
    }
    const fpHash = encodeUtf8ToBase64(input.publicKey).slice(0, 32).replace(/[^a-zA-Z0-9]/g, 'x');
    const created: CalagopusSshKeyRecord = {
      id: `ssh-${Date.now()}`,
      name: input.name,
      fingerprint: `SHA256:${fpHash}`,
      publicKeyPreview: `${input.publicKey.slice(0, 44)}...`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setSshKeys((prev) => [created, ...prev]);
    appendActivity('account:ssh-key.create', `Added SSH key "${input.name}".`);
  };

  const handleDeleteSshKey = async (keyId: string) => {
    if (mode === 'live') {
      try {
        await dispatchClientAccountAction(`ssh-keys/${encodeURIComponent(keyId)}`, 'DELETE');
      } catch (err) {
        notifyLiveDispatchError('Delete SSH key', err);
        throw err;
      }
      return;
    }
    setSshKeys((prev) => prev.filter((k) => k.id !== keyId));
    appendActivity('account:ssh-key.delete', `Removed SSH key ${keyId}.`, 'warning');
  };

  const handleUpdateProfile = async (input: {
    username: string;
    email: string;
    avatarUrl?: string | null;
  }) => {
    if (mode === 'live') {
      try {
        await dispatchClientAccountAction('email', 'PUT', { email: input.email });
      } catch (err) {
        notifyLiveDispatchError('Update account profile', err);
        throw err;
      }
      return;
    }
    const patch = {
      username: input.username,
      email: input.email,
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl ?? undefined } : {}),
    };
    if (isAdminRole) {
      setAdminProfile((prev) => ({ ...prev, ...patch }));
    } else {
      setMemberProfile((prev) => ({ ...prev, ...patch }));
    }
    appendActivity('account:profile.update', `Updated Petalnodes profile (${input.username}).`);
  };

  const handleUpdatePassword = async (input: {
    currentPassword: string;
    newPassword: string;
  }) => {
    if (mode === 'live') {
      try {
        await dispatchClientAccountAction('password', 'PUT', {
          current_password: input.currentPassword,
          new_password: input.newPassword,
        });
      } catch (err) {
        notifyLiveDispatchError('Update password', err);
        throw err;
      }
      return;
    }
    appendActivity('account:security.password', 'Updated Petalnodes account password.');
  };

  const handleToggleTwoFactor = async (enabled: boolean, code?: string) => {
    if (mode === 'live') {
      try {
        if (enabled) {
          await dispatchClientAccountAction('two-factor', 'POST', { code });
        } else {
          await dispatchClientAccountAction('two-factor', 'DELETE', {});
        }
      } catch (err) {
        notifyLiveDispatchError('Update two-factor authentication', err);
        throw err;
      }
      return;
    }
    setTwoFactorEnabled(enabled);
    appendActivity(
      enabled ? 'account:security.2fa.enable' : 'account:security.2fa.disable',
      `${enabled ? 'Enabled' : 'Disabled'} TOTP two-factor authentication.`,
      enabled ? 'completed' : 'warning',
    );
  };

  const handleUpdatePreferences = (next: PetalnodesUiPreferences) => {
    setUiPreferences(next);
    try {
      window.localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors in restricted environments.
    }
  };

  const handleToggleFavorite = (serverId: string) => {
    setFavoriteServerIds((prev) => {
      const exists = prev.includes(serverId);
      const next = exists ? prev.filter((id) => id !== serverId) : [...prev, serverId];
      saveFavoriteServerIds(next);
      return next;
    });
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (mode === 'live') {
      await dispatchClientAccountAction(`sessions/${encodeURIComponent(sessionId)}`, 'DELETE');
      return;
    }
    setUserSessions((prev) => prev.filter((s) => s.id !== sessionId));
    appendActivity('account:session.revoke', `Revoked active session ${sessionId}.`, 'warning');
  };

  const handleSignOutAllSessions = async () => {
    if (mode === 'live') {
      await dispatchClientAccountAction('sessions', 'DELETE');
      return;
    }
    setUserSessions((prev) => prev.filter((s) => s.isCurrent));
    appendActivity('account:session.revoke-all', 'Terminated all secondary active sessions.', 'warning');
  };

  const handleSaveAdminSettings = async (next: CalagopusAdminSettings) => {
    if (mode === 'live') {
      await dispatchAdminAction('settings', 'PATCH', next);
      return;
    }
    setAdminSettings(next);
    appendActivity('admin:settings.update', `Saved panel settings for ${next.panelName}.`);
  };

  const handleCreateAdminUser = async (input: {
    username: string;
    email: string;
    roleName: string;
  }) => {
    if (mode === 'live') {
      await dispatchAdminAction('users', 'POST', input);
      return;
    }
    const created: CalagopusAdminUser = {
      id: `usr-${Date.now()}`,
      username: input.username.trim(),
      email: input.email.trim(),
      roleName: input.roleName,
      isAdmin: input.roleName === 'Root Administrator',
      twoFactorEnabled: false,
      serversCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      lastLoginAt: 'Never',
    };
    setAdminUsers((prev) => [created, ...prev]);
    appendActivity('admin:user.create', `Created user account ${created.username} (${created.roleName}).`);
  };

  const handleCreateAdminServer = async (input: {
    name: string;
    egg: CalagopusEggEntry;
    nodeName: string;
    allocation: string;
    memoryLimitMb: number;
    diskLimitMb: number;
  }) => {
    if (mode === 'live') {
      await dispatchAdminAction('servers', 'POST', {
        name: input.name,
        egg_id: input.egg.id,
        node: input.nodeName,
        allocation: input.allocation,
        memory_limit_mb: input.memoryLimitMb,
        disk_limit_mb: input.diskLimitMb,
      });
      return;
    }
    const slugBase = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 10) || 'srv';
    const uuidShort = `${slugBase}-${Math.floor(10 + Math.random() * 89)}`;
    const summary: CalagopusServerSummary = {
      id: `srv-${uuidShort}`,
      uuidShort,
      name: input.name.trim(),
      node: input.nodeName,
      allocation: input.allocation,
      eggName: input.egg.name,
      state: 'running',
      cpuPercent: 4.2,
      memoryUsedMb: 512,
      memoryLimitMb: input.memoryLimitMb,
      diskUsedMb: 1024,
      diskLimitMb: input.diskLimitMb,
    };
    setCreatedServers((prev) => [summary, ...prev]);
    setServerDetailsMap((prev) => ({
      ...prev,
      [uuidShort]: {
        ...SANDBOX_SERVER_DETAILS['alpha-01'],
        ...summary,
        description: `${input.egg.name} provisioned on ${input.nodeName}.`,
        uptimeSeconds: 120,
        networkRxBytesPerSec: 128000,
        networkTxBytesPerSec: 94000,
        sftpHost: `sftp.${input.nodeName}.petalnodes.cloud`,
        sftpUsername: `${user.username.split('.')[0]}.${uuidShort}`,
      },
    }));
    setAdminAllocations((prev) =>
      prev.map((a) =>
        `${a.ip}:${a.port}` === input.allocation
          ? { ...a, assignedServerId: uuidShort, assignedServerName: summary.name }
          : a,
      ),
    );
    appendActivity('admin:server.create', `Provisioned server ${summary.name} (${uuidShort}).`);
  };

  const handleToggleNodeMaintenance = (nodeId: string) => {
    setAdminNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? { ...node, status: node.status === 'online' ? 'maintenance' : 'online' }
          : node,
      ),
    );
    appendActivity('admin:node.maintenance', `Toggled maintenance mode for node ${nodeId}.`, 'warning');
  };

  const handleBulkServerPowerAction = (serverIds: string[], action: ServerPowerAction) => {
    for (const id of serverIds) {
      handleServerPowerAction(action, id);
    }
  };

  const handleToggleServerSuspend = (serverId: string) => {
    const summary = allFixtureServers.find((s) => s.uuidShort === serverId);
    const currentState = serverDetailsMap[serverId]?.state ?? summary?.state ?? 'offline';
    const nextState = currentState === 'suspended' ? 'offline' : 'suspended';
    setServerDetailsMap((prev) => {
      const existing =
        prev[serverId] ??
        (summary
          ? {
              ...SANDBOX_SERVER_DETAILS['alpha-01'],
              ...summary,
              description: `${summary.eggName} container running on ${summary.node}.`,
              sftpHost: `sftp.${summary.node}.petalnodes.cloud`,
              sftpUsername: `${user.username.split('.')[0]}.${summary.uuidShort}`,
            }
          : activeServerDetail);
      return {
        ...prev,
        [serverId]: {
          ...existing,
          state: nextState,
          cpuPercent: 0,
          uptimeSeconds: 0,
        },
      };
    });
    appendActivity(
      nextState === 'suspended' ? 'admin:server.suspend' : 'admin:server.unsuspend',
      `${nextState === 'suspended' ? 'Suspended' : 'Unsuspended'} container ${serverId}.`,
      nextState === 'suspended' ? 'warning' : 'completed',
    );
    showToast({
      title: nextState === 'suspended' ? 'Server suspended' : 'Server unsuspended',
      message: `${summary?.name ?? serverId} is now ${nextState}.`,
      tone: nextState === 'suspended' ? 'warning' : 'success',
    });
  };

  const handleMinecraftSaveFile = async (filePath: string, nextContent: string) => {
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const existing = serverFiles.find((f) => f.path === normalizedPath);
    if (existing) {
      await handleSaveFileContent(existing.id, nextContent);
      return;
    }
    if (mode === 'live') {
      await saveServerFileContentApi(activeServerDetail.uuidShort, normalizedPath, nextContent);
      return;
    }
    const lastSlash = normalizedPath.lastIndexOf('/');
    const directory = lastSlash <= 0 ? '/' : normalizedPath.slice(0, lastSlash);
    const name = normalizedPath.slice(lastSlash + 1);
    const newEntry: CalagopusFileEntry = {
      id: `file-mc-${Date.now()}`,
      path: normalizedPath,
      directory,
      name,
      isDirectory: false,
      sizeBytes: new Blob([nextContent]).size,
      modifiedAt: 'Just now',
      modifiedEpoch: Math.floor(Date.now() / 1000),
      permissions: '-rw-r--r--',
      mimeType: name.endsWith('.json') ? 'application/json' : 'text/plain',
      content: nextContent,
    };
    setServerFiles((prev) => [...prev, newEntry]);
    appendActivity('server:file.write', `Created & saved ${normalizedPath} on ${activeServerDetail.name}.`);
  };

  if (scope === 'auth') {
    return (
      <AuthShell
        title={`Sign in to ${PETALNODES_BRAND}`}
        subtitle="Authenticate to manage your Petalnodes servers, files, and console."
        footer={
          <button
            type="button"
            onClick={() => setCurrentPath('/')}
            className="blush-focus-ring rounded px-2 py-1 font-medium text-[var(--calagopus-primary-text)] hover:underline cursor-pointer"
          >
            Return to dashboard
          </button>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!authEmail.trim() || !authPassword.trim()) {
              setAuthError('Enter both your username/email and password to sign in.');
              return;
            }
            setAuthError(null);
            setAuthPassword('');
            setCurrentPath('/');
          }}
        >
          <TextInput
            label="Username or Email"
            required
            value={authEmail}
            onChange={(e) => {
              setAuthEmail(e.currentTarget.value);
              setAuthError(null);
            }}
          />
          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            required
            value={authPassword}
            error={authError ?? undefined}
            onChange={(e) => {
              setAuthPassword(e.currentTarget.value);
              setAuthError(null);
            }}
          />
          <Button type="submit" variant="primary" className="w-full">
            Sign In
          </Button>
        </form>
      </AuthShell>
    );
  }

  const serverDatabases = databases.filter((d) => d.serverId === activeServerDetail.uuidShort);
  const serverBackups = backups.filter((b) => b.serverId === activeServerDetail.uuidShort);
  const serverSchedules = schedules.filter((s) => s.serverId === activeServerDetail.uuidShort);
  const serverSubusers = subusers.filter((u) => u.serverId === activeServerDetail.uuidShort);

  const serverUptimeMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const [key, detail] of Object.entries(serverDetailsMap)) {
      map[key] = detail.uptimeSeconds;
    }
    return map;
  }, [serverDetailsMap]);

  const shellServers = resolvedClientData?.servers ?? [];
  const shellActiveServerData =
    shellServers.find((s) => s.uuidShort === activeServerDetail.uuidShort) ?? shellServers[0];
  const shellNotifications = React.useMemo(
    () =>
      buildPanelNotifications(
        shellServers,
        resolvedClientData?.activity ?? [],
        errorMessage,
      ),
    [shellServers, resolvedClientData?.activity, errorMessage],
  );

  const handleMarkNotificationRead = React.useCallback((id: string) => {
    setReadNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleMarkAllNotificationsRead = React.useCallback(() => {
    setReadNotificationIds(shellNotifications.map((n) => n.id));
  }, [shellNotifications]);

  const favoriteServers = React.useMemo(
    () => allFixtureServers.filter((srv) => favoriteServerIds.includes(srv.uuidShort)),
    [allFixtureServers, favoriteServerIds],
  );
  const recentServers = React.useMemo(
    () =>
      recentServerIds
        .map((id) => allFixtureServers.find((srv) => srv.uuidShort === id))
        .filter((srv): srv is CalagopusServerSummary => Boolean(srv)),
    [allFixtureServers, recentServerIds],
  );

  const renderMainContent = () => {
    if (currentPath === '/') {
      return (
        <ClientDashboardPage
          user={user}
          data={resolvedClientData}
          loading={isLoading}
          error={errorMessage}
          onRetry={() => (mode === 'live' ? void loadLiveApi() : setMode('fixture'))}
          onNavigate={setCurrentPath}
          onServerPowerAction={(serverId, action) => handleServerPowerAction(action, serverId)}
          favoriteServerIds={favoriteServerIds}
          recentServerIds={recentServerIds}
          onToggleFavorite={handleToggleFavorite}
          customBanners={customBanners}
          onSaveCustomBanner={handleSaveCustomBanner}
          serverUptimeMap={serverUptimeMap}
          dataSourceLabel={dataSourceLabel}
          twoFactorEnabled={twoFactorEnabled}
          compact={uiPreferences.compactTableRows}
          confirmDestructive={uiPreferences.confirmDestructiveActions}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />
      );
    }

    if (currentPath === '/notifications') {
      return (
        <NotificationsPage
          notifications={shellNotifications}
          readIds={readNotificationIds}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onNavigate={setCurrentPath}
        />
      );
    }

    if (currentPath === '/admin') {
      return (
        <AdminDashboardPage
          user={user}
          data={resolvedAdminData}
          loading={isLoading}
          error={errorMessage}
          onRetry={() => (mode === 'live' ? void loadLiveApi() : setMode('fixture'))}
          onNavigate={setCurrentPath}
          dataSourceLabel={dataSourceLabel}
          compact={uiPreferences.compactTableRows}
        />
      );
    }

    if (currentPath === '/admin/extensions') {
      return (
        <AdminExtensionsPage
          user={user}
          extensions={mode === 'empty' ? [] : adminExtensions}
          onToggleExtension={handleToggleAdminExtension}
          onInstallExtension={handleInstallAdminExtension}
          onRemoveExtension={handleRemoveAdminExtension}
          onSaveExtensionConfig={handleSaveExtensionConfig}
          onNavigate={setCurrentPath}
          isLiveMode={mode === 'live'}
          confirmDestructive={uiPreferences.confirmDestructiveActions}
        />
      );
    }

    if (currentPath === '/admin/diagnostics') {
      return (
        <AdminDiagnosticsPage
          user={user}
          nodes={mode === 'empty' ? [] : adminNodes}
          servers={mode === 'empty' ? [] : allFixtureServers}
          extensions={mode === 'empty' ? [] : adminExtensions}
          consoleLogs={consoleLogs}
          isLiveMode={mode === 'live'}
          onNavigate={setCurrentPath}
        />
      );
    }

    if (currentPath.startsWith('/admin/')) {
      return (
        <AdminResourcesPage
          currentPath={currentPath}
          user={user}
          adminData={resolvedAdminData}
          nodes={mode === 'empty' ? [] : adminNodes}
          allocations={mode === 'empty' ? [] : adminAllocations}
          extensions={mode === 'empty' ? [] : adminExtensions}
          servers={mode === 'empty' ? [] : allFixtureServers}
          backups={mode === 'empty' ? [] : backups}
          users={mode === 'empty' ? [] : adminUsers}
          roles={SANDBOX_ADMIN_ROLES}
          settings={adminSettings}
          auditLogs={mode === 'empty' ? [] : SANDBOX_ADMIN_FIXTURE.auditLogs}
          onSaveSettings={handleSaveAdminSettings}
          onCreateUser={handleCreateAdminUser}
          onCreateServer={handleCreateAdminServer}
          onToggleNodeMaintenance={handleToggleNodeMaintenance}
          onBulkServerPowerAction={handleBulkServerPowerAction}
          onToggleServerSuspend={handleToggleServerSuspend}
          onNavigate={setCurrentPath}
          isLiveMode={mode === 'live'}
          compact={uiPreferences.compactTableRows}
        />
      );
    }

    if (currentPath === '/account') {
      return (
        <AccountProfilePage
          user={user}
          preferences={uiPreferences}
          favoriteServers={favoriteServers}
          recentServers={recentServers}
          onUpdateProfile={handleUpdateProfile}
          onUpdatePreferences={handleUpdatePreferences}
          onNavigate={setCurrentPath}
        />
      );
    }

    if (currentPath === '/account/security') {
      return (
        <AccountSecurityPage
          twoFactorEnabled={twoFactorEnabled}
          totpSetupKey={mode === 'fixture' ? 'PREVIEW-ONLY-2FA-SETUP-KEY' : undefined}
          sessions={userSessions}
          securityActivity={activityEntries}
          onRevokeSession={handleRevokeSession}
          onSignOutAll={handleSignOutAllSessions}
          onUpdatePassword={handleUpdatePassword}
          onToggleTwoFactor={handleToggleTwoFactor}
        />
      );
    }

    if (currentPath === '/account/api-keys') {
      return (
        <AccountApiKeysPage
          apiKeys={apiKeys}
          onCreateKey={handleCreateApiKey}
          onRevokeKey={handleRevokeApiKey}
          compact={uiPreferences.compactTableRows}
          confirmDestructive={uiPreferences.confirmDestructiveActions}
        />
      );
    }

    if (currentPath === '/account/ssh-keys') {
      return (
        <AccountSshKeysPage
          sshKeys={sshKeys}
          onAddSshKey={handleAddSshKey}
          onDeleteSshKey={handleDeleteSshKey}
          compact={uiPreferences.compactTableRows}
          confirmDestructive={uiPreferences.confirmDestructiveActions}
        />
      );
    }

    if (currentPath === '/account/activity') {
      return (
        <ActivityLogPage
          title="Account Activity"
          description="Authentication events, API key changes, and actions triggered under your account."
          entries={activityEntries}
          compact={uiPreferences.compactTableRows}
        />
      );
    }

    if (parsedServer) {
      switch (parsedServer.subRoute) {
        case 'overview':
          return (
            <ServerOverviewPage
              server={activeServerDetail}
              onPowerAction={handleServerPowerAction}
              onNavigate={setCurrentPath}
              consoleLogs={consoleLogs}
              confirmDestructive={uiPreferences.confirmDestructiveActions}
            />
          );
        case 'console':
        case 'terminal':
          return (
            <ServerConsolePage
              server={activeServerDetail}
              logs={consoleLogs}
              onSendCommand={handleSendConsoleCommand}
              onClearLogs={() => setConsoleLogs([])}
              onPowerAction={handleServerPowerAction}
              onReconnect={async () => {
                if (mode === 'live') {
                  await loadLiveApi();
                }
              }}
              permissions={user.permissions}
              isAdmin={user.isAdmin}
              defaultAutoScroll={uiPreferences.consoleAutoScrollDefault}
              confirmDestructive={uiPreferences.confirmDestructiveActions}
            />
          );
        case 'minecraft':
          return (
            <ServerMinecraftPage
              server={activeServerDetail}
              files={serverFiles}
              consoleLogs={consoleLogs}
              onSaveFile={handleMinecraftSaveFile}
              onCreateFile={handleCreateFileEntry}
              onRenameFile={(entry, nextName) => handleRenameFileEntry(entry.id, nextName)}
              onSendCommand={handleSendConsoleCommand}
              onNavigate={setCurrentPath}
            />
          );
        case 'files':
          return (
            <ServerFilesPage
              server={activeServerDetail}
              files={serverFiles}
              onCreateEntry={handleCreateFileEntry}
              onSaveFileContent={handleSaveFileContent}
              onRenameEntry={handleRenameFileEntry}
              onMoveEntries={handleMoveFileEntries}
              onUpdatePermissions={handleUpdatePermissions}
              onDeleteEntries={handleDeleteFileEntries}
              onUploadFiles={handleUploadFiles}
              onDownloadFile={handleDownloadFile}
              permissions={user.permissions}
              isAdmin={user.isAdmin}
              compact={uiPreferences.compactTableRows}
              confirmDestructive={uiPreferences.confirmDestructiveActions}
            />
          );
        case 'databases':
          return (
            <ServerDatabasesPage
              server={activeServerDetail}
              databases={serverDatabases}
              onCreateDatabase={handleCreateDatabase}
              onRotatePassword={handleRotateDatabasePassword}
              onDeleteDatabase={handleDeleteDatabase}
              compact={uiPreferences.compactTableRows}
              confirmDestructive={uiPreferences.confirmDestructiveActions}
            />
          );
        case 'backups':
          return (
            <ServerBackupsPage
              server={activeServerDetail}
              backups={serverBackups}
              onCreateBackup={handleCreateBackup}
              onToggleLock={handleToggleBackupLock}
              onRestoreBackup={handleRestoreBackup}
              onDeleteBackup={handleDeleteBackup}
              onDownloadBackup={handleDownloadBackup}
              permissions={user.permissions}
              isAdmin={user.isAdmin}
              compact={uiPreferences.compactTableRows}
              confirmDestructive={uiPreferences.confirmDestructiveActions}
            />
          );
        case 'schedules':
          return (
            <ServerSchedulesPage
              server={activeServerDetail}
              schedules={serverSchedules}
              onCreateSchedule={handleCreateSchedule}
              onToggleScheduleActive={handleToggleScheduleActive}
              onRunScheduleNow={handleRunScheduleNow}
              onDeleteSchedule={handleDeleteSchedule}
              confirmDestructive={uiPreferences.confirmDestructiveActions}
            />
          );
        case 'network':
          return (
            <ServerNetworkPage
              server={activeServerDetail}
              allocations={activeServerAllocations}
              onSetPrimary={handleSetPrimaryAllocation}
              onUpdateNotes={handleUpdateAllocationNotes}
              onAllocatePort={handleAllocatePort}
              onRemoveAllocation={handleRemoveAllocation}
              compact={uiPreferences.compactTableRows}
              confirmDestructive={uiPreferences.confirmDestructiveActions}
            />
          );
        case 'startup':
          return (
            <ServerStartupPage
              server={activeServerDetail}
              startup={activeStartupConfig}
              onUpdateDockerImage={handleUpdateDockerImage}
              onUpdateVariable={handleUpdateStartupVariable}
            />
          );
        case 'users':
          return (
            <ServerUsersPage
              server={activeServerDetail}
              subusers={serverSubusers}
              onInviteSubuser={handleInviteSubuser}
              onUpdateSubuserPermissions={handleUpdateSubuserPermissions}
              onRemoveSubuser={handleRemoveSubuser}
              compact={uiPreferences.compactTableRows}
              confirmDestructive={uiPreferences.confirmDestructiveActions}
            />
          );
        case 'settings':
          return (
            <ServerSettingsPage
              server={activeServerDetail}
              onRenameServer={handleRenameServer}
              onReinstallServer={handleReinstallServer}
            />
          );
        case 'activity':
          return (
            <ActivityLogPage
              title="Server Activity"
              description={`Recent power signals, file edits, backups, and access events for ${activeServerDetail.name}.`}
              entries={activityEntries}
              compact={uiPreferences.compactTableRows}
            />
          );
        default:
          break;
      }
    }

    return (
      <div className="space-y-6">
        <PageHeader
          title="Page Not Found"
          description={`No Calagopus module is registered for route "${currentPath}".`}
          actions={
            <Button variant="primary" size="sm" onClick={() => setCurrentPath('/')}>
              Return to Servers
            </Button>
          }
        />
        <ErrorState
          title="Route not found"
          description={`The path "${currentPath}" does not match any active Petalnodes / Calagopus view.`}
          retryLabel="Open Workspace"
          onRetry={() => setCurrentPath('/')}
        />
      </div>
    );
  };

  return (
    <AppShell
      currentPath={currentPath}
      serverLabel={shellActiveServerData?.name ?? 'No Server'}
      user={user}
      onNavigate={setCurrentPath}
      onSignOut={() => {
        setCurrentPath('/auth/login');
        showToast({ title: 'Signed out', tone: 'info' });
      }}
      activeServer={
        shellActiveServerData
          ? {
              uuidShort: shellActiveServerData.uuidShort,
              name: shellActiveServerData.name,
              state: shellActiveServerData.state,
              uptimeSeconds: serverDetailsMap[shellActiveServerData.uuidShort]?.uptimeSeconds ?? 0,
            }
          : undefined
      }
      serversList={shellServers.map((s) => ({
        uuidShort: s.uuidShort,
        name: s.name,
        node: s.node,
      }))}
      nodesList={mode === 'empty' ? [] : adminNodes}
      extensionsList={mode === 'empty' ? [] : adminExtensions}
      onServerPowerAction={(action) => handleServerPowerAction(action)}
      notifications={shellNotifications}
      readNotificationIds={readNotificationIds}
      onMarkNotificationRead={handleMarkNotificationRead}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      headerRightSlot={
        <DropdownMenu
          label="Dashboard Verification"
          trigger={
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Verification mode: ${dataSourceLabel}`}
              leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            >
              <span className="hidden xl:inline">{dataSourceLabel}</span>
            </Button>
          }
          items={[
            {
              id: 'mode-fixture',
              label: 'Preview Fixture Data',
              onSelect: () => setMode('fixture'),
            },
            {
              id: 'mode-live',
              label: 'Fetch Live Panel API',
              onSelect: () => setMode('live'),
            },
            {
              id: 'mode-loading',
              label: 'Inspect Loading State',
              onSelect: () => setMode('loading'),
            },
            {
              id: 'mode-empty',
              label: 'Inspect Empty State',
              onSelect: () => setMode('empty'),
            },
            {
              id: 'mode-error',
              label: 'Inspect Error State',
              onSelect: () => setMode('error'),
            },
            {
              id: 'toggle-role',
              label: isAdminRole ? 'Switch to Member Role' : 'Switch to Admin Role',
              onSelect: () => {
                setIsAdminRole((prev) => !prev);
                if (isAdminRole && currentPath.startsWith('/admin')) {
                  setCurrentPath('/');
                }
              },
            },
          ]}
        />
      }
    >
      {renderMainContent()}
      <ModalDialog
        opened={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="Keyboard Shortcuts"
        description="Navigate Petalnodes panels and consoles faster from anywhere."
        size="md"
        footer={
          <Button variant="primary" size="sm" onClick={() => setShortcutsOpen(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-2.5 text-sm">
          {[
            { keys: 'Ctrl / Cmd + K', desc: 'Open Global Search & Quick Actions Palette' },
            { keys: '?', desc: 'Show this Keyboard Shortcuts overlay' },
            { keys: 'Escape', desc: 'Close open dialogs, drawers, or command palette' },
            { keys: 'Up / Down Arrow', desc: 'Cycle previous commands inside Server Console' },
            { keys: 'Enter', desc: 'Execute console command or activate selected route' },
          ].map((item) => (
            <div
              key={item.keys}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-subtle)] px-3 py-2"
            >
              <span className="text-[var(--calagopus-text-secondary)]">{item.desc}</span>
              <kbd className="shrink-0 rounded-md border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--calagopus-text)]">
                {item.keys}
              </kbd>
            </div>
          ))}
        </div>
      </ModalDialog>
    </AppShell>
  );
}

export default function App() {
  return (
    <MantineProvider theme={blushMantineTheme} cssVariablesResolver={blushCssVariablesResolver}>
      <Notifications position="top-right" zIndex={1000} />
      <DashboardVerificationHost />
    </MantineProvider>
  );
}
