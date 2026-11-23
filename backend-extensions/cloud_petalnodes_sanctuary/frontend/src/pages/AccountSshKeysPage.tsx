import React from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { validateSshPublicKey, type CalagopusSshKeyRecord } from '../api/calagopusModules';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState } from '../components/FeedbackStates';
import { Textarea, TextInput } from '../components/FormControls';
import { ConfirmDialog, ModalDialog, showToast } from '../components/Overlays';
import { Card, PageHeader } from '../components/Surface';

export interface AccountSshKeysPageProps {
  sshKeys: readonly CalagopusSshKeyRecord[];
  onAddSshKey: (input: { name: string; publicKey: string }) => Promise<void> | void;
  onDeleteSshKey: (keyId: string) => Promise<void> | void;
  compact?: boolean;
  confirmDestructive?: boolean;
}

export function AccountSshKeysPage({
  sshKeys,
  onAddSshKey,
  onDeleteSshKey,
  compact = false,
  confirmDestructive = true,
}: AccountSshKeysPageProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [publicKey, setPublicKey] = React.useState('');
  const [errors, setErrors] = React.useState<{ nameError?: string; keyError?: string }>({});
  const [deleteTarget, setDeleteTarget] = React.useState<CalagopusSshKeyRecord | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateSshPublicKey(name, publicKey);
    if (errs.nameError || errs.keyError) {
      setErrors(errs);
      return;
    }
    const cleanName = name.trim();
    try {
      await Promise.resolve(onAddSshKey({ name: cleanName, publicKey: publicKey.trim() }));
      showToast({
        title: 'SSH key added',
        message: `${cleanName} is active for SFTP authentication.`,
        tone: 'success',
      });
      setCreateOpen(false);
      setName('');
      setPublicKey('');
      setErrors({});
    } catch {
      // Error surfaced by caller
    }
  };

  const columns: readonly TableColumn<CalagopusSshKeyRecord>[] = [
    {
      key: 'name',
      header: 'Key Label',
      render: (k) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--calagopus-text)]">{k.name}</p>
          <p className="truncate font-mono text-[12px] text-[var(--calagopus-text-secondary)] max-w-[320px]">
            {k.publicKeyPreview}
          </p>
        </div>
      ),
    },
    {
      key: 'fingerprint',
      header: 'SHA256 Fingerprint',
      render: (k) => (
        <span className="font-mono text-[12px] text-[var(--calagopus-text)]">{k.fingerprint}</span>
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
        title="SSH Public Keys"
        description="Register OpenSSH public keys for passwordless SFTP connections to Petalnodes servers."
        metadata={[`${sshKeys.length} registered keys`]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Add SSH Key
          </Button>
        }
      />

      <Card
        title="Registered Public Keys"
        description="Never paste private keys here — only share your public `.pub` key."
      >
        <DataTable
          caption="Account SSH Keys"
          columns={columns}
          rows={sshKeys}
          compact={compact}
          renderActions={(k) => (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remove SSH key ${k.name}`}
              leftIcon={<Trash2 className="h-3.5 w-3.5 text-[var(--calagopus-danger-text)]" />}
              onClick={async () => {
                if (confirmDestructive) {
                  setDeleteTarget(k);
                } else {
                  try {
                    await Promise.resolve(onDeleteSshKey(k.id));
                    showToast({
                      title: 'SSH key removed',
                      message: `${k.name} was deleted.`,
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
          )}
          emptyState={
            <EmptyState
              icon={<KeyRound className="h-5 w-5" />}
              title="No SSH keys registered"
              description="Add an Ed25519 or RSA public key for SFTP access."
              actionLabel="Add SSH Key"
              onAction={() => setCreateOpen(true)}
            />
          }
        />
      </Card>

      <ModalDialog
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add SSH Public Key"
        description="Paste an OpenSSH public key (ssh-ed25519 or ssh-rsa)."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Key Name"
            placeholder="e.g. Laptop Ed25519"
            required
            value={name}
            error={errors.nameError}
            onChange={(e) => {
              setName(e.currentTarget.value);
              setErrors((prev) => ({ ...prev, nameError: undefined }));
            }}
          />
          <Textarea
            label="Public Key"
            placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI..."
            rows={4}
            monospace
            required
            value={publicKey}
            error={errors.keyError}
            onChange={(e) => {
              setPublicKey(e.currentTarget.value);
              setErrors((prev) => ({ ...prev, keyError: undefined }));
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Key
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ConfirmDialog
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            try {
              await Promise.resolve(onDeleteSshKey(deleteTarget.id));
              showToast({
                title: 'SSH key removed',
                message: `${deleteTarget.name} was deleted.`,
                tone: 'success',
              });
            } catch {
              // Error surfaced by caller
            }
          }
          setDeleteTarget(null);
        }}
        title="Remove SSH Key"
        message={`Remove SSH key "${deleteTarget?.name}"? SFTP clients using this key will no longer authenticate.`}
        confirmLabel="Remove Key"
        destructive
      />
    </div>
  );
}
