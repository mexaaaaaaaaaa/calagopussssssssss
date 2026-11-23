import React from 'react';
import { Copy, Key, Plus, Trash2 } from 'lucide-react';
import {
  filterApiKeys,
  paginateSlice,
  validateApiKeyInput,
  type CalagopusApiKey,
} from '../api/calagopusCore';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState } from '../components/FeedbackStates';
import { Checkbox, SearchField, SelectDropdown, TextInput } from '../components/FormControls';
import { Pagination } from '../components/Navigation';
import { ConfirmDialog, ModalDialog, showToast } from '../components/Overlays';
import { Card, PageHeader, StatusBadge } from '../components/Surface';
import { sortRowsByKey, type SortDirection } from '../utils/themeHelpers';

export interface AccountApiKeysPageProps {
  apiKeys: readonly CalagopusApiKey[];
  onCreateKey: (input: {
    description: string;
    allowedIps: string[];
    permissions: string[];
  }) => Promise<{ key: CalagopusApiKey; secretToken: string }> | { key: CalagopusApiKey; secretToken: string };
  onRevokeKey: (keyId: string) => Promise<void> | void;
  compact?: boolean;
  confirmDestructive?: boolean;
}

const AVAILABLE_SCOPES = [
  { id: 'server.read', label: 'Read servers & allocations' },
  { id: 'control.power', label: 'Send server power actions' },
  { id: 'file.read', label: 'List & read files' },
  { id: 'file.write', label: 'Modify & upload files' },
  { id: 'backup.create', label: 'Create server backups' },
  { id: 'database.read', label: 'Read server databases' },
];

const PAGE_SIZE = 4;

