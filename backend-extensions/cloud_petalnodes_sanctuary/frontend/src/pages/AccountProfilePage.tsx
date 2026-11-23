import React from 'react';
import {
  Camera,
  Clock,
  Save,
  Shield,
  Sliders,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import type { CalagopusServerSummary } from '../api/calagopusDashboard';
import type { PetalnodesUiPreferences } from '../api/calagopusModules';
import { validateBannerImageFile } from '../utils/serverArtwork';
import {
  DEFAULT_ALERT_THRESHOLDS,
  loadAlertThresholds,
  loadLocalePreference,
  saveAlertThresholds,
  saveLocalePreference,
  translateUi,
  type ResourceAlertThresholds,
  type SupportedLocale,
} from '../utils/petalnodesFeatures';
import { Button } from '../components/Button';
import { EmptyState } from '../components/FeedbackStates';
import { Checkbox, NumberInput, SelectDropdown, TextInput } from '../components/FormControls';
import { showToast } from '../components/Overlays';
import { PWAControlsInline } from './ProfilePwaHelper';
import { Card, PageHeader, ProfileBadge, StatusBadge } from '../components/Surface';
import type { CalagopusUserContext } from '../navigation/calagopusRoutes';

export interface AccountProfilePageProps {
  user: CalagopusUserContext;
  preferences: PetalnodesUiPreferences;
  favoriteServers?: readonly CalagopusServerSummary[];
  recentServers?: readonly CalagopusServerSummary[];
  accountCreatedAt?: string;
  onUpdateProfile: (input: {
    username: string;
    email: string;
    avatarUrl?: string | null;
  }) => Promise<void> | void;
  onUpdatePreferences: (next: PetalnodesUiPreferences) => void;
  onNavigate?: (path: string) => void;
}

export function AccountProfilePage({
  user,
  preferences,
  favoriteServers = [],
  recentServers = [],
  accountCreatedAt = '2026-06-14',
  onUpdateProfile,
  onUpdatePreferences,
  onNavigate,
}: AccountProfilePageProps) {
  const [username, setUsername] = React.useState(user.username);
  const [email, setEmail] = React.useState(user.email);
  const [avatarDraft, setAvatarDraft] = React.useState<string | null>(user.avatarUrl ?? null);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<SupportedLocale>(() => loadLocalePreference());
  const [thresholds, setThresholds] = React.useState<ResourceAlertThresholds>(() =>
    loadAlertThresholds(),
  );
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setUsername(user.username);
    setEmail(user.email);
    setAvatarDraft(user.avatarUrl ?? null);
    setDirty(false);
  }, [user]);

  const handleAvatarFile = (file: File) => {
    const err = validateBannerImageFile(file);
    if (err) {
      showToast({ title: 'Invalid avatar image', message: err, tone: 'warning' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarDraft(reader.result);
        setDirty(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid username and email address.');
      return;
    }
    const cleanUsername = username.trim();
    try {
      await Promise.resolve(
        onUpdateProfile({
          username: cleanUsername,
          email: email.trim(),
          avatarUrl: avatarDraft,
        }),
      );
      setError(null);
      setDirty(false);
      showToast({
        title: 'Profile updated',
        message: `Saved Petalnodes account details for ${cleanUsername}.`,
        tone: 'success',
      });
    } catch {
      // Error surfaced by caller
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateUi(locale, 'profile')}
        description="Manage your Petalnodes panel identity, avatar, server shortcuts, alert thresholds, and interface preferences."
        metadata={[
          user.isAdmin ? 'Administrator' : 'Member',
          user.id,
          `Member since ${accountCreatedAt}`,
          `${user.permissions.length} permission scopes`,
        ]}
      />

      {dirty ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--calagopus-warning-border)] bg-[var(--calagopus-warning-bg)] px-4 py-3 text-[13px] text-[var(--calagopus-warning-text)]"
        >
          <span>You have unsaved profile changes.</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setUsername(user.username);
              setEmail(user.email);
              setAvatarDraft(user.avatarUrl ?? null);
              setDirty(false);
            }}
          >
            Reset
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Identity & Avatar"
          description="Update your display username, notification email, and profile avatar."
          headerAction={
            <StatusBadge
              tone={user.isAdmin ? 'pink' : 'success'}
              label={user.isAdmin ? 'Admin' : 'Verified'}
            />
          }
        >
          <form onSubmit={handleProfileSave} className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              aria-label="Upload profile avatar"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                e.currentTarget.value = '';
                if (f) handleAvatarFile(f);
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
              <ProfileBadge name={username || user.username} subtitle={email || user.email} avatarSrc={avatarDraft} />
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Camera className="h-3.5 w-3.5" />}
                  onClick={() => fileRef.current?.click()}
                >
                  Upload
                </Button>
                {avatarDraft ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setAvatarDraft(null);
                      setDirty(true);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            <TextInput
              label="Username"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.currentTarget.value);
                setError(null);
                setDirty(true);
              }}
            />

            <TextInput
              label="Email Address"
              type="email"
              required
              value={email}
              error={error ?? undefined}
              onChange={(e) => {
                setEmail(e.currentTarget.value);
                setError(null);
                setDirty(true);
              }}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save Profile
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Panel Preferences & Install"
          description="Personalize table density, confirmation prompts, console scrolling, and PWA mode."
          headerAction={<Sliders className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
        >
          <div className="space-y-4">
            <Checkbox
              label="Prompt confirmation before destructive server actions"
              description="Requires confirmation dialogs before stopping servers or deleting files and backups."
              checked={preferences.confirmDestructiveActions}
              onChange={(e) => {
                onUpdatePreferences({
                  ...preferences,
                  confirmDestructiveActions: e.currentTarget.checked,
                });
                showToast({ title: 'Preferences saved', tone: 'success' });
              }}
            />
            <Checkbox
              label="Enable console auto-scroll on connection"
              description="Automatically follow new terminal output lines when opening server consoles."
              checked={preferences.consoleAutoScrollDefault}
              onChange={(e) => {
                onUpdatePreferences({
                  ...preferences,
                  consoleAutoScrollDefault: e.currentTarget.checked,
                });
                showToast({ title: 'Preferences saved', tone: 'success' });
              }}
            />
            <Checkbox
              label="Compact table row density"
              description="Reduces vertical padding in file listings and server inventory tables."
              checked={preferences.compactTableRows}
              onChange={(e) => {
                onUpdatePreferences({
                  ...preferences,
                  compactTableRows: e.currentTarget.checked,
                });
                showToast({ title: 'Preferences saved', tone: 'success' });
              }}
            />

            <div className="border-t border-[var(--calagopus-border)] pt-3 space-y-3">
              <SelectDropdown
                label="Interface Language"
                value={locale}
                onChange={(val) => {
                  const next = (val as SupportedLocale) ?? 'en';
                  setLocale(next);
                  saveLocalePreference(next);
                  showToast({ title: 'Language preference saved', message: next.toUpperCase(), tone: 'success' });
                }}
                data={[
                  { value: 'en', label: 'English (EN)' },
                  { value: 'es', label: 'Español (ES)' },
                  { value: 'de', label: 'Deutsch (DE)' },
                  { value: 'ja', label: '日本語 (JA)' },
                ]}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--calagopus-text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Saved locally per browser profile
                </span>
                <PWAControlsInline />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Resource Alert Thresholds & Account Recovery */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Resource Warning Thresholds"
          description="Control when CPU, RAM, and Disk alerts highlight servers and trigger notifications."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput
                label="CPU Alert %"
                min={10}
                max={100}
                value={thresholds.cpuPercent}
                onChange={(v) =>
                  setThresholds((prev) => ({ ...prev, cpuPercent: Number(v) || DEFAULT_ALERT_THRESHOLDS.cpuPercent }))
                }
              />
              <NumberInput
                label="RAM Alert %"
                min={10}
                max={100}
                value={thresholds.memoryPercent}
                onChange={(v) =>
                  setThresholds((prev) => ({ ...prev, memoryPercent: Number(v) || DEFAULT_ALERT_THRESHOLDS.memoryPercent }))
                }
              />
              <NumberInput
                label="Disk Alert %"
                min={10}
                max={100}
                value={thresholds.diskPercent}
                onChange={(v) =>
                  setThresholds((prev) => ({ ...prev, diskPercent: Number(v) || DEFAULT_ALERT_THRESHOLDS.diskPercent }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setThresholds(DEFAULT_ALERT_THRESHOLDS);
                  saveAlertThresholds(DEFAULT_ALERT_THRESHOLDS);
                  showToast({ title: 'Alert thresholds reset', tone: 'info' });
                }}
              >
                Reset Defaults
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  saveAlertThresholds(thresholds);
                  showToast({ title: 'Alert thresholds saved', tone: 'success' });
                }}
              >
                Save Thresholds
              </Button>
            </div>
          </div>
        </Card>

        <Card
          title="Account Recovery & Lifecycle"
          description="Registered account metadata, recovery instructions, and deletion policy."
        >
          <div className="space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between border-b border-[var(--calagopus-border)] pb-2">
              <span className="text-[var(--calagopus-text-secondary)]">Account Created</span>
              <span className="font-mono text-[var(--calagopus-text)]">{accountCreatedAt}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--calagopus-border)] pb-2">
              <span className="text-[var(--calagopus-text-secondary)]">Recovery Contact</span>
              <span className="font-mono text-[var(--calagopus-text)]">{user.email}</span>
            </div>
            <p className="text-[var(--calagopus-text-secondary)] leading-relaxed">
              Account deletion requires releasing all active game servers and billing subscriptions via support verification or administrator authorization inside Calagopus.
            </p>
            {onNavigate ? (
              <div className="flex justify-end pt-1">
                <Button variant="secondary" size="sm" onClick={() => onNavigate('/account/security')}>
                  Manage 2FA &amp; Recovery Security
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Favorites, Recent Servers & Permissions Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="Favorite Servers"
          description="Starred containers pinned for quick access."
          headerAction={<Star className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
        >
          {favoriteServers.length === 0 ? (
            <EmptyState
              title="No favorite servers yet"
              description="Star any server on the dashboard to pin it here."
            />
          ) : (
            <ul className="space-y-2">
              {favoriteServers.map((srv) => (
                <li key={srv.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--calagopus-text)] truncate">{srv.name}</p>
                    <p className="font-mono text-[11px] text-[var(--calagopus-text-secondary)]">{srv.uuidShort} · {srv.node}</p>
                  </div>
                  {onNavigate ? (
                    <Button variant="secondary" size="sm" onClick={() => onNavigate(`/server/${srv.uuidShort}`)}>
                      Open
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recently Accessed"
          description="Servers visited in this session."
          headerAction={<Clock className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
        >
          {recentServers.length === 0 ? (
            <EmptyState
              title="No recent server visits"
              description="Consoles and file managers you visit appear here."
            />
          ) : (
            <ul className="space-y-2">
              {recentServers.map((srv) => (
                <li key={srv.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--calagopus-text)] truncate">{srv.name}</p>
                    <p className="font-mono text-[11px] text-[var(--calagopus-text-secondary)]">{srv.eggName}</p>
                  </div>
                  {onNavigate ? (
                    <Button variant="secondary" size="sm" onClick={() => onNavigate(`/server/${srv.uuidShort}`)}>
                      Console
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Effective Permissions"
          description="Authorization scopes currently held by your account."
          headerAction={<Shield className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
        >
          <div className="flex flex-wrap gap-1.5">
            {user.permissions.map((perm) => (
              <code
                key={perm}
                className="rounded-md border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2 py-0.5 font-mono text-[11px] text-[var(--calagopus-text)]"
              >
                {perm}
              </code>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
