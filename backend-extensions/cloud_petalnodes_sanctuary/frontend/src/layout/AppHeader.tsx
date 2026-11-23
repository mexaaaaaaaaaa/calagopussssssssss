import React from 'react';
import {
  Activity,
  Bell,
  CheckCheck,
  CreditCard,
  Globe,
  Menu,
  MessageCircle,
  Moon,
  PanelLeftOpen,
  Search,
  Sun,
} from 'lucide-react';
import { Popover } from '@mantine/core';
import { IconButton } from '../components/Button';
import { PWAInstallButton } from '../components/PWAControls';
import { PetalnodesLogo } from '../components/PetalnodesLogo';
import type { CalagopusScope, CalagopusUserContext } from '../navigation/calagopusRoutes';
import {
  PETALNODES_BRAND,
  PETALNODES_LINKS,
  type ExternalQuickLink,
} from '../navigation/petalnodesBrand';
import type { PanelNotificationItem } from '../utils/panelEnhancements';
import type { PetalnodesThemeMode } from '../utils/themeMode';
import { AccountMenu } from './AccountMenu';

export interface AppHeaderProps {
  brandName?: string;
  scope: CalagopusScope;
  currentPath: string;
  user: CalagopusUserContext;
  sidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileMenu: () => void;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  headerRightSlot?: React.ReactNode;
  themeMode?: PetalnodesThemeMode;
  onToggleThemeMode?: () => void;
  onOpenQuickActions?: () => void;
  notifications?: readonly PanelNotificationItem[];
  readNotificationIds?: readonly string[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
}

const SCOPE_LABELS: Record<CalagopusScope, string> = {
  client: 'Workspace',
  server: 'Server Console',
  admin: 'Administration',
  auth: 'Authentication',
};

function getHeaderContextLabel(scope: CalagopusScope, currentPath: string): string {
  if (scope === 'server') {
    const sub = currentPath.split('/').filter(Boolean)[2];
    if (sub === 'files') return 'Server Files';
    if (sub === 'overview') return 'Server Overview';
    if (sub === 'databases') return 'Server Databases';
    if (sub === 'schedules') return 'Server Schedules';
    if (sub === 'users') return 'Server Subusers';
    if (sub === 'backups') return 'Server Backups';
    if (sub === 'minecraft') return 'Minecraft Tools';
    if (sub === 'network') return 'Server Network';
    if (sub === 'startup') return 'Server Startup';
    if (sub === 'settings') return 'Server Settings';
    if (sub === 'activity') return 'Server Activity';
    return 'Server Console';
  }
  if (currentPath === '/account') return 'Account Profile';
  if (currentPath === '/account/security') return 'Account Security';
  if (currentPath === '/account/api-keys') return 'Client API Keys';
  if (currentPath === '/account/ssh-keys') return 'Account SSH Keys';
  if (currentPath === '/account/activity') return 'Account Activity';
  if (currentPath === '/notifications' || currentPath === '/account/notifications') {
    return 'Notifications';
  }
  if (currentPath === '/admin/extensions') return 'Admin · Extensions';
  if (currentPath === '/admin/nodes') return 'Admin · Nodes';
  if (currentPath === '/admin/locations') return 'Admin · Locations';
  if (currentPath === '/admin/servers') return 'Admin · Servers';
  if (currentPath === '/admin/audit-logs') return 'Admin · Audit Logs';
  return SCOPE_LABELS[scope];
}

function QuickLinkIcon({ id }: { id: ExternalQuickLink['id'] }) {
  if (id === 'billing') {
    return <CreditCard className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />;
  }
  if (id === 'discord') {
    return <MessageCircle className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />;
  }
  if (id === 'website') {
    return <Globe className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />;
  }
  return <Activity className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />;
}

export function AppHeader({
  brandName = PETALNODES_BRAND,
  scope,
  currentPath,
  user,
  sidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileMenu,
  onNavigate,
  onSignOut,
  headerRightSlot,
  themeMode = 'light',
  onToggleThemeMode,
  onOpenQuickActions,
  notifications = [],
  readNotificationIds,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}: AppHeaderProps) {
  const contextLabel = getHeaderContextLabel(scope, currentPath);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [localReadIds, setLocalReadIds] = React.useState<string[]>([]);
  const readIds = readNotificationIds ?? localReadIds;

  const unreadCount = React.useMemo(
    () => notifications.filter((item) => !readIds.includes(item.id)).length,
    [notifications, readIds],
  );

  const markRead = (id: string) => {
    if (onMarkNotificationRead) {
      onMarkNotificationRead(id);
    } else {
      setLocalReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  const markAllRead = () => {
    if (onMarkAllNotificationsRead) {
      onMarkAllNotificationsRead();
    } else {
      setLocalReadIds(notifications.map((n) => n.id));
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--calagopus-border)] bg-[var(--calagopus-surface)]">
      <div className="flex h-16 items-center justify-between gap-1.5 px-2.5 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2.5">
          <div className="lg:hidden">
            <IconButton
              aria-label="Open navigation menu"
              variant="secondary"
              size="sm"
              icon={<Menu className="h-4 w-4" />}
              onClick={onOpenMobileMenu}
            />
          </div>

          {sidebarCollapsed ? (
            <div className="hidden lg:block">
              <IconButton
                aria-label="Expand sidebar"
                variant="ghost"
                size="sm"
                icon={
                  <PanelLeftOpen className="h-4 w-4 text-[var(--calagopus-text-secondary)]" />
                }
                onClick={onToggleSidebarCollapse}
              />
            </div>
          ) : null}

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="blush-focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg px-0.5 py-1 sm:gap-2.5 sm:px-1"
          >
            <PetalnodesLogo size="md" />
            <span className="font-display text-[14px] sm:text-[15px] font-semibold tracking-tight text-[var(--calagopus-text)] whitespace-nowrap">
              {brandName}
            </span>
          </a>

          <span className="hidden xl:inline-block text-[var(--calagopus-border-strong)]" aria-hidden="true">
            /
          </span>
          <span className="hidden xl:inline-block text-[13px] font-medium text-[var(--calagopus-text-secondary)] whitespace-nowrap truncate">
            {contextLabel}
          </span>
        </div>

        <nav
          aria-label="Petalnodes quick links"
          className="hidden lg:flex items-center gap-1.5 shrink-0"
        >
          {PETALNODES_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.description}
              className="blush-transition blush-focus-ring inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--calagopus-text)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-primary-text)] whitespace-nowrap shrink-0"
            >
              <QuickLinkIcon id={link.id} />
              <span>{link.shortLabel}</span>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {onOpenQuickActions ? (
            <button
              type="button"
              onClick={onOpenQuickActions}
              aria-label="Open quick command palette"
              className="blush-transition blush-focus-ring hidden md:inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2.5 text-[12px] text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden xl:inline">Search</span>
              <kbd className="rounded border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl+K
              </kbd>
            </button>
          ) : null}

          <Popover
            opened={notifOpen}
            onChange={setNotifOpen}
            position="bottom-end"
            width={340}
            shadow="md"
          >
            <Popover.Target>
              <button
                type="button"
                aria-label={`Notifications (${unreadCount} unread)`}
                onClick={() => setNotifOpen((o) => !o)}
                className="blush-transition blush-focus-ring relative inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--calagopus-primary)] px-1 font-mono text-[10px] font-bold text-[#29232A]"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>
            </Popover.Target>
            <Popover.Dropdown className="p-0 overflow-hidden bg-[var(--calagopus-surface)] border border-[var(--calagopus-border)] text-[var(--calagopus-text)]">
              <div className="flex items-center justify-between border-b border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3.5 py-2.5">
                <div>
                  <p className="text-[13px] font-semibold text-[var(--calagopus-text)]">
                    Notifications
                  </p>
                  <p className="text-[11px] text-[var(--calagopus-text-secondary)]">
                    Real container telemetry &amp; recent audit events
                  </p>
                </div>
                {notifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="blush-focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--calagopus-primary-text)] hover:bg-[var(--calagopus-primary-soft)] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Mark read</span>
                  </button>
                ) : null}
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-[var(--calagopus-text-secondary)]">
                  No recent alerts or activity events.
                </div>
              ) : (
                <ul className="max-h-72 divide-y divide-[var(--calagopus-border)] overflow-y-auto">
                  {notifications.map((item) => {
                    const isRead = readIds.includes(item.id);
                    const dotColor =
                      item.severity === 'danger'
                        ? 'bg-[var(--calagopus-danger)]'
                        : item.severity === 'warning'
                          ? 'bg-[var(--calagopus-warning)]'
                          : item.severity === 'success'
                            ? 'bg-[var(--calagopus-success)]'
                            : 'bg-[var(--calagopus-primary)]';

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            markRead(item.id);
                            if (item.targetPath) {
                              onNavigate(item.targetPath);
                              setNotifOpen(false);
                            }
                          }}
                          className={`blush-transition flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-[var(--calagopus-primary-subtle)] cursor-pointer ${
                            isRead ? 'opacity-70' : ''
                          }`}
                        >
                          <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-medium text-[var(--calagopus-text)]">
                              {item.title}
                            </span>
                            <span className="block truncate text-[11px] text-[var(--calagopus-text-secondary)]">
                              {item.description}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] text-[var(--calagopus-text-secondary)]">
                              {item.timestamp}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="border-t border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3.5 py-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/notifications');
                    setNotifOpen(false);
                  }}
                  className="blush-focus-ring text-[12px] font-medium text-[var(--calagopus-primary-text)] hover:underline cursor-pointer"
                >
                  Open Notification Center
                </button>
              </div>
            </Popover.Dropdown>
          </Popover>

          <PWAInstallButton />

          {onToggleThemeMode ? (
            <button
              type="button"
              onClick={onToggleThemeMode}
              aria-label={
                themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
              }
              title={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="blush-transition blush-focus-ring inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-primary-text)] cursor-pointer"
            >
              {themeMode === 'dark' ? (
                <Sun className="h-4 w-4 text-[var(--calagopus-primary)]" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          ) : null}

          {headerRightSlot}

          <AccountMenu
            user={user}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
            themeMode={themeMode}
            onToggleThemeMode={onToggleThemeMode}
          />
        </div>
      </div>
    </header>
  );
}
