import React from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { CalagopusServerDetail } from '../api/calagopusCore';
import { validateSubuserEmail, type CalagopusSubuserRecord } from '../api/calagopusModules';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState } from '../components/FeedbackStates';
import { Checkbox, TextInput } from '../components/FormControls';
import { ConfirmDialog, ModalDialog, showToast } from '../components/Overlays';
import { Card, PageHeader, ProfileBadge, StatusBadge } from '../components/Surface';

export interface ServerUsersPageProps {
  server: CalagopusServerDetail;
  subusers: readonly CalagopusSubuserRecord[];
  onInviteSubuser: (email: string, permissions: string[]) => Promise<void> | void;
  onUpdateSubuserPermissions: (subuserId: string, permissions: string[]) => Promise<void> | void;
  onRemoveSubuser: (subuserId: string) => Promise<void> | void;
  compact?: boolean;
  confirmDestructive?: boolean;
}

const SUBUSER_PERMISSIONS = [
  { id: 'control.console', label: 'Console stream & commands' },
  { id: 'control.power', label: 'Start / stop / restart server' },
  { id: 'file.read', label: 'List & view files' },
  { id: 'file.write', label: 'Edit, create, upload & delete files' },
  { id: 'backup.read', label: 'View backups' },
  { id: 'backup.create', label: 'Create backups' },
  { id: 'database.read', label: 'View databases' },
  { id: 'schedule.read', label: 'View schedules' },
];

export function ServerUsersPage({
  server,
  subusers,
  onInviteSubuser,
  onUpdateSubuserPermissions,
  onRemoveSubuser,
  compact = false,
  confirmDestructive = true,
}: ServerUsersPageProps) {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = React.useState<string[]>(['control.console', 'file.read']);

  const [editingUser, setEditingUser] = React.useState<CalagopusSubuserRecord | null>(null);
  const [editPerms, setEditPerms] = React.useState<string[]>([]);
  const [removeTarget, setRemoveTarget] = React.useState<CalagopusSubuserRecord | null>(null);

  const togglePerm = (list: string[], setter: (v: string[]) => void, id: string) => {
    setter(list.includes(id) ? list.filter((p) => p !== id) : [...list, id]);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateSubuserEmail(
      email,
      subusers.map((u) => u.email),
    );
    if (err) {
      setEmailError(err);
      return;
    }
    const normalized = email.trim().toLowerCase();
    try {
      await Promise.resolve(onInviteSubuser(normalized, selectedPerms));
      showToast({
        title: 'Subuser invited',
        message: `${normalized} now has access to ${server.name}.`,
        tone: 'success',
      });
      setInviteOpen(false);
      setEmail('');
      setSelectedPerms(['control.console', 'file.read']);
      setEmailError(null);
    } catch {
      // Error surfaced by caller
    }
  };

  const columns: readonly TableColumn<CalagopusSubuserRecord>[] = [
    {
      key: 'username',
      header: 'Subuser',
      render: (u) => <ProfileBadge name={u.username} subtitle={u.email} />,
    },
    {
      key: 'permissions',
      header: 'Granted Permissions',
      render: (u) => (
        <div className="flex items-center gap-2">
          <StatusBadge tone="pink" label={`${u.permissions.length} grants`} showIcon={false} />
          <span className="truncate text-[12px] text-[var(--calagopus-text-secondary)] max-w-[260px]">
            {u.permissions.join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added',
      numeric: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subusers"
        description={`Grant scoped console, file, backup, or power permissions on ${server.name}.`}
        metadata={[`${subusers.length} active collaborators`]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setInviteOpen(true)}
          >
            Invite Subuser
          </Button>
        }
      />

      <Card
        title="Authorized Subusers"
        description="Manage granular per-user access permissions for this server instance."
      >
        <DataTable
          caption="Server Subusers"
          columns={columns}
          rows={subusers}
          compact={compact}
          renderActions={(u) => (
            <div className="inline-flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingUser(u);
                  setEditPerms([...u.permissions]);
                }}
              >
                Permissions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove subuser ${u.username}`}
                leftIcon={<Trash2 className="h-3.5 w-3.5 text-[var(--calagopus-danger-text)]" />}
                onClick={async () => {
                  if (confirmDestructive) {
                    setRemoveTarget(u);
                  } else {
                    try {
                      await Promise.resolve(onRemoveSubuser(u.id));
                      showToast({
                        title: 'Subuser removed',
                        message: `Revoked ${u.username}'s access.`,
                        tone: 'success',
                      });
                    } catch {
                      // Error surfaced by caller
                    }
                  }
                }}
              >
                Remove
              </Button>
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="No subusers added"
              description="Invite teammates by email to share scoped access without sharing your main credentials."
              actionLabel="Invite Subuser"
              onAction={() => setInviteOpen(true)}
            />
          }
        />
      </Card>

      <ModalDialog
        opened={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Subuser"
        description={`Assign permissions for ${server.name}.`}
        size="md"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <TextInput
            label="User Email"
            placeholder="teammate@petalnodes.cloud"
            required
            value={email}
            error={emailError ?? undefined}
            onChange={(e) => {
              setEmail(e.currentTarget.value);
              setEmailError(null);
            }}
          />
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-[var(--calagopus-text)]">Permissions</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
              {SUBUSER_PERMISSIONS.map((perm) => (
                <Checkbox
                  key={perm.id}
                  label={perm.label}
                  checked={selectedPerms.includes(perm.id)}
                  onChange={() => togglePerm(selectedPerms, setSelectedPerms, perm.id)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Invite User
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        opened={editingUser !== null}
        onClose={() => setEditingUser(null)}
        title={editingUser ? `Permissions: ${editingUser.username}` : 'Permissions'}
        description={editingUser?.email}
        size="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingUser) return;
            try {
              await Promise.resolve(onUpdateSubuserPermissions(editingUser.id, editPerms));
              showToast({
                title: 'Permissions updated',
                message: `Saved ${editPerms.length} grants for ${editingUser.username}.`,
                tone: 'success',
              });
              setEditingUser(null);
            } catch {
              // Error surfaced by caller
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
            {SUBUSER_PERMISSIONS.map((perm) => (
              <Checkbox
                key={perm.id}
                label={perm.label}
                checked={editPerms.includes(perm.id)}
                onChange={() => togglePerm(editPerms, setEditPerms, perm.id)}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Permissions
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ConfirmDialog
        opened={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (removeTarget) {
            try {
              await Promise.resolve(onRemoveSubuser(removeTarget.id));
              showToast({
                title: 'Subuser removed',
                message: `Revoked ${removeTarget.username}'s access.`,
                tone: 'success',
              });
            } catch {
              // Error surfaced by caller
            }
          }
          setRemoveTarget(null);
        }}
        title="Remove Subuser"
        message={`Revoke all access for "${removeTarget?.username}" (${removeTarget?.email}) from ${server.name}?`}
        confirmLabel="Remove Access"
        destructive
      />
    </div>
  );
}
