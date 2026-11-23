import React from 'react';
import { Menu as MantineMenu } from '@mantine/core';
import { ChevronDown, Key, LogOut, Moon, Shield, ShieldCheck, Sun, User } from 'lucide-react';
import { Avatar } from '../components/Surface';
import type { CalagopusUserContext } from '../navigation/calagopusRoutes';
import type { PetalnodesThemeMode } from '../utils/themeMode';

export interface AccountMenuProps {
  user: CalagopusUserContext;
  currentPath: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  themeMode?: PetalnodesThemeMode;
  onToggleThemeMode?: () => void;
}

export function AccountMenu({
  user,
  currentPath,
  onNavigate,
  onSignOut,
  themeMode = 'light',
  onToggleThemeMode,
}: AccountMenuProps) {
  const canAccessAdmin =
    user.isAdmin || user.permissions.some((perm) => perm.startsWith('admin.'));

  return (
    <MantineMenu position="bottom-end" width={240} shadow="sm">
      <MantineMenu.Target>
        <button
          type="button"
          aria-label={`Account menu for ${user.username}`}
          className="blush-transition blush-focus-ring inline-flex min-h-[40px] items-center gap-2.5 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-2.5 py-1.5 text-left hover:bg-[var(--calagopus-primary-subtle)] hover:border-[var(--calagopus-border-strong)] cursor-pointer max-w-[220px]"
        >
          <Avatar name={user.username} src={user.avatarUrl} size="sm" />
          <span className="hidden sm:flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-[var(--calagopus-text)] leading-tight">
              {user.username}
            </span>
            <span className="truncate text-[11px] text-[var(--calagopus-text-secondary)] leading-tight">
              {user.isAdmin ? 'Administrator' : 'Member'}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--calagopus-text-secondary)] shrink-0" aria-hidden="true" />
        </button>
      </MantineMenu.Target>

      <MantineMenu.Dropdown className="p-1.5">
        <div className="border-b border-[var(--calagopus-border)] px-2.5 py-2 mb-1">
          <p className="truncate text-[13px] font-semibold text-[var(--calagopus-text)]">{user.username}</p>
          <p className="truncate text-[12px] text-[var(--calagopus-text-secondary)]">{user.email}</p>
        </div>

        <MantineMenu.Item
          leftSection={<User className="h-4 w-4 text-[var(--calagopus-text-secondary)]" aria-hidden="true" />}
          onClick={() => onNavigate('/account')}
          className={`rounded-md text-[13px] font-medium ${
            currentPath === '/account'
              ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
              : 'text-[var(--calagopus-text)]'
          }`}
        >
          Account Profile
        </MantineMenu.Item>

        <MantineMenu.Item
          leftSection={<Shield className="h-4 w-4 text-[var(--calagopus-text-secondary)]" aria-hidden="true" />}
          onClick={() => onNavigate('/account/security')}
          className={`rounded-md text-[13px] font-medium ${
            currentPath === '/account/security'
              ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
              : 'text-[var(--calagopus-text)]'
          }`}
        >
          Security &amp; 2FA
        </MantineMenu.Item>

        <MantineMenu.Item
          leftSection={<Key className="h-4 w-4 text-[var(--calagopus-text-secondary)]" aria-hidden="true" />}
          onClick={() => onNavigate('/account/api-keys')}
          className={`rounded-md text-[13px] font-medium ${
            currentPath === '/account/api-keys'
              ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
              : 'text-[var(--calagopus-text)]'
          }`}
        >
          API Keys
        </MantineMenu.Item>

        {onToggleThemeMode ? (
          <MantineMenu.Item
            leftSection={
              themeMode === 'dark' ? (
                <Sun className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-[var(--calagopus-text-secondary)]" aria-hidden="true" />
              )
            }
            onClick={onToggleThemeMode}
            className="rounded-md text-[13px] font-medium text-[var(--calagopus-text)]"
          >
            {themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </MantineMenu.Item>
        ) : null}

        {canAccessAdmin ? (
          <>
            <MantineMenu.Divider className="my-1 border-[var(--calagopus-border)]" />
            <MantineMenu.Item
              leftSection={<ShieldCheck className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
              onClick={() => onNavigate('/admin')}
              className={`rounded-md text-[13px] font-medium ${
                currentPath.startsWith('/admin')
                  ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
                  : 'text-[var(--calagopus-text)]'
              }`}
            >
              Admin Area
            </MantineMenu.Item>
          </>
        ) : null}

        <MantineMenu.Divider className="my-1 border-[var(--calagopus-border)]" />

        <MantineMenu.Item
          leftSection={<LogOut className="h-4 w-4 text-[var(--calagopus-danger-text)]" aria-hidden="true" />}
          onClick={onSignOut}
          className="rounded-md text-[13px] font-medium text-[var(--calagopus-danger-text)]"
        >
          Sign Out
        </MantineMenu.Item>
      </MantineMenu.Dropdown>
    </MantineMenu>
  );
}
