import React from 'react';
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Copy,
  FileCode2,
  Gamepad2,
  Palette,
  Plug,
  Puzzle,
  RefreshCw,
  Settings2,
  Terminal,
  Trash2,
  Upload,
} from 'lucide-react';
import type { CalagopusAdminExtension } from '../api/calagopusModules';
import type { CalagopusUserContext } from '../navigation/calagopusRoutes';
import {
  classifyAdminExtension,
  filterAdminExtensions,
  generateExtensionBuildLog,
  validateExtensionUploadFile,
  type ClassifiedExtension,
  type ExtensionCategory,
} from '../utils/panelEnhancements';
import { Button, IconButton } from '../components/Button';
import { EmptyState, ErrorState } from '../components/FeedbackStates';
import { SearchField, SelectDropdown, SwitchInput, TextInput } from '../components/FormControls';
import { ConfirmDialog, ModalDialog, showToast, Tooltip } from '../components/Overlays';
import { StatCard } from '../components/StatCard';
import { Card, PageHeader, StatusBadge } from '../components/Surface';

export interface ExtensionConfigValues {
  autoRebuildOnUpdate: boolean;
  customAccentHex?: string;
  endpointOrBranch?: string;
}

export interface AdminExtensionsPageProps {
  user: CalagopusUserContext;
  extensions: readonly CalagopusAdminExtension[];
  onToggleExtension: (identifier: string, nextStatus: 'active' | 'disabled') => Promise<void> | void;
  onInstallExtension: (file: File, parsedIdentifier: string, parsedName: string) => Promise<void> | void;
  onRemoveExtension: (identifier: string) => Promise<void> | void;
  onSaveExtensionConfig?: (identifier: string, values: ExtensionConfigValues) => Promise<void> | void;
  onRebuildExtensions?: () => Promise<void> | void;
  onNavigate: (path: string) => void;
  isLiveMode?: boolean;
  confirmDestructive?: boolean;
}

function getCategoryIcon(category: ExtensionCategory) {
  switch (category) {
    case 'Theme':
      return <Palette className="h-5 w-5" aria-hidden="true" />;
    case 'Minecraft':
      return <Gamepad2 className="h-5 w-5" aria-hidden="true" />;
    case 'Integrations':
      return <Plug className="h-5 w-5" aria-hidden="true" />;
    case 'Infrastructure':
    default:
      return <Box className="h-5 w-5" aria-hidden="true" />;
  }
}

function getCategoryIconContainerClass(category: ExtensionCategory): string {
  switch (category) {
    case 'Theme':
      return 'border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]';
    case 'Minecraft':
      return 'border-[var(--calagopus-success-border)] bg-[var(--calagopus-success-bg)] text-[var(--calagopus-success-text)]';
    case 'Integrations':
      return 'border-[var(--calagopus-warning-border)] bg-[var(--calagopus-warning-bg)] text-[var(--calagopus-warning-text)]';
    case 'Infrastructure':
    default:
      return 'border-[var(--calagopus-border-strong)] bg-[var(--calagopus-surface-secondary)] text-[var(--calagopus-text)]';
  }
}

const INSTALL_STAGES = [
  'Validating .c7s.zip archive integrity',
  'Inspecting Metadata.toml & Cargo.toml',
  'Staging backend Rust extension crate',
  'Registering frontend Vite module chunk',
] as const;

