import React from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Clock,
  Download,
  HardDrive,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { formatBytes, type CalagopusServerDetail } from '../api/calagopusCore';
import {
  computeBackupStorageBytes,
  validateBackupName,
  type CalagopusBackupRecord,
} from '../api/calagopusModules';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState } from '../components/FeedbackStates';
import { Checkbox, SearchField, SelectDropdown, Textarea, TextInput } from '../components/FormControls';
import { ConfirmDialog, ModalDialog, showToast } from '../components/Overlays';
import { StatCard } from '../components/StatCard';
import { Card, PageHeader, StatusBadge } from '../components/Surface';
import { hasPermission } from '../navigation/calagopusRoutes';
import {
  filterAndSortBackups,
  type BackupSortKey,
  type BackupStatusFilter,
} from '../utils/panelEnhancements';
import { computeBackupRetentionCandidates } from '../utils/petalnodesFeatures';
import type { SortDirection } from '../utils/themeHelpers';

export interface ServerBackupsPageProps {
  server: CalagopusServerDetail;
  backups: readonly CalagopusBackupRecord[];
  onCreateBackup: (input: { name: string; ignoredFiles: string; isLocked: boolean }) => Promise<void> | void;
  onToggleLock: (backupId: string) => Promise<void> | void;
  onRestoreBackup: (backupId: string) => Promise<void> | void;
  onDeleteBackup: (backupId: string) => Promise<void> | void;
  onDownloadBackup?: (backup: CalagopusBackupRecord) => Promise<void> | void;
  permissions?: readonly string[];
  isAdmin?: boolean;
  compact?: boolean;
  confirmDestructive?: boolean;
}

