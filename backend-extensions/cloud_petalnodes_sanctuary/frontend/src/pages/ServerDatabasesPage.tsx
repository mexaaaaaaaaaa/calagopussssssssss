import React from 'react';
import { Copy, Database, Eye, EyeOff, KeyRound, Plus, Trash2 } from 'lucide-react';
import type { CalagopusServerDetail } from '../api/calagopusCore';
import {
  filterRecordsByText,
  validateConnectionsFrom,
  validateDatabaseName,
  type CalagopusDatabaseRecord,
} from '../api/calagopusModules';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState } from '../components/FeedbackStates';
import { SearchField, TextInput } from '../components/FormControls';
import { ConfirmDialog, ModalDialog, showToast } from '../components/Overlays';
import { Card, PageHeader } from '../components/Surface';

export interface ServerDatabasesPageProps {
  server: CalagopusServerDetail;
  databases: readonly CalagopusDatabaseRecord[];
  onCreateDatabase: (input: { name: string; connectionsFrom: string }) => Promise<void> | void;
  onRotatePassword: (databaseId: string) => Promise<void> | void;
  onDeleteDatabase: (databaseId: string) => Promise<void> | void;
  compact?: boolean;
  confirmDestructive?: boolean;
}

export function ServerDatabasesPage({
  server,
  databases,
  onCreateDatabase,
  onRotatePassword,
  onDeleteDatabase,
  compact = false,
  confirmDestructive = true,
}: ServerDatabasesPageProps) {
  const [query, setQuery] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [dbName, setDbName] = React.useState('');
  const [connectionsFrom, setConnectionsFrom] = React.useState('%');
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [hostError, setHostError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [revealedIds, setRevealedIds] = React.useState<string[]>([]);
  const [rotateTarget, setRotateTarget] = React.useState<CalagopusDatabaseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CalagopusDatabaseRecord | null>(null);

  const filtered = React.useMemo(
    () => filterRecordsByText(databases, query, (db) => [db.name, db.username, db.host]),
    [databases, query],
  );

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateDatabaseName(
      dbName,
      databases.map((d) => d.name),
    );
    const connErr = validateConnectionsFrom(connectionsFrom);
    if (err || connErr) {
      setNameError(err);
      setHostError(connErr);
      return;
    }
    setSubmitting(true);
    try {
      await Promise.resolve(
        onCreateDatabase({
          name: dbName.trim(),
          connectionsFrom: connectionsFrom.trim() || '%',
        }),
      );
      showToast({
        title: 'Database provisioned',
        message: `${dbName.trim()} is ready on ${server.name}.`,
        tone: 'success',
      });
      setCreateOpen(false);
      setDbName('');
      setConnectionsFrom('%');
      setNameError(null);
      setHostError(null);
    } catch {
      // Async error feedback is surfaced by the caller
    } finally {
      setSubmitting(false);
    }
  };

  const columns: readonly TableColumn<CalagopusDatabaseRecord>[] = [
    {
      key: 'name',
      header: 'Database',
      render: (db) => (
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-medium text-[var(--calagopus-text)]">{db.name}</p>
          <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">
            {db.host}:{db.port}
          </p>
        </div>
      ),
    },
    {
      key: 'username',
      header: 'Username',
      render: (db) => <span className="font-mono text-[12px] text-[var(--calagopus-text)]">{db.username}</span>,
    },
    {
      key: 'connectionsFrom',
      header: 'Allowed From',
      render: (db) => (
        <span className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">{db.connectionsFrom}</span>
      ),
    },
    {
      key: 'password',
      header: 'Password',
      render: (db) => {
        const revealed = revealedIds.includes(db.id);
        return (
          <div className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[12px] text-[var(--calagopus-text)]">
              {revealed ? db.password : '••••••••••••••••'}
            </span>
            <button
              type="button"
              aria-label={revealed ? `Hide password for ${db.name}` : `Reveal password for ${db.name}`}
              onClick={() => toggleReveal(db.id)}
              className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
            >
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              aria-label={`Copy password for ${db.name}`}
              onClick={() => {
                void navigator.clipboard?.writeText(db.password);
                showToast({ title: 'Password copied', message: db.name, tone: 'success' });
              }}
              className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Databases"
        description={`Provision and rotate MySQL / MariaDB credentials for ${server.name}.`}
        metadata={[`${databases.length} provisioned`, `Node ${server.node}`]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            New Database
          </Button>
        }
      />

      <Card
        title="Server Databases"
        description="Use your database host, username, and password in plugin configuration files."
        headerAction={
          <div className="w-full sm:w-64">
            <SearchField
              aria-label="Filter databases"
              placeholder="Search database or user..."
              value={query}
              onChange={setQuery}
            />
          </div>
        }
      >
        <DataTable
          caption="Server Databases"
          columns={columns}
          rows={filtered}
          compact={compact}
          renderActions={(db) => (
            <div className="inline-flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                onClick={() => setRotateTarget(db)}
              >
                Rotate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete database ${db.name}`}
                leftIcon={<Trash2 className="h-3.5 w-3.5 text-[var(--calagopus-danger-text)]" />}
                onClick={() => {
                  if (confirmDestructive) {
                    setDeleteTarget(db);
                  } else {
                    void Promise.resolve(onDeleteDatabase(db.id))
                      .then(() => {
                        showToast({
                          title: 'Database deleted',
                          message: `${db.name} was permanently dropped.`,
                          tone: 'success',
                        });
                      })
                      .catch(() => {});
                  }
                }}
              >
                Delete
              </Button>
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<Database className="h-5 w-5" />}
              title={query ? 'No matching databases' : 'No databases provisioned'}
              description={
                query
                  ? `No database matched "${query}".`
                  : 'Create a database instance to connect server plugins or web services.'
              }
              actionLabel={query ? 'Clear Filter' : 'New Database'}
              onAction={() => (query ? setQuery('') : setCreateOpen(true))}
            />
          }
        />
      </Card>

      <ModalDialog
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Database"
        description={`Provision a new database schema on ${server.name}.`}
        size="sm"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <TextInput
            label="Database Name"
            placeholder="e.g. s42_economy"
            required
            value={dbName}
            error={nameError ?? undefined}
            onChange={(e) => {
              setDbName(e.currentTarget.value);
              setNameError(null);
            }}
          />
          <TextInput
            label="Connections From"
            placeholder="%"
            description="Allowed source IPv4/CIDR pattern. Use % to allow any host."
            value={connectionsFrom}
            error={hostError ?? undefined}
            onChange={(e) => {
              setConnectionsFrom(e.currentTarget.value);
              setHostError(null);
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Create Database
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ConfirmDialog
        opened={rotateTarget !== null}
        onClose={() => setRotateTarget(null)}
        onConfirm={() => {
          const target = rotateTarget;
          setRotateTarget(null);
          if (target) {
            void Promise.resolve(onRotatePassword(target.id))
              .then(() => {
                showToast({
                  title: 'Password rotated',
                  message: `New credentials issued for ${target.name}.`,
                  tone: 'success',
                });
              })
              .catch(() => {});
          }
        }}
        title="Rotate Database Password"
        message={`Generate a new password for "${rotateTarget?.name}"? Existing plugin connections using the old password will fail until updated.`}
        confirmLabel="Rotate Password"
      />

      <ConfirmDialog
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) {
            void Promise.resolve(onDeleteDatabase(target.id))
              .then(() => {
                showToast({
                  title: 'Database deleted',
                  message: `${target.name} was permanently dropped.`,
                  tone: 'success',
                });
              })
              .catch(() => {});
          }
        }}
        title="Delete Database"
        message={`Permanently delete database "${deleteTarget?.name}" and all stored tables? This action cannot be undone.`}
        confirmLabel="Delete Database"
        destructive
      />
    </div>
  );
}
