import React from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { useGSAP } from '@gsap/react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Globe,
  LogOut,
  MessageCircle,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCw,
  Search,
  Server,
  ShieldCheck,
  Square,
  Sun,
  User,
  X,
} from 'lucide-react';
import { formatUptime, type ServerPowerAction } from '../api/calagopusCore';
import type { ServerRuntimeState } from '../api/calagopusDashboard';
import { Tooltip } from '../components/Overlays';
import { PetalnodesLogo } from '../components/PetalnodesLogo';
import { Avatar } from '../components/Surface';
import {
  getNavGroupsForScope,
  isRouteActive,
  type CalagopusScope,
  type CalagopusUserContext,
  type NavGroup,
  type NavItem,
} from '../navigation/calagopusRoutes';
import { PETALNODES_BRAND, PETALNODES_LINKS } from '../navigation/petalnodesBrand';
import type { PetalnodesThemeMode } from '../utils/themeMode';
import { cn } from '../utils/cn';
import { NavIcon } from './NavIcon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(Flip);
}

export interface LiquidSidebarServerContext {
  uuidShort: string;
  name: string;
  state: ServerRuntimeState;
  uptimeSeconds: number;
}

export interface LiquidGlassExpandableSidebarProps {
  scope: CalagopusScope;
  currentPath: string;
  user: CalagopusUserContext;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate: (path: string) => void;
  onAfterNavigate?: () => void;
  onSignOut?: () => void;
  brandName?: string;
  activeServer?: LiquidSidebarServerContext;
  serversList?: readonly { uuidShort: string; name: string }[];
  onServerPowerAction?: (action: ServerPowerAction) => void;
  onOpenQuickActions?: () => void;
  themeMode?: PetalnodesThemeMode;
  onToggleThemeMode?: () => void;
  showMobileQuickLinks?: boolean;
  isDrawer?: boolean;
  className?: string;
}