export function ServerBackupsPage({
  server,
  backups,
  onCreateBackup,
  onToggleLock,
  onRestoreBackup,
  onDeleteBackup,
  onDownloadBackup,
  permissions = ['*'],
  isAdmin = true,
  compact = false,
  confirmDestructive = true,
}: ServerBackupsPageProps) {
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<BackupStatusFilter>('all');
  const [sortKey, setSortKey] = React.useState<BackupSortKey>('createdAt');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  const [createOpen, setCreateOpen] = React.useState(false);
  const [backupName, setBackupName] = React.useState('');
  const [ignoredFiles, setIgnoredFiles] = React.useState('logs/*.gz, .cache/*');
  const [isLocked, setIsLocked] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);

  const [activeOperationLabel, setActiveOperationLabel] = React.useState<string | null>(null);
  const [retentionKeepCount, setRetentionKeepCount] = React.useState(3);
  const [restoreTarget, setRestoreTarget] = React.useState<CalagopusBackupRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CalagopusBackupRecord | null>(null);
  const [isMobileViewport, setIsMobileViewport] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);
    setIsMobileViewport(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const userCtx = React.useMemo(
    () => ({ isAdmin, permissions }),
    [isAdmin, permissions],
  );
  const canCreate = hasPermission(userCtx, 'backup.create');
  const canRestore = hasPermission(userCtx, 'backup.restore');
  const canDelete = hasPermission(userCtx, 'backup.delete');
  const canDownload = hasPermission(userCtx, 'backup.download');
  const canUpdate = hasPermission(userCtx, 'backup.update') || canCreate;

  const filtered = React.useMemo(
    () =>
      filterAndSortBackups(backups, {
        query,
        statusFilter,
        sortKey,
        sortDirection,
      }),
    [backups, query, statusFilter, sortKey, sortDirection],
  );

  const totalBytes = computeBackupStorageBytes(backups);
  const quotaBytes = Math.max(1, server.diskLimitMb * 1024 * 1024);
  const storagePct = Math.min(100, (totalBytes / quotaBytes) * 100);
  const verifiedCount = backups.filter((b) => b.isSuccessful).length;
  const lockedCount = backups.filter((b) => b.isLocked).length;

  const handleSort = (key: BackupSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    const err = validateBackupName(backupName);
    if (err) {
      setNameError(err);
      return;
    }
    const cleanName = backupName.trim();
    setActiveOperationLabel(`Creating backup snapshot "${cleanName}"...`);
    try {
      await Promise.resolve(
        onCreateBackup({
          name: cleanName,
          ignoredFiles: ignoredFiles.trim(),
          isLocked,
        }),
      );
      showToast({
        title: 'Backup created',
        message: `Snapshot "${cleanName}" queued and stored.`,
        tone: 'success',
      });
      setCreateOpen(false);
      setBackupName('');
      setIsLocked(false);
      setNameError(null);
    } catch {
      // Error surfaced by caller
    } finally {
      setActiveOperationLabel(null);
    }
  };

  const runRestoreBackup = async (target: CalagopusBackupRecord) => {
    if (!canRestore) return;
    setActiveOperationLabel(`Restoring "${target.name}" onto ${server.name}...`);
    try {
      await Promise.resolve(onRestoreBackup(target.id));
      showToast({
        title: 'Backup restore initiated',
        message: `Restoring ${target.name} onto ${server.name}.`,
        tone: 'warning',
      });
    } catch {
      // Error surfaced by caller
    } finally {
      setActiveOperationLabel(null);
    }
  };

  const renderActionButtons = (b: CalagopusBackupRecord) => (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <Button
        variant="secondary"
        size="sm"
        disabled={!canUpdate}
        aria-label={b.isLocked ? `Unlock ${b.name}` : `Lock ${b.name}`}
        leftIcon={
          b.isLocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />
        }
        onClick={() => {
          void Promise.resolve(onToggleLock(b.id))
            .then(() => {
              showToast({
                title: b.isLocked ? 'Backup unlocked' : 'Backup locked',
                message: b.name,
                tone: 'info',
              });
            })
            .catch(() => {});
        }}
      >
        {b.isLocked ? 'Unlock' : 'Lock'}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={!canRestore || activeOperationLabel !== null}
        leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
        onClick={() => {
          if (confirmDestructive) {
            setRestoreTarget(b);
          } else {
            void runRestoreBackup(b);
          }
        }}
      >
        Restore
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!canDownload}
        aria-label={`Download ${b.name}`}
        leftIcon={<Download className="h-3.5 w-3.5" />}
        onClick={() => {
          if (onDownloadBackup) {
            void Promise.resolve(onDownloadBackup(b)).catch(() => {});
          } else {
            showToast({
              title: 'Live panel required',
              message: `Signed backup archive downloads for ${b.uuidShort}.tar.gz require a live Calagopus daemon.`,
              tone: 'info',
            });
          }
        }}
      >
        Download
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={b.isLocked || !canDelete}
        aria-label={`Delete ${b.name}`}
        leftIcon={<Trash2 className="h-3.5 w-3.5 text-[var(--calagopus-danger-text)]" />}
        onClick={() => {
          if (confirmDestructive) {
            setDeleteTarget(b);
          } else {
            void Promise.resolve(onDeleteBackup(b.id))
              .then(() => {
                showToast({
                  title: 'Backup deleted',
                  message: `${b.name} was removed.`,
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
  );

  const columns: readonly TableColumn<CalagopusBackupRecord>[] = [
    {
      key: 'name',
      header: 'Backup',
      sortable: true,
      render: (b) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--calagopus-text)]">{b.name}</span>
            {b.isLocked ? <StatusBadge tone="pink" label="Locked" showIcon={false} /> : null}
          </div>
          <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">
            {b.uuidShort} · {b.checksum}
          </p>
        </div>
      ),
    },
    {
      key: 'bytes',
      header: 'Size',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (b) => formatBytes(b.bytes),
    },
    {
      key: 'createdAt',
      header: 'Created',
      numeric: true,
      sortable: true,
    },
    {
      key: 'isSuccessful',
      header: 'Status',
      sortable: true,
      render: (b) => (
        <StatusBadge
          tone={b.isSuccessful ? 'success' : 'danger'}
          label={b.isSuccessful ? 'Verified' : 'Failed'}
        />
      ),
    },
  ];

  const hasFilters = query.trim().length > 0 || statusFilter !== 'all';

  return (
    <div className="blush-page-enter space-y-6">
      <PageHeader
        title="Backups"
        description={`Create, lock, download, or restore point-in-time archives for ${server.name}.`}
        metadata={[`${backups.length} snapshots`, `${formatBytes(totalBytes)} total`]}
        actions={
          <Button
            variant="primary"
            size="sm"
            disabled={!canCreate}
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Create Backup
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Snapshots"
          value={backups.length}
          helper={`${verifiedCount} verified · ${backups.length - verifiedCount} failed`}
          icon={<Archive className="h-4 w-4" />}
        />
        <StatCard
          label="Backup Storage"
          value={formatBytes(totalBytes)}
          helper={`${storagePct.toFixed(1)}% of ${formatBytes(quotaBytes)} allocation`}
          progressPercent={storagePct}
          icon={<HardDrive className="h-4 w-4" />}
        />
        <StatCard
          label="Locked Archives"
          value={lockedCount}
          helper="Protected from rotation"
          icon={<Lock className="h-4 w-4" />}
        />
        <StatCard
          label="Latest Snapshot"
          value={backups[0] ? backups[0].createdAt.split(' ')[0] : 'None'}
          helper={
            backups[0]
              ? `${backups[0].name} · ${backups[0].createdAt.split(' ')[1] ?? ''}`
              : 'No backups created yet'
          }
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Backup Storage Distribution & Quota Visualization */}
      <Card padding="sm">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span className="font-medium text-[var(--calagopus-text)]">
              Backup Quota Utilization
            </span>
            <span className="font-mono text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
              {formatBytes(totalBytes)} / {formatBytes(quotaBytes)} ({storagePct.toFixed(1)}%)
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--calagopus-primary-soft)]"
            role="progressbar"
            aria-label="Backup storage utilization"
            aria-valuenow={Math.round(storagePct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--calagopus-primary)] blush-transition"
              style={{ width: `${Math.max(backups.length > 0 ? 3 : 0, storagePct)}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
            <span>
              Verified archives:{' '}
              <strong className="font-mono font-medium text-[var(--calagopus-text)]">
                {verifiedCount}
              </strong>{' '}
              · Protected:{' '}
              <strong className="font-mono font-medium text-[var(--calagopus-text)]">
                {lockedCount}
              </strong>
            </span>
            <span>Retention &amp; checksums reported directly from daemon metadata</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--calagopus-border)] pt-2.5 text-[12px]">
            <div className="flex flex-wrap items-center gap-2 text-[var(--calagopus-text-secondary)]">
              <span>Retention Policy Preview (keep newest unlocked):</span>
              <select
                aria-label="Retention keep count"
                value={retentionKeepCount}
                onChange={(e) => setRetentionKeepCount(Number(e.currentTarget.value))}
                className="rounded-md border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2 py-1 text-[12px] text-[var(--calagopus-text)]"
              >
                {[1, 2, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    Keep {n}
                  </option>
                ))}
              </select>
            </div>
            <span className="font-mono text-[var(--calagopus-text-secondary)]">
              {computeBackupRetentionCandidates(backups, retentionKeepCount).length} unlocked snapshot(s) eligible for rotation
            </span>
          </div>
        </div>
      </Card>

      {activeOperationLabel ? (
        <Card padding="sm">
          <div className="flex items-center gap-3 text-sm text-[var(--calagopus-text)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />
            <span className="font-medium">{activeOperationLabel}</span>
          </div>
        </Card>
      ) : null}

      <Card
        title="Backup Archives"
        description="Locked backups are protected from accidental deletion or automatic rotation."
        headerAction={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-48">
              <SearchField
                aria-label="Filter backups"
                placeholder="Search backups..."
                value={query}
                onChange={setQuery}
              />
            </div>

            <div className="w-full sm:w-32">
              <SelectDropdown
                aria-label="Filter backups by status"
                value={statusFilter}
                onChange={(val) => setStatusFilter((val as BackupStatusFilter) ?? 'all')}
                data={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'verified', label: 'Verified' },
                  { value: 'locked', label: 'Locked' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </div>

            <div className="w-full sm:w-36">
              <SelectDropdown
                aria-label="Sort backups by"
                value={sortKey}
                onChange={(val) => {
                  if (val) handleSort(val as BackupSortKey);
                }}
                data={[
                  { value: 'createdAt', label: 'Sort: Date' },
                  { value: 'name', label: 'Sort: Name' },
                  { value: 'bytes', label: 'Sort: Size' },
                  { value: 'isSuccessful', label: 'Sort: Status' },
                ]}
              />
            </div>

            <button
              type="button"
              aria-label={`Sort backups ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
              onClick={() => setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'))}
              className="blush-transition blush-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-primary-text)] cursor-pointer shrink-0"
            >
              {sortDirection === 'asc' ? (
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        }
      >
        {isMobileViewport ? (
          <div className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Archive className="h-5 w-5" />}
              title={hasFilters ? 'No matching backups' : 'No backups created yet'}
              description={
                hasFilters
                  ? 'Clear your search or status filter to inspect all server snapshots.'
                  : 'Create a snapshot before applying plugin updates or configuration changes.'
              }
              actionLabel={hasFilters ? 'Reset Filters' : canCreate ? 'Create Backup' : undefined}
              onAction={
                hasFilters || canCreate
                  ? () => {
                      if (hasFilters) {
                        setQuery('');
                        setStatusFilter('all');
                      } else if (canCreate) {
                        setCreateOpen(true);
                      }
                    }
                  : undefined
              }
            />
          ) : (
            filtered.map((b) => (
              <div
                key={`mobile-bkp-${b.id}`}
                className="rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3.5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--calagopus-text)] truncate">
                        {b.name}
                      </span>
                      {b.isLocked ? (
                        <StatusBadge tone="pink" label="Locked" showIcon={false} />
                      ) : null}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--calagopus-text-secondary)]">
                      {b.uuidShort} · {formatBytes(b.bytes)} · {b.createdAt}
                    </p>
                  </div>
                  <StatusBadge
                    tone={b.isSuccessful ? 'success' : 'danger'}
                    label={b.isSuccessful ? 'Verified' : 'Failed'}
                  />
                </div>
                <div className="pt-1 border-t border-[var(--calagopus-border)]">
                  {renderActionButtons(b)}
                </div>
              </div>
            ))
          )}
          </div>
        ) : (
          <DataTable
            caption="Server Backups"
            columns={columns}
            rows={filtered}
            compact={compact}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={(key) => handleSort(key as BackupSortKey)}
            renderActions={renderActionButtons}
            emptyState={
              <EmptyState
                icon={<Archive className="h-5 w-5" />}
                title={hasFilters ? 'No matching backups' : 'No backups created yet'}
                description={
                  hasFilters
                    ? 'Clear your search or status filter to inspect all server snapshots.'
                    : 'Create a snapshot before applying plugin updates or configuration changes.'
                }
                actionLabel={hasFilters ? 'Reset Filters' : canCreate ? 'Create Backup' : undefined}
                onAction={
                  hasFilters || canCreate
                    ? () => {
                        if (hasFilters) {
                          setQuery('');
                          setStatusFilter('all');
                        } else if (canCreate) {
                          setCreateOpen(true);
                        }
                      }
                    : undefined
                }
              />
            }
          />
        )}
      </Card>

      <ModalDialog
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Server Backup"
        description={`Snapshot container files from ${server.name}.`}
        size="sm"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <TextInput
            label="Backup Name"
            placeholder="e.g. Pre-1.21 Upgrade Snapshot"
            required
            value={backupName}
            error={nameError ?? undefined}
            onChange={(e) => {
              setBackupName(e.currentTarget.value);
              setNameError(null);
            }}
          />
          <Textarea
            label="Ignored Files & Directories"
            description="Glob patterns excluded from this archive (comma or newline separated)."
            value={ignoredFiles}
            onChange={(e) => setIgnoredFiles(e.currentTarget.value)}
          />
          <Checkbox
            label="Lock backup against automatic or manual deletion"
            checked={isLocked}
            onChange={(e) => setIsLocked(e.currentTarget.checked)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={activeOperationLabel !== null}>
              Create Backup
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ConfirmDialog
        opened={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => {
          const target = restoreTarget;
          setRestoreTarget(null);
          if (target) {
            void runRestoreBackup(target);
          }
        }}
        title="Restore Server Backup"
        message={`Restore "${restoreTarget?.name}"? Existing files modified after ${restoreTarget?.createdAt} may be overwritten during restoration.`}
        confirmLabel="Restore Archive"
        destructive
      />

      <ConfirmDialog
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) {
            void Promise.resolve(onDeleteBackup(target.id))
              .then(() => {
                showToast({
                  title: 'Backup deleted',
                  message: `${target.name} was removed.`,
                  tone: 'success',
                });
              })
              .catch(() => {});
          }
        }}
        title="Delete Backup"
        message={`Permanently delete backup "${deleteTarget?.name}" (${deleteTarget?.uuidShort})?`}
        confirmLabel="Delete Backup"
        destructive
      />
    </div>
  );
}
