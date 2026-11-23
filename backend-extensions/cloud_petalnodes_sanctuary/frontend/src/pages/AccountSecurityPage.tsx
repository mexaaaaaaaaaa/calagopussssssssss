import React from 'react';
import { Laptop, Lock, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { CalagopusActivityEntry } from '../api/calagopusDashboard';
import { validatePasswordUpdate, type CalagopusUserSession } from '../api/calagopusModules';
import { Button } from '../components/Button';
import { EmptyState } from '../components/FeedbackStates';
import { PasswordInput, TextInput } from '../components/FormControls';
import { ConfirmDialog, showToast } from '../components/Overlays';
import { Card, PageHeader, StatusBadge } from '../components/Surface';

export interface AccountSecurityPageProps {
  twoFactorEnabled: boolean;
  totpSetupKey?: string;
  sessions?: readonly CalagopusUserSession[];
  securityActivity?: readonly CalagopusActivityEntry[];
  onRevokeSession?: (sessionId: string) => Promise<void> | void;
  onSignOutAll?: () => Promise<void> | void;
  onUpdatePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void> | void;
  onToggleTwoFactor: (enabled: boolean, code?: string) => Promise<void> | void;
}

export function AccountSecurityPage({
  twoFactorEnabled,
  totpSetupKey,
  sessions = [],
  securityActivity = [],
  onRevokeSession,
  onSignOutAll,
  onUpdatePassword,
  onToggleTwoFactor,
}: AccountSecurityPageProps) {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [nextPassword, setNextPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{
    currentError?: string;
    nextError?: string;
    confirmError?: string;
  }>({});

  const [totpCode, setTotpCode] = React.useState('');
  const [totpError, setTotpError] = React.useState<string | null>(null);
  const [disableConfirmOpen, setDisableConfirmOpen] = React.useState(false);
  const [signOutAllOpen, setSignOutAllOpen] = React.useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePasswordUpdate(currentPassword, nextPassword, confirmPassword);
    if (validation.currentError || validation.nextError || validation.confirmError) {
      setErrors(validation);
      return;
    }
    try {
      await Promise.resolve(onUpdatePassword({ currentPassword, newPassword: nextPassword }));
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setErrors({});
      showToast({
        title: 'Password updated',
        message: 'Your Petalnodes account password has been changed.',
        tone: 'success',
      });
    } catch {
      // Error surfaced by caller
    }
  };

  const handleEnableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = totpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setTotpError('Enter the 6-digit verification code from your authenticator app.');
      return;
    }
    try {
      await Promise.resolve(onToggleTwoFactor(true, code));
      setTotpCode('');
      setTotpError(null);
      showToast({
        title: 'Two-factor authentication enabled',
        message: 'TOTP verification is now required at sign-in.',
        tone: 'success',
      });
    } catch {
      // Error surfaced by caller
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Authentication"
        description="Rotate your password, manage 2FA TOTP verification, and audit active browser sessions."
        actions={
          onSignOutAll ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
              onClick={() => setSignOutAllOpen(true)}
            >
              Sign Out Other Sessions
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Update Password"
          description="Use at least 8 characters including letters and numbers."
          headerAction={<Lock className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <PasswordInput
              label="Current Password"
              required
              value={currentPassword}
              error={errors.currentError}
              onChange={(e) => {
                setCurrentPassword(e.currentTarget.value);
                setErrors((prev) => ({ ...prev, currentError: undefined }));
              }}
            />
            <PasswordInput
              label="New Password"
              required
              value={nextPassword}
              error={errors.nextError}
              onChange={(e) => {
                setNextPassword(e.currentTarget.value);
                setErrors((prev) => ({ ...prev, nextError: undefined }));
              }}
            />
            <PasswordInput
              label="Confirm New Password"
              required
              value={confirmPassword}
              error={errors.confirmError}
              onChange={(e) => {
                setConfirmPassword(e.currentTarget.value);
                setErrors((prev) => ({ ...prev, confirmError: undefined }));
              }}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm">
                Update Password
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Two-Factor Authentication (2FA)"
          description="Protect console and SFTP access using an authenticator TOTP token."
          headerAction={
            <StatusBadge
              tone={twoFactorEnabled ? 'success' : 'warning'}
              label={twoFactorEnabled ? 'Enabled' : 'Disabled'}
            />
          }
        >
          {twoFactorEnabled ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-[var(--calagopus-success-border)] bg-[var(--calagopus-success-bg)] p-3.5 text-[13px] text-[var(--calagopus-success-text)]">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium">Two-factor authentication is active</p>
                  <p className="mt-0.5 text-[12px]">
                    Your account requires a 6-digit verification code on sign-in. Keep your recovery tokens in a secure password manager.
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDisableConfirmOpen(true)}
              >
                Disable Two-Factor Auth
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEnableTotp} className="space-y-4">
              <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 text-[12px] text-[var(--calagopus-text-secondary)] space-y-1">
                <p className="font-medium text-[var(--calagopus-text)]">Authenticator Setup Key</p>
                {totpSetupKey ? (
                  <p className="font-mono text-[var(--calagopus-primary-text)] break-all">{totpSetupKey}</p>
                ) : (
                  <p className="text-[var(--calagopus-text-secondary)]">
                    Issued dynamically by Calagopus when two-factor enrollment begins.
                  </p>
                )}
              </div>
              <TextInput
                label="6-Digit Verification Code"
                placeholder="123456"
                required
                value={totpCode}
                error={totpError ?? undefined}
                onChange={(e) => {
                  setTotpCode(e.currentTarget.value);
                  setTotpError(null);
                }}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm">
                  Enable 2FA
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>

      {/* Active Sessions & Login History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Active Sessions"
          description="Devices holding an authenticated panel session."
          headerAction={<Laptop className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
        >
          {sessions.length === 0 ? (
            <EmptyState
              title="No active remote sessions"
              description="Session telemetry is managed by the Calagopus authentication backend."
            />
          ) : (
            <ul className="divide-y divide-[var(--calagopus-border)]">
              {sessions.map((sess) => (
                <li key={sess.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[var(--calagopus-text)]">
                        {sess.deviceLabel}
                      </span>
                      {sess.isCurrent ? <StatusBadge tone="success" label="Current" /> : null}
                    </div>
                    <p className="font-mono text-[11.5px] text-[var(--calagopus-text-secondary)]">
                      {sess.ipAddress} · {sess.location} · {sess.lastActiveAt}
                    </p>
                  </div>
                  {!sess.isCurrent && onRevokeSession ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void Promise.resolve(onRevokeSession(sess.id))}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Security & Sign-In History"
          description="Recent authentication and credential changes on your account."
          headerAction={<ShieldAlert className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
        >
          {securityActivity.length === 0 ? (
            <EmptyState
              title="No security events recorded"
              description="Sign-ins, password updates, and API key actions appear here."
            />
          ) : (
            <ul className="divide-y divide-[var(--calagopus-border)]">
              {securityActivity.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2 py-2.5 text-[12.5px]">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--calagopus-text)] truncate">{entry.description}</p>
                    <p className="font-mono text-[11px] text-[var(--calagopus-text-secondary)]">
                      {entry.ipAddress} · {entry.timestamp}
                    </p>
                  </div>
                  <StatusBadge
                    tone={entry.status === 'completed' ? 'success' : 'warning'}
                    label={entry.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        opened={disableConfirmOpen}
        onClose={() => setDisableConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await Promise.resolve(onToggleTwoFactor(false));
            showToast({
              title: 'Two-factor authentication disabled',
              tone: 'warning',
            });
          } catch {
            // Error surfaced by caller
          }
          setDisableConfirmOpen(false);
        }}
        title="Disable Two-Factor Authentication"
        message="Removing 2FA lowers account security for your Petalnodes servers. Continue?"
        confirmLabel="Disable 2FA"
        destructive
      />

      <ConfirmDialog
        opened={signOutAllOpen}
        onClose={() => setSignOutAllOpen(false)}
        onConfirm={async () => {
          if (onSignOutAll) {
            await Promise.resolve(onSignOutAll());
          }
          setSignOutAllOpen(false);
        }}
        title="Terminate All Other Sessions"
        message="Revoke authentication tokens on every other browser and mobile device?"
        confirmLabel="Revoke Sessions"
        destructive
      />
    </div>
  );
}
