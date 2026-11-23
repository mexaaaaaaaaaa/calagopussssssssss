import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);
    setIsInstalled(Boolean(isStandalone));

    const userAgent =
      typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export type DashboardWidgetId =
  | 'stats'
  | 'favorites'
  | 'servers'
  | 'quick-actions'
  | 'sanctuary'
  | 'activity';

export interface DashboardWidgetPreference {
  id: DashboardWidgetId;
  label: string;
  visible: boolean;
}

export const DEFAULT_DASHBOARD_WIDGETS: readonly DashboardWidgetPreference[] = [
  { id: 'stats', label: 'Infrastructure KPIs', visible: true },
  { id: 'favorites', label: 'Favorites & Recent Servers', visible: true },
  { id: 'servers', label: 'Server Inventory', visible: true },
  { id: 'quick-actions', label: 'Identity & Quick Shortcuts', visible: true },
  { id: 'sanctuary', label: 'Petalnodes Sanctuary 3D', visible: true },
  { id: 'activity', label: 'Recent Activity', visible: true },
];

const WIDGETS_KEY = 'petalnodes.dashboard.widgets.v1';
const FAVORITES_KEY = 'petalnodes.servers.favorites.v1';
const RECENT_KEY = 'petalnodes.servers.recent.v1';

export function loadDashboardWidgets(
  storage?: Pick<Storage, 'getItem'> | null,
): DashboardWidgetPreference[] {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const raw = store?.getItem(WIDGETS_KEY);
    if (!raw) return [...DEFAULT_DASHBOARD_WIDGETS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_DASHBOARD_WIDGETS];
    const knownMap = new Map(DEFAULT_DASHBOARD_WIDGETS.map((w) => [w.id, w]));
    const result: DashboardWidgetPreference[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        'id' in item &&
        typeof item.id === 'string' &&
        knownMap.has(item.id as DashboardWidgetId)
      ) {
        const base = knownMap.get(item.id as DashboardWidgetId)!;
        result.push({
          id: base.id,
          label: base.label,
          visible: typeof (item as { visible?: unknown }).visible === 'boolean'
            ? (item as { visible: boolean }).visible
            : base.visible,
        });
        knownMap.delete(base.id);
      }
    }
    for (const remaining of knownMap.values()) {
      result.push(remaining);
    }
    return result;
  } catch {
    return [...DEFAULT_DASHBOARD_WIDGETS];
  }
}

export function saveDashboardWidgets(
  widgets: readonly DashboardWidgetPreference[],
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.setItem(WIDGETS_KEY, JSON.stringify(widgets));
  } catch {
    // Ignore restricted storage errors
  }
}

export function loadStringListPreference(
  key: string,
  storage?: Pick<Storage, 'getItem'> | null,
): string[] {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const raw = store?.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

export function saveStringListPreference(
  key: string,
  items: readonly string[],
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage write errors
  }
}

export function loadFavoriteServerIds(storage?: Pick<Storage, 'getItem'> | null): string[] {
  return loadStringListPreference(FAVORITES_KEY, storage);
}

export function saveFavoriteServerIds(
  ids: readonly string[],
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  saveStringListPreference(FAVORITES_KEY, ids, storage);
}

export function loadRecentServerIds(storage?: Pick<Storage, 'getItem'> | null): string[] {
  return loadStringListPreference(RECENT_KEY, storage);
}

export function pushRecentServerId(
  current: readonly string[],
  serverId: string,
  limit = 5,
): string[] {
  return [serverId, ...current.filter((id) => id !== serverId)].slice(0, limit);
}

export function saveRecentServerIds(
  ids: readonly string[],
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  saveStringListPreference(RECENT_KEY, ids, storage);
}
