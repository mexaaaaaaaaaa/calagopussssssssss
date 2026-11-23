import React from 'react';
import { ArrowUpRight, Moon, Search, Sun } from 'lucide-react';
import { ModalDialog } from '../components/Overlays';
import { SearchField } from '../components/FormControls';
import {
  ADMIN_NAV_GROUPS,
  CLIENT_NAV_GROUPS,
  filterNavGroupsByPermissions,
  hasPermission,
  SERVER_NAV_GROUPS,
  type CalagopusUserContext,
} from '../navigation/calagopusRoutes';
import type { CalagopusAdminExtension, CalagopusAdminNode } from '../api/calagopusModules';
import type { CalagopusEggEntry } from '../utils/eggCatalog';
import type { PetalnodesThemeMode } from '../utils/themeMode';
import { NavIcon } from './NavIcon';

export interface QuickActionTarget {
  id: string;
  label: string;
  scopeLabel: string;
  path?: string;
  icon?: Parameters<typeof NavIcon>[0]['name'];
  customIcon?: React.ReactNode;
  onExecute?: () => void;
}

export interface QuickActionsModalProps {
  opened: boolean;
  onClose: () => void;
  user: CalagopusUserContext;
  activeServerId: string;
  servers: readonly { uuidShort: string; name: string; node: string }[];
  nodes?: readonly CalagopusAdminNode[];
  eggs?: readonly CalagopusEggEntry[];
  extensions?: readonly CalagopusAdminExtension[];
  onNavigate: (path: string) => void;
  themeMode?: PetalnodesThemeMode;
  onToggleThemeMode?: () => void;
}

