import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import getUserActivity from '@/api/me/getUserActivity.ts';
import getServers from '@/api/server/getServers.ts';
import createDirectory from '@/api/server/files/createDirectory.ts';
import getFileContent from '@/api/server/files/getFileContent.ts';
import loadDirectory from '@/api/server/files/loadDirectory.ts';
import renameFiles from '@/api/server/files/renameFiles.ts';
import saveFileContent from '@/api/server/files/saveFileContent.ts';
import AccountContentContainer from '@/elements/containers/AccountContentContainer.tsx';
import ServerContentContainer from '@/elements/containers/ServerContentContainer.tsx';
import Alert from '@/elements/feedback/Alert.tsx';
import Spinner from '@/elements/feedback/Spinner.tsx';
import { serverDirectoryEntrySchema } from '@/lib/schemas/server/files.ts';
import useWebsocketEvent, { SocketEvent, SocketRequest } from '@/plugins/websocket/useWebsocketEvent.ts';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { useGlobalStore } from '@/stores/global.ts';
import { useServerStore } from '@/stores/server.ts';
import type {
  CalagopusConsoleLine,
  CalagopusFileEntry,
  CalagopusServerDetail,
} from '../api/calagopusCore';
import type { CalagopusActivityEntry, CalagopusServerSummary } from '../api/calagopusDashboard';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ServerMinecraftPage } from '../pages/ServerMinecraftPage';
import { buildPanelNotifications, type PanelNotificationItem } from '../utils/panelEnhancements';

type DirectoryEntry = z.infer<typeof serverDirectoryEntrySchema>;

const NOTIF_READ_STORAGE_KEY = 'petalnodes.notifications.readIds';
const MINECRAFT_CONFIG_FILES = [
  '/server.properties',
  '/eula.txt',
  '/whitelist.json',
  '/ops.json',
  '/logs/latest.log',
];

function joinServerPath(directory: string, name: string): string {
  return directory === '/' ? `/${name}` : `${directory.replace(/\/+$/, '')}/${name}`;
}

function splitParentDir(fullPath: string): { directory: string; name: string } {
  const normalized = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
  const lastSlash = normalized.lastIndexOf('/');
  const directory = lastSlash <= 0 ? '/' : normalized.slice(0, lastSlash);
  const name = normalized.slice(lastSlash + 1);
  return { directory, name };
}

function mapDirectoryEntry(directory: string, entry: DirectoryEntry): CalagopusFileEntry {
  const fullPath = joinServerPath(directory, entry.name);
  const modifiedDate = entry.modified ? new Date(entry.modified) : new Date();
  return {
    id: `${directory}:${entry.name}`,
    name: entry.name,
    path: fullPath,
    directory,
    isDirectory: entry.directory,
    sizeBytes: entry.size,
    modifiedAt: entry.modified ? modifiedDate.toLocaleString() : '',
    modifiedEpoch: Math.floor(modifiedDate.getTime() / 1000),
    permissions: entry.mode,
    mimeType: entry.mime || (entry.directory ? 'inode/directory' : 'text/plain'),
  };
}