export function AccountApiKeysPage({
  apiKeys,
  onCreateKey,
  onRevokeKey,
  compact = false,
  confirmDestructive = true,
}: AccountApiKeysPageProps) {
  const [query, setQuery] = React.useState('');
  const [scopeFilter, setScopeFilter] = React.useState('all');
  const [sortKey, setSortKey] = React.useState<keyof CalagopusApiKey & string>('createdAt');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [page, setPage] = React.useState(1);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const [allowedIpsRaw, setAllowedIpsRaw] = React.useState('');
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>(['server.read']);
  const [formErrors, setFormErrors] = React.useState<{
    description?: string;
    allowedIps?: string;
  }>({});
  const [revealedToken, setRevealedToken] = React.useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = React.useState<CalagopusApiKey | null>(null);

  const filtered = React.useMemo(
    () => filterApiKeys(apiKeys, query, scopeFilter),
    [apiKeys, query, scopeFilter],
  );

  const sorted = React.useMemo(
    () => sortRowsByKey(filtered, sortKey, sortDirection),
    [filtered, sortKey, sortDirection],
  );

  const { pageItems, safePage } = React.useMemo(
    () => paginateSlice(sorted, page, PAGE_SIZE),
    [sorted, page],
  );

  const handleSort = (key: keyof CalagopusApiKey & string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId],
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateApiKeyInput(description, allowedIpsRaw);
    if (validation.descriptionError || validation.allowedIpsError) {
      setFormErrors({
        description: validation.descriptionError,
        allowedIps: validation.allowedIpsError,
      });
      return;
    }

    try {
      const result = await Promise.resolve(
        onCreateKey({
          description: description.trim(),
          allowedIps: validation.parsedIps,
          permissions: selectedScopes.length > 0 ? selectedScopes : ['server.read'],
        }),
      );

      setRevealedToken(result.secretToken);
      setCreateOpen(false);
      setDescription('');
      setAllowedIpsRaw('');
      setSelectedScopes(['server.read']);
      setFormErrors({});
      showToast({
        title: 'API key created',
        message: `${result.key.identifier} is ready to copy.`,
        tone: 'success',
      });
    } catch {
      // Error surfaced by caller
    }
  };

  const columns: readonly TableColumn<CalagopusApiKey>[] = [
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (k) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--calagopus-text)]">{k.description}</p>
          <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)]">{k.identifier}</p>
        </div>
      ),
    },
    {
      key: 'permissions',
      header: 'Scopes',
      render: (k) => (
        <span className="text-[12px] text-[var(--calagopus-text-secondary)]">{k.permissions.join(', ')}</span>
      ),
    },
    {
      key: 'allowedIps',
      header: 'Allowed IPs',
      numeric: true,
      render: (k) => (
        <span className="font-mono text-[12px] text-[var(--calagopus-text)]">
          {k.allowedIps.length > 0 ? k.allowedIps.join(', ') : 'Any IP'}
        </span>
      ),
    },
    {
      key: 'lastUsedAt',
      header: 'Last Used',
      numeric: true,
      sortable: true,
      render: (k) => (
        <StatusBadge
          tone={k.lastUsedAt ? 'success' : 'neutral'}
          label={k.lastUsedAt ?? 'Never'}
          showIcon={false}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      numeric: true,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client API Keys"
        description="Create, scope, filter, and revoke personal Petalnodes client API tokens."
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Create API Key
          </Button>
        }
      />

      {revealedToken ? (
        <Card
          surface="tinted"
          title="Copy Your New Secret Token"
          description="For security, this secret token is shown once after creation."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="rounded-lg border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-surface)] px-3 py-2 font-mono text-[13px] text-[var(--calagopus-text)] break-all">
              {revealedToken}
            </code>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                onClick={() => {
                  void navigator.clipboard?.writeText(revealedToken);
                  showToast({ title: 'Secret token copied', tone: 'success' });
                }}
              >
                Copy Token
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRevealedToken(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card
        title="Active Credentials"
        description="Filter by description, token prefix, IP address, or permission scope."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <SearchField
                aria-label="Filter API keys"
                placeholder="Search by description, ptlc_ identifier, or IP..."
                value={query}
                onChange={(val) => {
                  setQuery(val);
                  setPage(1);
                }}
              />
            </div>
            <SelectDropdown
              aria-label="Filter by permission scope"
              value={scopeFilter}
              onChange={(val: string | null) => {
                setScopeFilter(val ?? 'all');
                setPage(1);
              }}
              data={[
                { value: 'all', label: 'All scopes' },
                ...AVAILABLE_SCOPES.map((s) => ({ value: s.id, label: s.id })),
              ]}
            />
          </div>

          <DataTable
            caption="Client API Keys"
            columns={columns}
            rows={pageItems}
            compact={compact}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            renderActions={(row) => (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="h-3.5 w-3.5 text-[var(--calagopus-danger-text)]" />}
                onClick={async () => {
                  if (confirmDestructive) {
                    setRevokeTarget(row);
                  } else {
                    try {
                      await Promise.resolve(onRevokeKey(row.id));
                      showToast({
                        title: 'API key revoked',
                        message: `${row.description} (${row.identifier}) was deleted.`,
                        tone: 'success',
                      });
                    } catch {
                      // Error surfaced by caller
                    }
                  }
                }}
              >
                Revoke
              </Button>
            )}
            emptyState={
              <EmptyState
                title="No matching API keys"
                description="Adjust your search filter or create a new API key."
                actionLabel="Create API Key"
                onAction={() => setCreateOpen(true)}
              />
            }
          />

          {sorted.length > 0 ? (
            <Pagination
              currentPage={safePage}
              totalItems={sorted.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      </Card>

      <ModalDialog
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Client API Key"
        description="Assign a descriptive label, optional IP allowlist, and granular scopes."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <TextInput
            label="Description"
            placeholder="e.g. GitHub Actions Deploy"
            required
            value={description}
            error={formErrors.description}
            onChange={(e) => {
              setDescription(e.currentTarget.value);
              setFormErrors((prev) => ({ ...prev, description: undefined }));
            }}
          />

          <TextInput
            label="Allowed IPs (optional)"
            placeholder="198.51.100.9, 192.0.2.0/24"
            description="Comma-separated IPv4 or CIDR blocks. Leave blank for any IP."
            value={allowedIpsRaw}
            error={formErrors.allowedIps}
            onChange={(e) => {
              setAllowedIpsRaw(e.currentTarget.value);
              setFormErrors((prev) => ({ ...prev, allowedIps: undefined }));
            }}
          />

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-[var(--calagopus-text)]">Permission Scopes</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
              {AVAILABLE_SCOPES.map((scope) => (
                <Checkbox
                  key={scope.id}
                  label={scope.label}
                  checked={selectedScopes.includes(scope.id)}
                  onChange={() => toggleScope(scope.id)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Key className="h-3.5 w-3.5" />}>
              Generate Key
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ConfirmDialog
        opened={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={async () => {
          if (revokeTarget) {
            try {
              await Promise.resolve(onRevokeKey(revokeTarget.id));
              showToast({
                title: 'API key revoked',
                message: `${revokeTarget.description} (${revokeTarget.identifier}) was deleted.`,
                tone: 'success',
              });
            } catch {
              // Error surfaced by caller
            }
          }
          setRevokeTarget(null);
        }}
        title="Revoke API Key"
        message={`Revoke "${revokeTarget?.description}" (${revokeTarget?.identifier})? Scripts using this token will immediately lose access.`}
        confirmLabel="Revoke Key"
        destructive
      />
    </div>
  );
}