export function QuickActionsModal({
  opened,
  onClose,
  user,
  activeServerId,
  servers,
  nodes = [],
  eggs = [],
  extensions = [],
  onNavigate,
  themeMode = 'light',
  onToggleThemeMode,
}: QuickActionsModalProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    if (!opened) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [opened]);

  const actions = React.useMemo<QuickActionTarget[]>(() => {
    const items: QuickActionTarget[] = [];

    if (onToggleThemeMode) {
      items.push({
        id: 'pref-toggle-theme',
        label: themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        scopeLabel: 'Appearance · Theme Switcher',
        customIcon:
          themeMode === 'dark' ? (
            <Sun className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0" />
          ) : (
            <Moon className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0" />
          ),
        onExecute: onToggleThemeMode,
      });
    }

    for (const srv of servers) {
      items.push({
        id: `srv-goto-${srv.uuidShort}`,
        label: `Open ${srv.name} Console`,
        scopeLabel: `Server · ${srv.uuidShort} · ${srv.node}`,
        path: `/server/${srv.uuidShort}`,
        icon: 'terminal',
      });
      items.push({
        id: `srv-ovw-${srv.uuidShort}`,
        label: `Inspect ${srv.name} Overview`,
        scopeLabel: `Server · ${srv.uuidShort}`,
        path: `/server/${srv.uuidShort}/overview`,
        icon: 'layout',
      });
    }

    const clientGroups = filterNavGroupsByPermissions(CLIENT_NAV_GROUPS, user);
    for (const group of clientGroups) {
      for (const item of group.items) {
        items.push({
          id: `client-${item.id}`,
          label: item.label,
          scopeLabel: `Workspace · ${group.label}`,
          path: item.path,
          icon: item.icon,
        });
      }
    }

    const targetServerId =
      activeServerId && servers.some((s) => s.uuidShort === activeServerId)
        ? activeServerId
        : servers[0]?.uuidShort;

    if (targetServerId) {
      const serverGroups = filterNavGroupsByPermissions(SERVER_NAV_GROUPS, user);
      for (const group of serverGroups) {
        for (const item of group.items) {
          items.push({
            id: `server-${item.id}`,
            label: `${item.label} (${targetServerId})`,
            scopeLabel: `Server · ${group.label}`,
            path: item.path.replace('/server/alpha-01', `/server/${targetServerId}`),
            icon: item.icon,
          });
        }
      }
    }

    const canAdmin = user.isAdmin || user.permissions.some((p) => p.startsWith('admin.'));
    if (canAdmin) {
      const adminGroups = filterNavGroupsByPermissions(ADMIN_NAV_GROUPS, user);
      for (const group of adminGroups) {
        for (const item of group.items) {
          items.push({
            id: `admin-${item.id}`,
            label: item.label,
            scopeLabel: `Admin · ${group.label}`,
            path: item.path,
            icon: item.icon,
          });
        }
      }

      if (hasPermission(user, 'admin.nodes.read')) {
        for (const n of nodes) {
          items.push({
            id: `node-${n.id}`,
            label: `Node: ${n.name}`,
            scopeLabel: `Infrastructure · ${n.location} · ${n.fqdn}`,
            path: '/admin/nodes',
            icon: 'cpu',
          });
        }
      }

      if (hasPermission(user, 'admin.nests.read')) {
        for (const egg of eggs) {
          items.push({
            id: `egg-${egg.id}`,
            label: `Egg: ${egg.name}`,
            scopeLabel: `Egg Library · ${egg.category} · ${egg.repository}`,
            path: '/admin/nests',
            icon: 'layers',
          });
        }
      }

      if (hasPermission(user, 'admin.extensions.read')) {
        for (const ext of extensions) {
          items.push({
            id: `ext-${ext.identifier}`,
            label: `Extension: ${ext.name}`,
            scopeLabel: `Extensions · ${ext.identifier} · v${ext.version}`,
            path: '/admin/extensions',
            icon: 'puzzle',
          });
        }
      }
    }

    return items;
  }, [servers, nodes, eggs, extensions, user, activeServerId, themeMode, onToggleThemeMode]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions.slice(0, 14);
    return actions
      .filter(
        (a) =>
          a.label.toLowerCase().includes(q) ||
          a.scopeLabel.toLowerCase().includes(q) ||
          (a.path ?? '').toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [actions, query]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const runAction = (action: QuickActionTarget) => {
    if (action.onExecute) {
      action.onExecute();
    } else if (action.path) {
      onNavigate(action.path);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filtered[selectedIndex] ?? filtered[0];
      if (chosen) runAction(chosen);
    }
  };

  return (
    <ModalDialog
      opened={opened}
      onClose={onClose}
      title="Global Search & Command Palette"
      description="Permission-aware search across servers, nodes, Eggs, extensions, and settings (Ctrl+K)."
      size="md"
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        <SearchField
          aria-label="Search command palette"
          placeholder="Search servers, nodes, Eggs, extensions, settings..."
          value={query}
          onChange={setQuery}
        />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-4 py-8 text-center">
            <Search className="h-5 w-5 text-[var(--calagopus-text-secondary)] mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-[var(--calagopus-text)]">No matching entities or commands</p>
            <p className="mt-0.5 text-[12px] text-[var(--calagopus-text-secondary)]">
              Try searching for Console, Paper, PostgreSQL, Nodes, Extensions, or Notifications.
            </p>
          </div>
        ) : (
          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
            {filtered.map((action, idx) => {
              const highlighted = idx === selectedIndex;
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => runAction(action)}
                    className={`blush-transition blush-focus-ring flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left cursor-pointer ${
                      highlighted
                        ? 'border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-subtle)]'
                        : 'border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {action.customIcon ?? (
                        <NavIcon
                          name={action.icon ?? 'layout'}
                          className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0"
                        />
                      )}
                      <span className="block min-w-0">
                        <span className="block text-[13px] font-medium text-[var(--calagopus-text)] truncate">
                          {action.label}
                        </span>
                        <span className="block text-[11px] text-[var(--calagopus-text-secondary)] truncate">
                          {action.scopeLabel}
                        </span>
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--calagopus-text-secondary)] shrink-0" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModalDialog>
  );
}
