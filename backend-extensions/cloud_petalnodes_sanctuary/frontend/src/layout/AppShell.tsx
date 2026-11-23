import React from 'react';
import type { ServerPowerAction } from '../api/calagopusCore';
import { AmbientPetalBackground } from '../components/AmbientPetalBackground';
import { Breadcrumbs } from '../components/Navigation';
import { OfflineIndicator } from '../components/PWAControls';
import { ContentContainer } from '../components/Surface';
import {
  buildBreadcrumbsForPath,
  inferScopeFromPath,
  type CalagopusUserContext,
} from '../navigation/calagopusRoutes';
import { PETALNODES_BRAND } from '../navigation/petalnodesBrand';
import type { CalagopusAdminExtension, CalagopusAdminNode } from '../api/calagopusModules';
import type { CalagopusEggEntry } from '../utils/eggCatalog';
import type { PanelNotificationItem } from '../utils/panelEnhancements';
import {
  applyThemeModeToDocument,
  persistThemeMode,
  resolveInitialThemeMode,
  type PetalnodesThemeMode,
} from '../utils/themeMode';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { AppSidebar, type SidebarServerContext } from './AppSidebar';
import { QuickActionsModal } from './QuickActionsModal';

export interface AppShellProps {
  brandName?: string;
  currentPath: string;
  serverLabel?: string;
  user: CalagopusUserContext;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  headerRightSlot?: React.ReactNode;
  showBreadcrumbs?: boolean;
  activeServer?: SidebarServerContext;
  serversList?: readonly { uuidShort: string; name: string; node: string }[];
  nodesList?: readonly CalagopusAdminNode[];
  eggsList?: readonly CalagopusEggEntry[];
  extensionsList?: readonly CalagopusAdminExtension[];
  onServerPowerAction?: (action: ServerPowerAction) => void;
  themeMode?: PetalnodesThemeMode;
  onToggleThemeMode?: () => void;
  notifications?: readonly PanelNotificationItem[];
  readNotificationIds?: readonly string[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'calagopus.blush.sidebarCollapsed';

export function AppShell({
  brandName = PETALNODES_BRAND,
  currentPath,
  serverLabel = 'alpha-01',
  user,
  onNavigate,
  onSignOut,
  headerRightSlot,
  showBreadcrumbs = true,
  activeServer,
  serversList = [],
  nodesList = [],
  eggsList = [],
  extensionsList = [],
  onServerPowerAction,
  themeMode: controlledThemeMode,
  onToggleThemeMode: controlledToggleThemeMode,
  notifications = [],
  readNotificationIds,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  children,
}: AppShellProps) {
  const scope = inferScopeFromPath(currentPath);

  const [internalThemeMode, setInternalThemeMode] = React.useState<PetalnodesThemeMode>(() =>
    resolveInitialThemeMode(),
  );
  const themeMode = controlledThemeMode ?? internalThemeMode;

  React.useEffect(() => {
    applyThemeModeToDocument(themeMode);
  }, [themeMode]);

  const handleToggleThemeMode = React.useCallback(() => {
    if (controlledToggleThemeMode) {
      controlledToggleThemeMode();
      return;
    }
    setInternalThemeMode((prev) => {
      const next: PetalnodesThemeMode = prev === 'dark' ? 'light' : 'dark';
      persistThemeMode(next);
      return next;
    });
  }, [controlledToggleThemeMode]);

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [mobileOpened, setMobileOpened] = React.useState(false);
  const [quickActionsOpened, setQuickActionsOpened] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setQuickActionsOpened((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors in restricted environments
      }
      return next;
    });
  };

  const breadcrumbs = React.useMemo(
    () => buildBreadcrumbsForPath(currentPath, activeServer?.name ?? serverLabel),
    [currentPath, activeServer?.name, serverLabel],
  );

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--calagopus-bg)] text-[var(--calagopus-text)]">
      <AmbientPetalBackground />

      <a
        href="#calagopus-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--calagopus-surface)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--calagopus-text)] focus:shadow-md focus:outline-2 focus:outline-[var(--calagopus-primary)]"
      >
        Skip to main content
      </a>

      <div className="relative z-30">
        <AppHeader
          brandName={brandName}
          scope={scope}
          currentPath={currentPath}
          user={user}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          onOpenMobileMenu={() => setMobileOpened(true)}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          headerRightSlot={headerRightSlot}
          themeMode={themeMode}
          onToggleThemeMode={handleToggleThemeMode}
          onOpenQuickActions={() => setQuickActionsOpened(true)}
          notifications={notifications}
          readNotificationIds={readNotificationIds}
          onMarkNotificationRead={onMarkNotificationRead}
          onMarkAllNotificationsRead={onMarkAllNotificationsRead}
        />
      </div>

      <div className="relative z-10 flex flex-1 min-h-0">
        <AppSidebar
          brandName={brandName}
          scope={scope}
          currentPath={currentPath}
          user={user}
          collapsed={sidebarCollapsed}
          mobileOpened={mobileOpened}
          onCloseMobile={() => setMobileOpened(false)}
          onNavigate={onNavigate}
          onToggleCollapse={toggleSidebarCollapse}
          onSignOut={onSignOut}
          themeMode={themeMode}
          onToggleThemeMode={handleToggleThemeMode}
          activeServer={activeServer}
          serversList={serversList}
          onServerPowerAction={onServerPowerAction}
          onOpenQuickActions={() => setQuickActionsOpened(true)}
        />

        <main
          id="calagopus-main-content"
          className="min-w-0 flex-1 py-6 sm:py-8"
        >
          <ContentContainer className="space-y-6">
            {showBreadcrumbs && breadcrumbs.length > 0 ? (
              <Breadcrumbs
                items={breadcrumbs.map((node) => ({
                  label: node.label,
                  href: node.path,
                  onClick: node.path ? () => onNavigate(node.path!) : undefined,
                }))}
              />
            ) : null}
            {children}
          </ContentContainer>
        </main>
      </div>

      <AppFooter brandName={brandName} onNavigate={onNavigate} themeMode={themeMode} />

      <OfflineIndicator />

      <QuickActionsModal
        opened={quickActionsOpened}
        onClose={() => setQuickActionsOpened(false)}
        user={user}
        activeServerId={activeServer?.uuidShort ?? 'alpha-01'}
        servers={serversList}
        nodes={nodesList}
        eggs={eggsList}
        extensions={extensionsList}
        onNavigate={onNavigate}
        themeMode={themeMode}
        onToggleThemeMode={handleToggleThemeMode}
      />
    </div>
  );
}