export function ConnectedMinecraftRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const server = useServerStore((state) => state.server);
  const powerState = useServerStore((state) => state.state);
  const stats = useServerStore((state) => state.stats);
  const socketInstance = useServerStore((state) => state.socketInstance);

  const [files, setFiles] = useState<CalagopusFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<CalagopusConsoleLine[]>([]);

  useWebsocketEvent(SocketEvent.CONSOLE_OUTPUT, (line: string) => {
    const level: CalagopusConsoleLine['level'] = /\b(ERROR|FATAL|SEVERE)\b/i.test(line)
      ? 'ERROR'
      : /\bWARN(?:ING)?\b/i.test(line)
        ? 'WARN'
        : 'INFO';
    setConsoleLogs((prev) => [
      ...prev.slice(-199),
      {
        id: `ws-${Date.now()}-${prev.length}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        source: 'Wings',
        message: line,
      },
    ]);
  });

  const refreshFiles = useCallback(async () => {
    if (!server?.uuid) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rootRes = await loadDirectory(server.uuid, '/', 1, 'name_asc');
      const rootMapped = rootRes.entries.data.map((entry) => mapDirectoryEntry('/', entry));

      const subDirsToScan = ['/plugins', '/mods', '/logs'].filter((dir) =>
        rootMapped.some((e) => e.isDirectory && e.path === dir),
      );

      const subResults = await Promise.all(
        subDirsToScan.map(async (dir) => {
          try {
            const res = await loadDirectory(server.uuid, dir, 1, 'name_asc');
            return res.entries.data.map((entry) => mapDirectoryEntry(dir, entry));
          } catch {
            return [];
          }
        }),
      );

      const combined = [...rootMapped, ...subResults.flat()];
      const pathSet = new Set(combined.map((f) => f.path));

      const contentEntries = await Promise.all(
        MINECRAFT_CONFIG_FILES.filter((filePath) => pathSet.has(filePath)).map(async (filePath) => {
          try {
            const blob = await getFileContent(server.uuid, filePath);
            return [filePath, await blob.text()] as const;
          } catch {
            return null;
          }
        }),
      );

      const contentMap = new Map<string, string>();
      for (const item of contentEntries) {
        if (item) contentMap.set(item[0], item[1]);
      }

      setFiles(
        combined.map((entry) =>
          contentMap.has(entry.path) ? { ...entry, content: contentMap.get(entry.path) } : entry,
        ),
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load server files from Wings.');
    } finally {
      setLoading(false);
    }
  }, [server?.uuid]);

  useEffect(() => {
    void refreshFiles();
  }, [refreshFiles]);

  const mappedServer: CalagopusServerDetail = useMemo(() => {
    const primaryAlloc = server.allocation;
    const allocLabel = primaryAlloc
      ? `${primaryAlloc.ipAlias || primaryAlloc.ip}:${primaryAlloc.port}`
      : 'Unassigned';
    return {
      id: server.uuid,
      uuidShort: server.uuidShort,
      name: server.name,
      node: server.nodeName,
      allocation: allocLabel,
      eggName: server.egg?.name ?? 'Minecraft',
      state: server.isSuspended ? 'suspended' : powerState,
      cpuPercent: stats?.cpuAbsolute ?? 0,
      memoryUsedMb: Math.round((stats?.memoryBytes ?? 0) / (1024 * 1024)),
      memoryLimitMb: server.limits?.memory ?? 0,
      diskUsedMb: Math.round((stats?.diskBytes ?? 0) / (1024 * 1024)),
      diskLimitMb: server.limits?.disk ?? 0,
      uptimeSeconds: Math.round((stats?.uptime ?? 0) / 1000),
      description: server.description ?? '',
      netInBytesSec: stats?.network?.rxBytes ?? 0,
      netOutBytesSec: stats?.network?.txBytes ?? 0,
      latencyMs: 0,
      sftpHost: server.sftpHost,
      sftpPort: server.sftpPort,
      sftpUsername: `${user?.username ?? 'user'}.${server.uuidShort}`,
      javaOrRuntime: server.image,
      telemetryHistory: [],
    };
  }, [server, powerState, stats, user?.username]);

  const handleSaveFile = useCallback(
    async (filePath: string, content: string) => {
      await saveFileContent(server.uuid, filePath, content);
      const { directory, name } = splitParentDir(filePath);
      const now = new Date();
      setFiles((prev) => {
        const exists = prev.some((f) => f.path === filePath);
        if (exists) {
          return prev.map((f) =>
            f.path === filePath
              ? {
                  ...f,
                  content,
                  sizeBytes: content.length,
                  modifiedAt: now.toLocaleString(),
                  modifiedEpoch: Math.floor(now.getTime() / 1000),
                }
              : f,
          );
        }
        return [
          ...prev,
          {
            id: `${directory}:${name}`,
            name,
            path: filePath,
            directory,
            isDirectory: false,
            sizeBytes: content.length,
            modifiedAt: now.toLocaleString(),
            modifiedEpoch: Math.floor(now.getTime() / 1000),
            permissions: '-rw-r--r--',
            mimeType: 'text/plain',
            content,
          },
        ];
      });
    },
    [server.uuid],
  );

  const handleCreateFile = useCallback(
    async (directory: string, name: string, isDirectory: boolean) => {
      if (isDirectory) {
        await createDirectory(server.uuid, directory, name);
      } else {
        await saveFileContent(server.uuid, joinServerPath(directory, name), '');
      }
      await refreshFiles();
    },
    [server.uuid, refreshFiles],
  );

  const handleRenameFile = useCallback(
    async (entry: CalagopusFileEntry, nextName: string) => {
      await renameFiles({
        uuid: server.uuid,
        root: entry.directory,
        files: [{ from: entry.name, to: nextName }],
      });
      await refreshFiles();
    },
    [server.uuid, refreshFiles],
  );

  const handleSendCommand = useCallback(
    async (command: string) => {
      socketInstance?.send(SocketRequest.SEND_COMMAND, command);
    },
    [socketInstance],
  );

  return (
    <ServerContentContainer title='Minecraft & Server Tools' hideTitleComponent>
      {loadError ? (
        <Alert color='red' mb='md'>
          {loadError}
        </Alert>
      ) : null}
      {loading && files.length === 0 ? (
        <Spinner.Centered />
      ) : (
        <ServerMinecraftPage
          server={mappedServer}
          files={files}
          consoleLogs={consoleLogs}
          onSaveFile={handleSaveFile}
          onCreateFile={handleCreateFile}
          onRenameFile={handleRenameFile}
          onSendCommand={handleSendCommand}
          onNavigate={(path) => navigate(path)}
        />
      )}
    </ServerContentContainer>
  );
}

export function ConnectedNotificationsRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const announcements = useGlobalStore((state) => state.announcements);

  const [servers, setServers] = useState<CalagopusServerSummary[]>([]);
  const [activity, setActivity] = useState<CalagopusActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(NOTIF_READ_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getServers(1), getUserActivity(1, undefined, 15)])
      .then(([srvRes, actRes]) => {
        if (cancelled) return;
        const mappedServers: CalagopusServerSummary[] = srvRes.data.map((srv) => ({
          id: srv.uuid,
          uuidShort: srv.uuidShort,
          name: srv.name,
          node: srv.nodeName,
          allocation: srv.allocation
            ? `${srv.allocation.ipAlias || srv.allocation.ip}:${srv.allocation.port}`
            : 'Unassigned',
          eggName: srv.egg?.name ?? 'Container',
          state: srv.isSuspended ? 'suspended' : srv.status === 'installing' ? 'starting' : 'running',
          cpuPercent: 0,
          memoryUsedMb: 0,
          memoryLimitMb: srv.limits?.memory ?? 0,
          diskUsedMb: 0,
          diskLimitMb: srv.limits?.disk ?? 0,
        }));
        const mappedActivity: CalagopusActivityEntry[] = actRes.data.map((entry, idx) => ({
          id: `${entry.event}-${idx}`,
          event: entry.event,
          description: entry.event.replace(/[:._]/g, ' '),
          actor: user?.username ?? 'Account',
          ipAddress: entry.ip ?? '—',
          timestamp: entry.created ? new Date(entry.created).toLocaleString() : '',
          status: 'completed',
        }));
        setServers(mappedServers);
        setActivity(mappedActivity);
        setErrorMessage(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load notifications feed.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  const notifications: PanelNotificationItem[] = useMemo(() => {
    const announcementItems: PanelNotificationItem[] = announcements.map((ann) => ({
      id: `ann-${ann.uuid}`,
      title: ann.title,
      description: ann.content,
      timestamp: 'Announcement',
      severity:
        ann.type === 'error'
          ? 'danger'
          : ann.type === 'warning'
            ? 'warning'
            : ann.type === 'success'
              ? 'success'
              : 'info',
    }));
    return [...announcementItems, ...buildPanelNotifications(servers, activity, errorMessage)];
  }, [announcements, servers, activity, errorMessage]);

  const persistReadIds = useCallback((next: string[]) => {
    setReadIds(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NOTIF_READ_STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const handleMarkRead = useCallback(
    (id: string) => {
      if (readIds.includes(id)) return;
      persistReadIds([...readIds, id]);
    },
    [readIds, persistReadIds],
  );

  const handleMarkAllRead = useCallback(() => {
    persistReadIds(Array.from(new Set([...readIds, ...notifications.map((n) => n.id)])));
  }, [readIds, notifications, persistReadIds]);

  return (
    <AccountContentContainer title='Notification Center' hideTitleComponent>
      {loading ? (
        <Spinner.Centered />
      ) : (
        <NotificationsPage
          notifications={notifications}
          readIds={readIds}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onNavigate={(path) => navigate(path)}
        />
      )}
    </AccountContentContainer>
  );
}
