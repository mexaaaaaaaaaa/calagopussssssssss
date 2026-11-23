export type CalagopusScope = 'client' | 'server' | 'admin' | 'auth';

export type NavIconName =
  | 'server'
  | 'terminal'
  | 'folder'
  | 'database'
  | 'clock'
  | 'users'
  | 'archive'
  | 'network'
  | 'sliders'
  | 'settings'
  | 'activity'
  | 'user'
  | 'shield'
  | 'key'
  | 'terminal-key'
  | 'layout'
  | 'globe'
  | 'cpu'
  | 'layers'
  | 'puzzle'
  | 'file-text'
  | 'gamepad'
  | 'wrench';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: NavIconName;
  exact?: boolean;
  requiredPermission?: string;
  badge?: string;
  children?: readonly NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items: readonly NavItem[];
}

export interface CalagopusUserContext {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  permissions: readonly string[];
  avatarUrl?: string | null;
  twoFactorEnabled?: boolean;
}

export const CLIENT_NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { id: 'servers', label: 'Servers', path: '/', icon: 'server', exact: true },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: 'account-overview', label: 'Profile', path: '/account', icon: 'user', exact: true },
      { id: 'account-security', label: 'Security', path: '/account/security', icon: 'shield' },
      { id: 'account-api-keys', label: 'API Keys', path: '/account/api-keys', icon: 'key' },
      { id: 'account-ssh-keys', label: 'SSH Keys', path: '/account/ssh-keys', icon: 'terminal-key' },
      { id: 'account-activity', label: 'Activity', path: '/account/activity', icon: 'activity' },
      { id: 'account-notifications', label: 'Notifications', path: '/notifications', icon: 'layout' },
    ],
  },
];

export const SERVER_NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'server-control',
    label: 'Server Management',
    items: [
      {
        id: 'server-overview',
        label: 'Overview',
        path: '/server/alpha-01/overview',
        icon: 'layout',
        requiredPermission: 'control.console',
      },
      {
        id: 'server-console',
        label: 'Console',
        path: '/server/alpha-01',
        icon: 'terminal',
        exact: true,
        requiredPermission: 'control.console',
      },
      {
        id: 'server-files',
        label: 'Files',
        path: '/server/alpha-01/files',
        icon: 'folder',
        requiredPermission: 'file.read',
      },
      {
        id: 'server-databases',
        label: 'Databases',
        path: '/server/alpha-01/databases',
        icon: 'database',
        requiredPermission: 'database.read',
      },
      {
        id: 'server-schedules',
        label: 'Schedules',
        path: '/server/alpha-01/schedules',
        icon: 'clock',
        requiredPermission: 'schedule.read',
      },
      {
        id: 'server-users',
        label: 'Subusers',
        path: '/server/alpha-01/users',
        icon: 'users',
        requiredPermission: 'user.read',
      },
      {
        id: 'server-backups',
        label: 'Backups',
        path: '/server/alpha-01/backups',
        icon: 'archive',
        requiredPermission: 'backup.read',
      },
    ],
  },
  {
    id: 'server-configuration',
    label: 'Configuration',
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        id: 'server-minecraft',
        label: 'Minecraft Tools',
        path: '/server/alpha-01/minecraft',
        icon: 'gamepad',
        requiredPermission: 'file.read',
        children: [
          {
            id: 'server-mc-properties',
            label: 'Properties & MOTD',
            path: '/server/alpha-01/minecraft',
            icon: 'sliders',
            exact: true,
            requiredPermission: 'file.read',
          },
          {
            id: 'server-mc-startup',
            label: 'Versions & Flags',
            path: '/server/alpha-01/startup',
            icon: 'layers',
            requiredPermission: 'startup.read',
          },
        ],
      },
      {
        id: 'server-network',
        label: 'Network',
        path: '/server/alpha-01/network',
        icon: 'network',
        requiredPermission: 'allocation.read',
      },
      {
        id: 'server-startup',
        label: 'Startup',
        path: '/server/alpha-01/startup',
        icon: 'sliders',
        requiredPermission: 'startup.read',
      },
      {
        id: 'server-settings',
        label: 'Settings',
        path: '/server/alpha-01/settings',
        icon: 'settings',
        requiredPermission: 'settings.rename',
      },
      {
        id: 'server-activity',
        label: 'Activity',
        path: '/server/alpha-01/activity',
        icon: 'activity',
        requiredPermission: 'activity.read',
      },
    ],
  },
];