export function LiquidGlassExpandableSidebar({
  scope,
  currentPath,
  user,
  collapsed,
  onToggleCollapse,
  onNavigate,
  onAfterNavigate,
  onSignOut,
  brandName = PETALNODES_BRAND,
  activeServer,
  serversList,
  onServerPowerAction,
  onOpenQuickActions,
  themeMode = 'light',
  onToggleThemeMode,
  showMobileQuickLinks = false,
  isDrawer = false,
  className,
}: LiquidGlassExpandableSidebarProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const flipStateRef = React.useRef<Flip.FlipState | null>(null);
  const [navSearch, setNavSearch] = React.useState('');
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});
  const [openNested, setOpenNested] = React.useState<Record<string, boolean>>({
    'server-minecraft': true,
  });

  const resolvedServerId = activeServer?.uuidShort ?? serversList?.[0]?.uuidShort;
  const serverId = resolvedServerId ?? '';

  const navGroups = React.useMemo(
    () => getNavGroupsForScope(scope, user, serverId || 'alpha-01'),
    [scope, user, serverId],
  );

  const filteredNavGroups = React.useMemo(() => {
    const q = navSearch.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((group) => {
        const items = group.items.filter((item) => {
          const itemMatches =
            item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q);
          const childMatches =
            item.children?.some((child) => child.label.toLowerCase().includes(q)) ?? false;
          return itemMatches || childMatches;
        });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [navGroups, navSearch]);

  const prefersReducedMotion = React.useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useGSAP(
    () => {
      if (isDrawer || !containerRef.current || prefersReducedMotion()) return;
      gsap.to(containerRef.current, {
        width: collapsed ? 76 : 264,
        duration: 0.24,
        ease: 'power2.out',
      });
    },
    { scope: containerRef, dependencies: [collapsed, isDrawer] },
  );

  useGSAP(
    () => {
      if (prefersReducedMotion() || !containerRef.current) return;
      const indicator = containerRef.current.querySelector<HTMLElement>(
        '[data-liquid-active-indicator="true"]',
      );
      if (flipStateRef.current && indicator) {
        Flip.from(flipStateRef.current, {
          targets: indicator,
          duration: 0.22,
          ease: 'power2.out',
          scale: false,
          simple: true,
        });
        flipStateRef.current = null;
      } else if (indicator) {
        gsap.fromTo(
          indicator,
          { opacity: 0.55, scale: 0.98 },
          { opacity: 1, scale: 1, duration: 0.18, ease: 'power1.out' },
        );
      }
    },
    { scope: containerRef, dependencies: [currentPath, collapsed] },
  );

  const captureFlipBeforeNavigate = () => {
    if (prefersReducedMotion() || !containerRef.current) return;
    const indicator = containerRef.current.querySelector<HTMLElement>(
      '[data-liquid-active-indicator="true"]',
    );
    if (indicator) {
      flipStateRef.current = Flip.getState(indicator);
    }
  };

  const handleLinkClick = (path: string) => {
    captureFlipBeforeNavigate();
    onNavigate(path);
    onAfterNavigate?.();
  };

  const isGroupOpen = (group: NavGroup) => {
    if (navSearch.trim().length > 0 || !group.collapsible || collapsed) return true;
    return openGroups[group.id] ?? group.defaultOpen ?? true;
  };

  const toggleGroup = (groupId: string, current: boolean) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !current }));
  };

  const toggleNested = (itemId: string) => {
    setOpenNested((prev) => ({ ...prev, [itemId]: !(prev[itemId] ?? true) }));
  };

  const canAccessAdmin =
    user.isAdmin || user.permissions.some((p) => p.startsWith('admin.'));
  const isRunning = activeServer?.state === 'running' || activeServer?.state === 'starting';

  const renderNavItem = (item: NavItem) => {
    const active = isRouteActive(currentPath, item.path, item.exact);
    const hasChildren = Boolean(item.children && item.children.length > 0 && !collapsed);
    const nestedOpen = openNested[item.id] ?? true;

    const anchor = (
      <div className="relative flex items-center">
        {active ? (
          <span
            data-liquid-active-indicator="true"
            data-flip-id="petal-liquid-active"
            aria-hidden="true"
            className="petal-liquid-pill pointer-events-none absolute inset-0 rounded-lg"
          />
        ) : null}

        <a
          href={item.path}
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick(item.path);
          }}
          aria-current={active ? 'page' : undefined}
          aria-label={collapsed ? item.label : undefined}
          className={cn(
            'blush-transition blush-focus-ring relative z-10 flex min-h-[38px] flex-1 items-center rounded-lg text-[13px] font-medium whitespace-nowrap',
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
            active
              ? 'text-[var(--calagopus-primary-text)]'
              : 'text-[var(--calagopus-text)] hover:bg-[var(--calagopus-primary-subtle)]',
          )}
        >
          <NavIcon
            name={item.icon}
            className={cn(
              'h-4 w-4 shrink-0',
              active ? 'text-[var(--calagopus-primary-text)]' : 'text-[var(--calagopus-text-secondary)]',
            )}
          />
          {!collapsed ? <span className="truncate flex-1">{item.label}</span> : null}
          {!collapsed && item.badge ? (
            <span className="rounded bg-[var(--calagopus-primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--calagopus-primary-text)]">
              {item.badge}
            </span>
          ) : null}
        </a>

        {hasChildren ? (
          <button
            type="button"
            aria-label={`Toggle ${item.label} sub-navigation`}
            aria-expanded={nestedOpen}
            onClick={() => toggleNested(item.id)}
            className="blush-focus-ring relative z-10 mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
          >
            {nestedOpen ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
    );

    return (
      <li key={item.id} className="space-y-0.5">
        {collapsed ? (
          <Tooltip label={item.label} position="right">
            {anchor}
          </Tooltip>
        ) : (
          anchor
        )}

        {hasChildren && nestedOpen && item.children ? (
          <ul className="ml-5 space-y-0.5 border-l border-[var(--calagopus-border)] pl-2.5">
            {item.children.map((child) => {
              const childActive = isRouteActive(currentPath, child.path, child.exact);
              return (
                <li key={child.id}>
                  <a
                    href={child.path}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(child.path);
                    }}
                    aria-current={childActive ? 'page' : undefined}
                    className={cn(
                      'blush-transition blush-focus-ring flex min-h-[32px] items-center gap-2 rounded-md px-2.5 text-[12px] font-medium',
                      childActive
                        ? 'bg-[var(--calagopus-primary-subtle)] text-[var(--calagopus-primary-text)]'
                        : 'text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)]',
                    )}
                  >
                    <NavIcon name={child.icon} className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{child.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <div
      ref={containerRef}
      style={!isDrawer ? { width: collapsed ? 76 : 264 } : undefined}
      className={cn(
        'petal-liquid-glass relative flex h-full flex-col justify-between border-r border-[var(--calagopus-border)] select-none overflow-hidden',
        isDrawer && 'w-full border-r-0',
        className,
      )}
    >
      {/* Subtle SVG displacement definition for liquid glass highlights */}
      <svg className="sr-only" aria-hidden="true" focusable="false">
        <defs>
          <filter id="petal-liquid-glass-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
          </filter>
        </defs>
      </svg>

      {/* Top Scrollable Navigation Container */}
      <div className="flex flex-1 flex-col min-h-0 overflow-y-auto px-3 py-3.5 space-y-3.5">
        {/* Sidebar Brand + Collapse Bar */}
        {!isDrawer ? (
          <div
            className={cn(
              'flex items-center gap-2',
              collapsed ? 'justify-center' : 'justify-between px-1',
            )}
          >
            {!collapsed ? (
              <div className="flex items-center gap-2 min-w-0">
                <PetalnodesLogo size="sm" />
                <div className="min-w-0">
                  <p className="font-display text-[13px] font-bold tracking-tight text-[var(--calagopus-text)] truncate">
                    {brandName}
                  </p>
                  <p className="text-[10.5px] text-[var(--calagopus-text-secondary)] truncate">
                    Plant a seed. Grow a world.
                  </p>
                </div>
              </div>
            ) : (
              <PetalnodesLogo size="sm" />
            )}

            {onToggleCollapse && !collapsed ? (
              <Tooltip label="Collapse sidebar">
                <button
                  type="button"
                  aria-label="Collapse navigation sidebar"
                  onClick={onToggleCollapse}
                  className="blush-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer shrink-0"
                >
                  <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            ) : null}
          </div>
        ) : null}

        {collapsed && onToggleCollapse && !isDrawer ? (
          <div className="flex justify-center">
            <Tooltip label="Expand sidebar" position="right">
              <button
                type="button"
                aria-label="Expand navigation sidebar"
                onClick={onToggleCollapse}
                className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-primary-border)] hover:text-[var(--calagopus-primary-text)] cursor-pointer"
              >
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        ) : null}

        {/* Scope Switcher */}
        {!collapsed ? (
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)]/85 p-1">
            <button
              type="button"
              onClick={() => handleLinkClick('/')}
              className={cn(
                'blush-transition blush-focus-ring inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-medium whitespace-nowrap cursor-pointer',
                scope === 'client'
                  ? 'bg-[var(--calagopus-surface)] text-[var(--calagopus-text)] shadow-[var(--calagopus-shadow-card)]'
                  : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]',
              )}
            >
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Client</span>
            </button>

            <button
              type="button"
              disabled={!resolvedServerId}
              title={!resolvedServerId ? 'No server selected or assigned' : undefined}
              onClick={() => resolvedServerId && handleLinkClick(`/server/${resolvedServerId}`)}
              className={cn(
                'blush-transition blush-focus-ring inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-medium whitespace-nowrap',
                !resolvedServerId
                  ? 'text-[var(--calagopus-text-secondary)] opacity-45 cursor-not-allowed'
                  : scope === 'server'
                    ? 'bg-[var(--calagopus-surface)] text-[var(--calagopus-text)] shadow-[var(--calagopus-shadow-card)] cursor-pointer'
                    : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)] cursor-pointer',
              )}
            >
              <Server className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Server</span>
            </button>

            {canAccessAdmin ? (
              <button
                type="button"
                onClick={() => handleLinkClick('/admin')}
                className={cn(
                  'blush-transition blush-focus-ring inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-medium whitespace-nowrap cursor-pointer',
                  scope === 'admin'
                    ? 'bg-[var(--calagopus-surface)] text-[var(--calagopus-primary-text)] shadow-[var(--calagopus-shadow-card)]'
                    : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]',
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Admin</span>
              </button>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-medium text-[var(--calagopus-text-secondary)] opacity-45 select-none"
              >
                Admin
              </span>
            )}
          </div>
        ) : null}

        {/* Built-in Sidebar Navigation Search + Quick Command Palette trigger */}
        {!collapsed ? (
          <div className="space-y-1.5">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--calagopus-text-secondary)]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setNavSearch('');
                }}
                aria-label="Filter sidebar navigation"
                placeholder="Search routes..."
                className="blush-focus-ring h-8 w-full rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)]/80 pl-8 pr-7 text-[12px] text-[var(--calagopus-text)] placeholder:text-[var(--calagopus-text-secondary)]"
              />
              {navSearch ? (
                <button
                  type="button"
                  aria-label="Clear sidebar search"
                  onClick={() => setNavSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)] cursor-pointer"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {onOpenQuickActions ? (
              <button
                type="button"
                onClick={() => {
                  onAfterNavigate?.();
                  onOpenQuickActions();
                }}
                className="blush-transition blush-focus-ring flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)]/80 px-2.5 py-1.5 text-[11.5px] text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
              >
                <span className="whitespace-nowrap truncate">Command Palette</span>
                <kbd className="shrink-0 rounded border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-1.5 py-0.5 font-mono text-[10px]">
                  Ctrl+K
                </kbd>
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Active Server Context Widget */}
        {!collapsed && scope === 'server' && activeServer ? (
          <div className="rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)]/75 p-3 space-y-2.5 shadow-xs">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--calagopus-text)] leading-tight">
                {activeServer.name}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--calagopus-text-secondary)]">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    isRunning ? 'bg-[var(--calagopus-success)]' : 'bg-[var(--calagopus-text-secondary)]',
                  )}
                  aria-hidden="true"
                />
                <span className="capitalize">{activeServer.state}</span>
                {activeServer.uptimeSeconds > 0 ? (
                  <span className="ml-auto font-mono tabular-nums">
                    {formatUptime(activeServer.uptimeSeconds)}
                  </span>
                ) : null}
              </div>
            </div>

            {onServerPowerAction ? (
              <div className="flex items-center gap-1.5">
                {isRunning ? (
                  <button
                    type="button"
                    onClick={() => onServerPowerAction('stop')}
                    className="blush-transition blush-focus-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--calagopus-danger-border)] bg-[var(--calagopus-danger-bg)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--calagopus-danger-text)] hover:opacity-90 cursor-pointer"
                  >
                    <Square className="h-3 w-3" aria-hidden="true" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onServerPowerAction('start')}
                    className="blush-transition blush-focus-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--calagopus-success-border)] bg-[var(--calagopus-success-bg)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--calagopus-success-text)] hover:opacity-90 cursor-pointer"
                  >
                    <Play className="h-3 w-3" aria-hidden="true" />
                    <span>Start</span>
                  </button>
                )}
                <Tooltip label="Restart server">
                  <button
                    type="button"
                    aria-label="Restart server"
                    onClick={() => onServerPowerAction('restart')}
                    className="blush-transition blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Primary Grouped Navigation */}
        <nav aria-label="Sidebar navigation" className="space-y-3.5">
          {filteredNavGroups.length === 0 ? (
            <p className="px-2.5 py-3 text-[12px] text-[var(--calagopus-text-secondary)]">
              No routes matched "{navSearch}".
            </p>
          ) : (
            filteredNavGroups.map((group) => {
              const expanded = isGroupOpen(group);
              return (
                <div key={group.id} className="space-y-1">
                  {!collapsed ? (
                    group.collapsible ? (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => toggleGroup(group.id, expanded)}
                        className="blush-focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] uppercase text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)] cursor-pointer"
                      >
                        <span>{group.label}</span>
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <p className="px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] uppercase text-[var(--calagopus-text-secondary)]">
                        {group.label}
                      </p>
                    )
                  ) : null}

                  {expanded ? (
                    <ul className="space-y-0.5">{group.items.map(renderNavItem)}</ul>
                  ) : null}
                </div>
              );
            })
          )}
        </nav>

        {/* Mobile Portal Links */}
        {showMobileQuickLinks && !collapsed ? (
          <div className="border-t border-[var(--calagopus-border)] pt-3 space-y-2 lg:hidden">
            <p className="px-2 text-[11px] font-semibold tracking-[0.03em] text-[var(--calagopus-text-secondary)]">
              Petalnodes Portals
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PETALNODES_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="blush-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--calagopus-text)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-primary-text)]"
                >
                  {link.id === 'billing' ? (
                    <CreditCard className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />
                  ) : link.id === 'discord' ? (
                    <MessageCircle className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />
                  ) : link.id === 'website' ? (
                    <Globe className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />
                  ) : (
                    <Activity className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate">{link.shortLabel}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Account Footer + Server Switcher */}
      <div className="border-t border-[var(--calagopus-border)] bg-[var(--calagopus-surface)]/45 p-3 space-y-2.5">
        {!collapsed && scope === 'server' && serversList && serversList.length > 0 ? (
          <div>
            <label htmlFor="calagopus-server-switcher" className="sr-only">
              Switch active server
            </label>
            <select
              id="calagopus-server-switcher"
              value={serverId}
              onChange={(e) => {
                const nextId = e.currentTarget.value;
                const segments = currentPath.split('/').filter(Boolean);
                const subRoute = segments[2] ? `/${segments[2]}` : '';
                handleLinkClick(`/server/${nextId}${subRoute}`);
              }}
              className="blush-focus-ring w-full rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)]/85 px-2.5 py-1.5 text-[12px] font-medium text-[var(--calagopus-text)] hover:border-[var(--calagopus-border-strong)] cursor-pointer"
            >
              {serversList.map((srv) => (
                <option key={srv.uuidShort} value={srv.uuidShort}>
                  {srv.name} ({srv.uuidShort})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Tooltip label={`${user.username} · Profile`} position="right">
              <button
                type="button"
                aria-label="Open account profile"
                onClick={() => handleLinkClick('/account')}
                className="blush-focus-ring rounded-lg cursor-pointer"
              >
                <Avatar name={user.username} src={user.avatarUrl} size="sm" />
              </button>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)]/75 p-2">
            <button
              type="button"
              onClick={() => handleLinkClick('/account')}
              className="blush-focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left cursor-pointer"
            >
              <Avatar name={user.username} src={user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-[var(--calagopus-text)] leading-tight">
                  {user.username}
                </p>
                <p className="truncate text-[11px] text-[var(--calagopus-text-secondary)] leading-tight">
                  {user.email}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              {onToggleThemeMode ? (
                <Tooltip label={themeMode === 'dark' ? 'Light theme' : 'Dark theme'}>
                  <button
                    type="button"
                    aria-label="Toggle color theme"
                    onClick={onToggleThemeMode}
                    className="blush-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-primary-text)] cursor-pointer"
                  >
                    {themeMode === 'dark' ? (
                      <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </Tooltip>
              ) : null}

              {onSignOut ? (
                <Tooltip label="Sign out">
                  <button
                    type="button"
                    aria-label="Sign out"
                    onClick={onSignOut}
                    className="blush-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-danger-bg)] hover:text-[var(--calagopus-danger-text)] cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </Tooltip>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiquidGlassExpandableSidebar;
