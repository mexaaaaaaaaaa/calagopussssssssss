import React from 'react';
import { Drawer } from '@mantine/core';
import type { ServerPowerAction } from '../api/calagopusCore';
import type { ServerRuntimeState } from '../api/calagopusDashboard';
import { PetalnodesLogo } from '../components/PetalnodesLogo';
import type { CalagopusScope, CalagopusUserContext } from '../navigation/calagopusRoutes';
import { PETALNODES_BRAND } from '../navigation/petalnodesBrand';
import type { PetalnodesThemeMode } from '../utils/themeMode';
import { LiquidGlassExpandableSidebar } from './liquid-glass-expandable-sidebar';

export interface SidebarServerContext {
  uuidShort: string;
  name: string;
  state: ServerRuntimeState;
  uptimeSeconds: number;
}

export interface AppSidebarProps {
  scope: CalagopusScope;
  currentPath: string;
  user: CalagopusUserContext;
  collapsed: boolean;
  mobileOpened: boolean;
  onCloseMobile: () => void;
  onNavigate: (path: string) => void;
  onToggleCollapse?: () => void;
  onSignOut?: () => void;
  themeMode?: PetalnodesThemeMode;
  onToggleThemeMode?: () => void;
  brandName?: string;
  activeServer?: SidebarServerContext;
  serversList?: readonly { uuidShort: string; name: string }[];
  onServerPowerAction?: (action: ServerPowerAction) => void;
  onOpenQuickActions?: () => void;
}

export function AppSidebar({
  scope,
  currentPath,
  user,
  collapsed,
  mobileOpened,
  onCloseMobile,
  onNavigate,
  onToggleCollapse,
  onSignOut,
  themeMode,
  onToggleThemeMode,
  brandName = PETALNODES_BRAND,
  activeServer,
  serversList,
  onServerPowerAction,
  onOpenQuickActions,
}: AppSidebarProps) {
  return (
    <>
      <aside aria-label="Primary sidebar" className="hidden lg:flex lg:flex-col lg:shrink-0">
        <LiquidGlassExpandableSidebar
          scope={scope}
          currentPath={currentPath}
          user={user}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          themeMode={themeMode}
          onToggleThemeMode={onToggleThemeMode}
          brandName={brandName}
          activeServer={activeServer}
          serversList={serversList}
          onServerPowerAction={onServerPowerAction}
          onOpenQuickActions={onOpenQuickActions}
        />
      </aside>

      <Drawer
        opened={mobileOpened}
        onClose={onCloseMobile}
        size={280}
        padding={0}
        zIndex={200}
        overlayProps={{ backgroundOpacity: 0.45 }}
        transitionProps={{ duration: 100 }}
        title={
          <div className="flex items-center gap-2.5">
            <PetalnodesLogo size="sm" />
            <span className="font-display text-sm font-semibold text-[var(--calagopus-text)]">
              {brandName}
            </span>
          </div>
        }
        closeButtonProps={{ 'aria-label': 'Close navigation menu' }}
        styles={{
          content: {
            backgroundColor: 'var(--calagopus-surface)',
            color: 'var(--calagopus-text)',
          },
          header: {
            borderBottom: '1px solid var(--calagopus-border)',
            padding: '14px 16px',
            backgroundColor: 'var(--calagopus-surface)',
          },
          body: {
            padding: 0,
            height: 'calc(100% - 57px)',
            backgroundColor: 'var(--calagopus-surface)',
          },
        }}
      >
        <LiquidGlassExpandableSidebar
          scope={scope}
          currentPath={currentPath}
          user={user}
          collapsed={false}
          isDrawer
          brandName={brandName}
          onNavigate={onNavigate}
          onAfterNavigate={onCloseMobile}
          onSignOut={() => {
            onCloseMobile();
            onSignOut?.();
          }}
          themeMode={themeMode}
          onToggleThemeMode={onToggleThemeMode}
          activeServer={activeServer}
          serversList={serversList}
          onServerPowerAction={onServerPowerAction}
          onOpenQuickActions={onOpenQuickActions}
          showMobileQuickLinks
        />
      </Drawer>
    </>
  );
}