export function AdminExtensionsPage({
  user,
  extensions,
  onToggleExtension,
  onInstallExtension,
  onRemoveExtension,
  onSaveExtensionConfig,
  onRebuildExtensions,
  onNavigate,
  isLiveMode = false,
  confirmDestructive = true,
}: AdminExtensionsPageProps) {
  const [query, setQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<'all' | ExtensionCategory>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'disabled'>('all');

  const [configTarget, setConfigTarget] = React.useState<ClassifiedExtension | null>(null);
  const [configMap, setConfigMap] = React.useState<Record<string, ExtensionConfigValues>>({});
  const [autoRebuildDraft, setAutoRebuildDraft] = React.useState(true);
  const [accentDraft, setAccentDraft] = React.useState('#F4A6C1');
  const [endpointDraft, setEndpointDraft] = React.useState('');

  const [logsModalOpen, setLogsModalOpen] = React.useState(false);
  const [logsTarget, setLogsTarget] = React.useState<ClassifiedExtension | null>(null);
  const [logsSearch, setLogsSearch] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<ClassifiedExtension | null>(null);

  const [installOpen, setInstallOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [installError, setInstallError] = React.useState<string | null>(null);
  const [installStageIdx, setInstallStageIdx] = React.useState<number>(-1);
  const [rebuilding, setRebuilding] = React.useState(false);
  const [buildErrorBanner, setBuildErrorBanner] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const canAccessAdmin =
    user.isAdmin || user.permissions.some((p) => p.startsWith('admin.'));

  const classified = React.useMemo(
    () => extensions.map(classifyAdminExtension),
    [extensions],
  );

  const filtered = React.useMemo(
    () => filterAdminExtensions(classified, query, categoryFilter, statusFilter),
    [classified, query, categoryFilter, statusFilter],
  );

  const activeCount = classified.filter((e) => e.status === 'active').length;
  const disabledCount = classified.filter((e) => e.status !== 'active').length;

  if (!canAccessAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Extensions"
          description="Manage .c7s.zip themes and modules compiled into Calagopus."
        />
        <ErrorState
          title="Administrator permission required"
          description="Your current account does not hold administrative privileges for /admin/extensions."
          retryLabel="Return to Workspace"
          onRetry={() => onNavigate('/')}
        />
      </div>
    );
  }

  const openConfigureModal = (ext: ClassifiedExtension) => {
    const existing = configMap[ext.identifier];
    setConfigTarget(ext);
    setAutoRebuildDraft(existing?.autoRebuildOnUpdate ?? true);
    setAccentDraft(existing?.customAccentHex ?? '#F4A6C1');
    setEndpointDraft(
      existing?.endpointOrBranch ??
        (ext.identifier === 'cloud.petalnodes.sanctuary'
          ? 'https://panel.petalnodes.cloud'
          : 'stable'),
    );
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configTarget) return;
    const nextValues: ExtensionConfigValues = {
      autoRebuildOnUpdate: autoRebuildDraft,
      customAccentHex: accentDraft.trim(),
      endpointOrBranch: endpointDraft.trim(),
    };
    try {
      if (onSaveExtensionConfig) {
        await Promise.resolve(onSaveExtensionConfig(configTarget.identifier, nextValues));
      }
      setConfigMap((prev) => ({
        ...prev,
        [configTarget.identifier]: nextValues,
      }));
      showToast({
        title: 'Extension configuration saved',
        message: `Updated settings for ${configTarget.name}.`,
        tone: 'success',
      });
      setConfigTarget(null);
    } catch {
      // Error surfaced by caller
    }
  };

  const handleSelectUploadFile = (file: File) => {
    const err = validateExtensionUploadFile(file);
    if (err) {
      setInstallError(err);
      setSelectedFile(null);
      return;
    }
    setInstallError(null);
    setSelectedFile(file);
  };

  const handleRunInstall = async () => {
    if (!selectedFile) {
      setInstallError('Choose a .c7s.zip extension archive first.');
      return;
    }
    setInstallError(null);
    for (let i = 0; i < INSTALL_STAGES.length; i++) {
      setInstallStageIdx(i);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
    }

    const baseName = selectedFile.name
      .replace(/\.c7s\.zip$/i, '')
      .replace(/\.zip$/i, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const identifier = baseName.includes('.') ? baseName.toLowerCase() : `cloud.petalnodes.${baseName.toLowerCase()}`;
    const displayName = baseName
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    try {
      await Promise.resolve(
        onInstallExtension(selectedFile, identifier, displayName || 'Custom Extension'),
      );
      showToast({
        title: 'Extension staged',
        message: isLiveMode
          ? `${displayName} uploaded. Run panel-rs extensions apply to recompile.`
          : `${displayName} (${identifier}) staged in extension registry.`,
        tone: 'success',
      });
      setInstallOpen(false);
      setSelectedFile(null);
      setInstallStageIdx(-1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extension upload failed.';
      setInstallError(msg);
      setInstallStageIdx(-1);
    }
  };

  const handleRebuildAll = async () => {
    setRebuilding(true);
    setBuildErrorBanner(null);
    try {
      if (onRebuildExtensions) {
        await Promise.resolve(onRebuildExtensions());
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
      showToast({
        title: 'Extension workspace verified',
        message: isLiveMode
          ? 'Rebuild request dispatched to Calagopus panel.'
          : 'Cargo + Vite extension manifests validated. Run panel-rs extensions apply on VPS to compile.',
        tone: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extension rebuild failed.';
      setBuildErrorBanner(msg);
      showToast({
        title: 'Build failed',
        message: msg,
        tone: 'error',
      });
    } finally {
      setRebuilding(false);
    }
  };

  const activeLogsLines = React.useMemo(() => {
    const baseLines = logsTarget
      ? generateExtensionBuildLog(logsTarget)
      : classified.flatMap((ext) => generateExtensionBuildLog(ext));
    const q = logsSearch.trim().toLowerCase();
    return q ? baseLines.filter((line) => line.toLowerCase().includes(q)) : baseLines;
  }, [logsTarget, classified, logsSearch]);

  const handleCopyBuildLogs = async () => {
    const content = activeLogsLines.join('\n');
    try {
      await navigator.clipboard?.writeText(content);
      showToast({
        title: 'Build logs copied',
        message: `${activeLogsLines.length} lines copied to clipboard.`,
        tone: 'success',
      });
    } catch {
      showToast({
        title: 'Copy unavailable',
        message: 'Clipboard access was denied by browser.',
        tone: 'info',
      });
    }
  };

  const categories: readonly ('all' | ExtensionCategory)[] = [
    'all',
    'Theme',
    'Minecraft',
    'Integrations',
    'Infrastructure',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extensions"
        description="Install, configure, enable, and inspect build logs for .c7s.zip Calagopus extensions."
        metadata={[
          `${classified.length} installed`,
          `${activeCount} active`,
          'Calagopus >=1.1.0',
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Terminal className="h-4 w-4" />}
              onClick={() => {
                setLogsTarget(null);
                setLogsSearch('');
                setLogsModalOpen(true);
              }}
            >
              Build Logs
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={rebuilding}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void handleRebuildAll()}
            >
              Verify &amp; Apply
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={() => {
                setSelectedFile(null);
                setInstallError(null);
                setInstallStageIdx(-1);
                setInstallOpen(true);
              }}
            >
              Install Extension
            </Button>
          </>
        }
      />

      {buildErrorBanner ? (
        <ErrorState
          title="Extension build error"
          description={buildErrorBanner}
          retryLabel="Dismiss"
          onRetry={() => setBuildErrorBanner(null)}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Installed Extensions"
          value={classified.length}
          helper="Registered .c7s.zip modules"
          icon={<Puzzle className="h-4 w-4" />}
        />
        <StatCard
          label="Active Modules"
          value={activeCount}
          helper={
            classified.length > 0
              ? `${Math.round((activeCount / classified.length) * 100)}% enabled`
              : 'No modules'
          }
          progressPercent={
            classified.length > 0 ? (activeCount / classified.length) * 100 : 0
          }
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Disabled / Staged"
          value={disabledCount}
          helper="Rebuild panel binary after toggle"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Active Theme Crate"
          value="Petalnodes Sanctuary"
          helper="cloud.petalnodes.sanctuary · v2.1.0"
          icon={<Palette className="h-4 w-4" />}
        />
      </div>

      <Card
        title="Extension Registry"
        description="Each Calagopus extension compiles both its Rust backend crate and frontend React bundle."
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-1"
              role="tablist"
              aria-label="Filter extensions by category"
            >
              {categories.map((cat) => {
                const selected = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setCategoryFilter(cat)}
                    className={`blush-transition blush-focus-ring rounded-md px-3 py-1.5 text-[12px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-[var(--calagopus-surface)] text-[var(--calagopus-primary-text)] shadow-xs'
                        : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
                    }`}
                  >
                    {cat === 'all' ? 'All Categories' : cat}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-64">
                <SearchField
                  aria-label="Search extensions"
                  placeholder="Filter extensions..."
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <div className="w-full sm:w-36">
                <SelectDropdown
                  aria-label="Filter extensions by status"
                  value={statusFilter}
                  onChange={(val) =>
                    setStatusFilter((val as 'all' | 'active' | 'disabled') ?? 'all')
                  }
                  data={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'disabled', label: 'Disabled' },
                  ]}
                />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Puzzle className="h-5 w-5" />}
              title={
                query || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'No matching extensions'
                  : 'No extensions installed'
              }
              description={
                query || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Clear your search query or category filter to inspect all installed extensions.'
                  : 'Install a .c7s.zip extension archive to extend Calagopus.'
              }
              actionLabel={
                query || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Reset Filters'
                  : 'Install Extension'
              }
              onAction={() => {
                if (query || categoryFilter !== 'all' || statusFilter !== 'all') {
                  setQuery('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                } else {
                  setInstallOpen(true);
                }
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((ext) => {
                const isActive = ext.status === 'active';
                const isCoreTheme =
                  ext.identifier === 'cloud.petalnodes.sanctuary' ||
                  ext.identifier === 'io.calagopus.blush';
                return (
                  <article
                    key={ext.identifier}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-5 blush-transition hover:border-[var(--calagopus-primary-border)]"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${getCategoryIconContainerClass(
                              ext.category,
                            )}`}
                          >
                            {getCategoryIcon(ext.category)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-display text-[15px] font-semibold text-[var(--calagopus-text)] truncate">
                              {ext.name}
                            </h3>
                            <p className="mt-0.5 font-mono text-[12px] text-[var(--calagopus-text-secondary)] truncate">
                              {ext.identifier}
                            </p>
                          </div>
                        </div>

                        <StatusBadge
                          tone={isActive ? 'success' : 'neutral'}
                          label={isActive ? 'Active' : 'Disabled'}
                        />
                      </div>

                      <p className="text-[13px] text-[var(--calagopus-text-secondary)] leading-relaxed">
                        {ext.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--calagopus-text-secondary)]">
                        <span className="font-mono font-medium text-[var(--calagopus-text)]">
                          v{ext.version}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{ext.author}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ext.category}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--calagopus-border)] pt-3.5">
                      <SwitchInput
                        label={isActive ? 'Enabled' : 'Disabled'}
                        checked={isActive}
                        onChange={(checked) => {
                          const nextStatus = checked ? 'active' : 'disabled';
                          void Promise.resolve(onToggleExtension(ext.identifier, nextStatus))
                            .then(() => {
                              showToast({
                                title: checked ? 'Extension enabled' : 'Extension disabled',
                                message: `${ext.name} is now ${nextStatus}.`,
                                tone: checked ? 'success' : 'info',
                              });
                            })
                            .catch(() => {});
                        }}
                      />

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<FileCode2 className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setLogsTarget(ext);
                            setLogsSearch('');
                            setLogsModalOpen(true);
                          }}
                        >
                          Logs
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Settings2 className="h-3.5 w-3.5" />}
                          onClick={() => openConfigureModal(ext)}
                        >
                          Configure
                        </Button>
                        <Tooltip
                          label={
                            isCoreTheme
                              ? 'Active Petalnodes theme cannot be deleted while in use'
                              : `Remove ${ext.name}`
                          }
                        >
                          <IconButton
                            variant="ghost"
                            size="sm"
                            disabled={isCoreTheme}
                            aria-label={`Remove ${ext.name}`}
                            icon={
                              <Trash2
                                className={`h-4 w-4 ${
                                  isCoreTheme
                                    ? 'opacity-40'
                                    : 'text-[var(--calagopus-danger-text)]'
                                }`}
                              />
                            }
                            onClick={() => {
                              if (confirmDestructive) {
                                setDeleteTarget(ext);
                              } else {
                                void Promise.resolve(onRemoveExtension(ext.identifier)).catch(
                                  () => {},
                                );
                              }
                            }}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Extension Configure Modal */}
      <ModalDialog
        opened={configTarget !== null}
        onClose={() => setConfigTarget(null)}
        title={`Configure · ${configTarget?.name ?? ''}`}
        description={
          configTarget
            ? `${configTarget.identifier} · v${configTarget.version} by ${configTarget.author}`
            : undefined
        }
        size="md"
      >
        {configTarget ? (
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 text-[12px] text-[var(--calagopus-text-secondary)]">
              {isLiveMode
                ? 'Settings are dispatched to the live Calagopus extension configuration endpoint.'
                : 'Preview configuration is stored in local session state. On your VPS, run panel-rs extensions apply after modifying extension assets.'}
            </div>

            <TextInput
              label={
                configTarget.identifier === 'cloud.petalnodes.sanctuary' ||
                configTarget.identifier === 'io.calagopus.blush'
                  ? 'Panel Origin URL'
                  : 'Release Channel / Endpoint'
              }
              value={endpointDraft}
              onChange={(e) => setEndpointDraft(e.currentTarget.value)}
            />

            {configTarget.category === 'Theme' ? (
              <TextInput
                label="Primary Brand Accent (Hex)"
                value={accentDraft}
                onChange={(e) => setAccentDraft(e.currentTarget.value)}
                description="Petalnodes Blush signature baby-pink accent (#F4A6C1)."
              />
            ) : null}

            <SwitchInput
              label="Automatically queue extension rebuild on panel update"
              checked={autoRebuildDraft}
              onChange={setAutoRebuildDraft}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setConfigTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Configuration
              </Button>
            </div>
          </form>
        ) : null}
      </ModalDialog>

      {/* Install .c7s.zip Extension Modal */}
      <ModalDialog
        opened={installOpen}
        onClose={() => {
          if (installStageIdx === -1) setInstallOpen(false);
        }}
        title="Install Calagopus Extension"
        description="Upload a .c7s.zip extension archive (max 25 MiB) containing Metadata.toml, backend/, and frontend/."
        size="md"
      >
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.c7s.zip,application/zip"
            className="hidden"
            aria-label="Choose .c7s.zip extension archive"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              if (file) handleSelectUploadFile(file);
            }}
          />

          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--calagopus-border-strong)] bg-[var(--calagopus-surface-secondary)] px-6 py-8 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[var(--calagopus-text)]">
              {selectedFile ? selectedFile.name : 'Select a .c7s.zip package archive'}
            </p>
            <p className="mt-1 text-[12px] text-[var(--calagopus-text-secondary)]">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KiB ready for validation`
                : 'Supports Calagopus 1.1.0+ extension bundles (e.g. Petalnodes-Theme.zip.c7s)'}
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={installStageIdx !== -1}
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? 'Choose Another File' : 'Browse Archive'}
              </Button>
            </div>
          </div>

          {installError ? (
            <ErrorState title="Invalid archive" description={installError} />
          ) : null}

          {installStageIdx >= 0 ? (
            <div className="space-y-2 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-[var(--calagopus-text)]">
                  {INSTALL_STAGES[installStageIdx]}
                </span>
                <span className="font-mono text-[var(--calagopus-primary-text)] tabular-nums">
                  {Math.round(((installStageIdx + 1) / INSTALL_STAGES.length) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--calagopus-primary-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--calagopus-primary)] transition-all duration-200"
                  style={{
                    width: `${((installStageIdx + 1) / INSTALL_STAGES.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={installStageIdx !== -1}
              onClick={() => setInstallOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={installStageIdx !== -1}
              disabled={!selectedFile}
              onClick={() => void handleRunInstall()}
            >
              Upload &amp; Stage
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* Build Logs Viewer Modal */}
      <ModalDialog
        opened={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        title={
          logsTarget
            ? `Build Logs · ${logsTarget.name}`
            : 'Calagopus Extension Build Logs'
        }
        description={
          logsTarget
            ? `${logsTarget.identifier} · Cargo crate + Vite frontend output`
            : 'Combined Cargo and Vite/pnpm extension build trace'
        }
        size="lg"
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-64">
              <SearchField
                aria-label="Filter build logs"
                placeholder="Filter Cargo or Vite output..."
                value={logsSearch}
                onChange={setLogsSearch}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Copy className="h-3.5 w-3.5" />}
              onClick={() => void handleCopyBuildLogs()}
            >
              Copy Logs
            </Button>
          </div>

          <div
            role="log"
            aria-label="Extension build output"
            className="max-h-72 overflow-y-auto rounded-lg border border-[var(--calagopus-border)] bg-[#16141C] p-3.5 font-mono text-[12px] leading-relaxed text-[#F7F2F5]"
          >
            {activeLogsLines.length === 0 ? (
              <p className="text-[#B2AAB5]">No build log lines matched your filter.</p>
            ) : (
              activeLogsLines.map((line, idx) => (
                <div key={`${idx}-${line.slice(0, 12)}`} className="py-0.5 break-all">
                  {line}
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setLogsModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </ModalDialog>

      <ConfirmDialog
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) {
            void Promise.resolve(onRemoveExtension(target.identifier))
              .then(() => {
                showToast({
                  title: 'Extension removed',
                  message: `${target.name} (${target.identifier}) was uninstalled.`,
                  tone: 'success',
                });
              })
              .catch(() => {});
          }
        }}
        title="Uninstall Extension"
        message={`Remove ${deleteTarget?.name ?? 'this extension'} (${deleteTarget?.identifier ?? ''}) from the Calagopus extension registry? You will need to run panel-rs extensions apply to recompile the binary.`}
        confirmLabel="Remove Extension"
        destructive
      />
    </div>
  );
}
