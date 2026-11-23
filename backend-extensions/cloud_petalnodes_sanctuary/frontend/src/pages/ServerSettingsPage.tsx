import React from 'react';
import { Copy, RotateCcw, Save } from 'lucide-react';
import type { CalagopusServerDetail } from '../api/calagopusCore';
import { Button } from '../components/Button';
import { Textarea, TextInput } from '../components/FormControls';
import { ConfirmDialog, showToast } from '../components/Overlays';
import { Card, PageHeader } from '../components/Surface';

export interface ServerSettingsPageProps {
  server: CalagopusServerDetail;
  onRenameServer: (name: string, description: string) => Promise<void> | void;
  onReinstallServer: () => Promise<void> | void;
}

export function ServerSettingsPage({
  server,
  onRenameServer,
  onReinstallServer,
}: ServerSettingsPageProps) {
  const [name, setName] = React.useState(server.name);
  const [description, setDescription] = React.useState(server.description);
  const [reinstallOpen, setReinstallOpen] = React.useState(false);

  React.useEffect(() => {
    setName(server.name);
    setDescription(server.description);
  }, [server]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Server Settings"
        description={`Rename ${server.name}, inspect SFTP credentials, or run an egg reinstall.`}
        metadata={[server.uuidShort, server.node]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Server Details"
          description="Update the display name and description visible in your Petalnodes dashboard."
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              const cleanName = name.trim();
              try {
                await Promise.resolve(onRenameServer(cleanName, description.trim()));
                showToast({
                  title: 'Server details updated',
                  message: `Renamed instance to "${cleanName}".`,
                  tone: 'success',
                });
              } catch {
                // Error surfaced by caller
              }
            }}
            className="space-y-4"
          >
            <TextInput
              label="Server Name"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!name.trim()}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save Details
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card
            title="SFTP Access"
            description="Connect directly with your Petalnodes account password or SSH key."
          >
            <dl className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--calagopus-border)] pb-2.5">
                <dt className="text-[var(--calagopus-text-secondary)] shrink-0">SFTP Address</dt>
                <dd className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[12px] text-[var(--calagopus-text)]">
                  <span className="truncate">{`sftp://${server.sftpHost}:${server.sftpPort}`}</span>
                  <button
                    type="button"
                    aria-label="Copy SFTP URL"
                    onClick={() => {
                      const uri = `sftp://${server.sftpHost}:${server.sftpPort}`;
                      void navigator.clipboard?.writeText(uri);
                      showToast({ title: 'SFTP URL copied', message: uri, tone: 'success' });
                    }}
                    className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] shrink-0 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--calagopus-text-secondary)]">Username</dt>
                <dd className="font-mono text-[12px] text-[var(--calagopus-text)]">{server.sftpUsername}</dd>
              </div>
            </dl>
          </Card>

          <Card
            title="Reinstall Container"
            description="Re-run the egg installation script. Existing files are kept unless overwritten by the installer."
          >
            <Button
              variant="danger"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => setReinstallOpen(true)}
            >
              Reinstall Server
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        opened={reinstallOpen}
        onClose={() => setReinstallOpen(false)}
        onConfirm={async () => {
          try {
            await Promise.resolve(onReinstallServer());
            showToast({
              title: 'Reinstall started',
              message: `${server.name} is re-running its installation container.`,
              tone: 'warning',
            });
          } catch {
            // Error surfaced by caller
          }
          setReinstallOpen(false);
        }}
        title="Reinstall Server Container"
        message={`Reinstall ${server.name}? The server will stop and re-run its egg install script.`}
        confirmLabel="Reinstall"
        destructive
      />
    </div>
  );
}