export const ADMIN_NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'admin-overview',
    label: 'Administration',
    items: [
      {
        id: 'admin-home',
        label: 'Overview',
        path: '/admin',
        icon: 'layout',
        exact: true,
        requiredPermission: 'admin.overview',
      },
      {
        id: 'admin-analytics',
        label: 'Analytics',
        path: '/admin/analytics',
        icon: 'activity',
        requiredPermission: 'admin.overview',
      },
      {
        id: 'admin-settings',
        label: 'Settings',
        path: '/admin/settings',
        icon: 'settings',
        requiredPermission: 'admin.settings.read',
      },
      {
        id: 'admin-extensions',
        label: 'Extensions',
        path: '/admin/extensions',
        icon: 'puzzle',
        requiredPermission: 'admin.extensions.read',
      },
    ],
  },
  {
    id: 'admin-infrastructure',
    label: 'Infrastructure',
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        id: 'admin-locations',
        label: 'Locations',
        path: '/admin/locations',
        icon: 'globe',
        requiredPermission: 'admin.locations.read',
      },
      {
        id: 'admin-nodes',
        label: 'Nodes',
        path: '/admin/nodes',
        icon: 'cpu',
        requiredPermission: 'admin.nodes.read',
      },
      {
        id: 'admin-allocations',
        label: 'Allocations',
        path: '/admin/allocations',
        icon: 'network',
        requiredPermission: 'admin.nodes.read',
      },
      {
        id: 'admin-nests',
        label: 'Egg Library',
        path: '/admin/nests',
        icon: 'layers',
        requiredPermission: 'admin.nests.read',
      },
      {
        id: 'admin-servers',
        label: 'Servers',
        path: '/admin/servers',
        icon: 'server',
        requiredPermission: 'admin.servers.read',
      },
      {
        id: 'admin-backups',
        label: 'Backups',
        path: '/admin/backups',
        icon: 'archive',
        requiredPermission: 'admin.servers.read',
      },
    ],
  },
  {
    id: 'admin-access',
    label: 'Access & Audit',
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        id: 'admin-users',
        label: 'Users',
        path: '/admin/users',
        icon: 'users',
        requiredPermission: 'admin.users.read',
      },
      {
        id: 'admin-roles',
        label: 'Roles',
        path: '/admin/roles',
        icon: 'shield',
        requiredPermission: 'admin.roles.read',
      },
      {
        id: 'admin-audit',
        label: 'Audit Logs',
        path: '/admin/audit-logs',
        icon: 'file-text',
        requiredPermission: 'admin.activity.read',
      },
      {
        id: 'admin-diagnostics',
        label: 'Diagnostics',
        path: '/admin/diagnostics',
        icon: 'wrench',
        requiredPermission: 'admin.overview',
      },
    ],
  },
];

export function hasPermission(
  user: Pick<CalagopusUserContext, 'isAdmin' | 'permissions'>,
  requiredPermission?: string,
): boolean {
  if (!requiredPermission) {
    return true;
  }
  if (user.isAdmin || user.permissions.includes('*')) {
    return true;
  }
  if (user.permissions.includes(requiredPermission)) {
    return true;
  }
  const [namespace] = requiredPermission.split('.');
  if (namespace && user.permissions.includes(`${namespace}.*`)) {
    return true;
  }
  return false;
}

export function filterNavGroupsByPermissions(
  groups: readonly NavGroup[],
  user: Pick<CalagopusUserContext, 'isAdmin' | 'permissions'>,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => hasPermission(user, item.requiredPermission))
        .map((item) =>
          item.children
            ? {
                ...item,
                children: item.children.filter((child) =>
                  hasPermission(user, child.requiredPermission),
                ),
              }
            : item,
        ),
    }))
    .filter((group) => group.items.length > 0);
}

export function getNavGroupsForScope(
  scope: CalagopusScope,
  user: Pick<CalagopusUserContext, 'isAdmin' | 'permissions'>,
  serverId = 'alpha-01',
): NavGroup[] {
  if (scope === 'auth') return [];
  if (scope === 'admin') return filterNavGroupsByPermissions(ADMIN_NAV_GROUPS, user);
  if (scope === 'server') {
    const groups = filterNavGroupsByPermissions(SERVER_NAV_GROUPS, user);
    if (serverId === 'alpha-01') return groups;
    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        path: item.path.replace('/server/alpha-01', `/server/${serverId}`),
        children: item.children?.map((child) => ({
          ...child,
          path: child.path.replace('/server/alpha-01', `/server/${serverId}`),
        })),
      })),
    }));
  }
  return filterNavGroupsByPermissions(CLIENT_NAV_GROUPS, user);
}

export function inferScopeFromPath(path: string): CalagopusScope {
  if (path.startsWith('/auth')) return 'auth';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/server/')) return 'server';
  return 'client';
}

export function isRouteActive(currentPath: string, targetPath: string, exact = false): boolean {
  if (exact || targetPath === '/') {
    return currentPath === targetPath;
  }
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export interface BreadcrumbNode {
  label: string;
  path?: string;
}

const ROUTE_LABEL_MAP: Record<string, string> = {
  '/': 'Servers',
  '/account': 'Profile',
  '/account/security': 'Security',
  '/account/api-keys': 'API Keys',
  '/account/ssh-keys': 'SSH Keys',
  '/account/activity': 'Activity',
  '/notifications': 'Notifications',
  '/admin': 'Overview',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'Settings',
  '/admin/extensions': 'Extensions',
  '/admin/locations': 'Locations',
  '/admin/nodes': 'Nodes',
  '/admin/allocations': 'Allocations',
  '/admin/nests': 'Egg Library',
  '/admin/servers': 'Servers',
  '/admin/backups': 'Backups',
  '/admin/users': 'Users',
  '/admin/roles': 'Roles',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/diagnostics': 'Diagnostics',
};

export function buildBreadcrumbsForPath(
  path: string,
  serverLabel = 'Server',
): BreadcrumbNode[] {
  if (path === '/') {
    return [{ label: 'Workspace', path: '/' }, { label: 'Servers' }];
  }

  if (path.startsWith('/account')) {
    const label = ROUTE_LABEL_MAP[path] ?? 'Account';
    if (path === '/account') {
      return [{ label: 'Workspace', path: '/' }, { label: 'Account' }];
    }
    return [
      { label: 'Workspace', path: '/' },
      { label: 'Account', path: '/account' },
      { label },
    ];
  }

  if (path.startsWith('/admin')) {
    const label = ROUTE_LABEL_MAP[path] ?? 'Admin';
    if (path === '/admin') {
      return [{ label: 'Workspace', path: '/' }, { label: 'Admin' }];
    }
    return [
      { label: 'Workspace', path: '/' },
      { label: 'Admin', path: '/admin' },
      { label },
    ];
  }

  if (path.startsWith('/server/')) {
    const segments = path.split('/').filter(Boolean);
    const serverId = segments[1] ?? 'server';
    const subRoute = segments[2];
    const baseServerPath = `/server/${serverId}`;

    if (!subRoute) {
      return [
        { label: 'Servers', path: '/' },
        { label: serverLabel },
        { label: 'Console' },
      ];
    }

    const subLabel =
      subRoute === 'minecraft'
        ? 'Minecraft Tools'
        : subRoute.charAt(0).toUpperCase() + subRoute.slice(1).replace(/-/g, ' ');
    return [
      { label: 'Servers', path: '/' },
      { label: serverLabel, path: baseServerPath },
      { label: subLabel },
    ];
  }

  return [{ label: 'Workspace', path: '/' }];
}
