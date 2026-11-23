import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Code2,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileCode2,
  FilePlus,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  MoreHorizontal,
  Package,
  Pencil,
  Plug,
  Save,
  ScrollText,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  filterFilesByQuery,
  formatBytes,
  normalizeDirectoryPath,
  paginateSlice,
  resolveDirectoryBreadcrumbs,
  sanitizeDownloadFilename,
  sortFiles,
  validateFileMode,
  validateFilename,
  type CalagopusFileEntry,
  type CalagopusServerDetail,
  type FileSortKey,
} from '../api/calagopusCore';
import { Button } from '../components/Button';
import { EmptyState } from '../components/FeedbackStates';
import { SearchField, TextInput } from '../components/FormControls';
import { Pagination } from '../components/Navigation';
import { ConfirmDialog, DropdownMenu, ModalDialog, showToast } from '../components/Overlays';
import { Card, StatusBadge } from '../components/Surface';
import { hasPermission } from '../navigation/calagopusRoutes';
import {
  classifyFileVisualKind,
  resolveSafeMoveTarget,
  tokenizeSyntaxLine,
  type SyntaxTokenKind,
} from '../utils/panelEnhancements';
import type { SortDirection } from '../utils/themeHelpers';

export interface ServerFilesPageProps {
  server: CalagopusServerDetail;
  files: readonly CalagopusFileEntry[];
  onCreateEntry: (directory: string, name: string, isDirectory: boolean) => Promise<void> | void;
  onSaveFileContent: (fileId: string, nextContent: string) => Promise<void> | void;
  onRenameEntry: (fileId: string, nextName: string) => Promise<void> | void;
  onMoveEntries?: (fileIds: readonly string[], destinationDirectory: string) => Promise<void> | void;
  onUpdatePermissions: (fileId: string, nextPermissions: string) => Promise<void> | void;
  onDeleteEntries: (fileIds: readonly string[]) => Promise<void> | void;
  onUploadFiles?: (directory: string, files: File[]) => Promise<void> | void;
  onDownloadFile?: (entry: CalagopusFileEntry) => Promise<void> | void;
  permissions?: readonly string[];
  isAdmin?: boolean;
  compact?: boolean;
  confirmDestructive?: boolean;
}

const PAGE_SIZE = 8;

function tokenColorClass(kind: SyntaxTokenKind): string {
  switch (kind) {
    case 'key':
      return 'text-[#F7BDD2] font-medium';
    case 'string':
      return 'text-[#A6D8B4]';
    case 'number':
      return 'text-[#C4B5FD]';
    case 'boolean':
      return 'text-[#F5C57A] font-medium';
    case 'comment':
      return 'text-[#9A90A2] italic';
    case 'punctuation':
      return 'text-[#C8B9C0]';
    case 'level-warn':
      return 'text-[#F5C57A]';
    case 'level-error':
      return 'text-[#F396A1]';
    case 'plain':
    default:
      return 'text-[#FFF8FA]';
  }
}

export function ServerFilesPage({
  server,
  files,
  onCreateEntry,
  onSaveFileContent,
  onRenameEntry,
  onMoveEntries,
  onUpdatePermissions,
  onDeleteEntries,
  onUploadFiles,
  onDownloadFile,
  permissions = ['*'],
  isAdmin = true,
  compact = false,
  confirmDestructive = true,
}: ServerFilesPageProps) {
  const fileUploadRef = React.useRef<HTMLInputElement | null>(null);
  const [currentDir, setCurrentDir] = React.useState('/');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortKey, setSortKey] = React.useState<FileSortKey>('name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
  const [page, setPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const [createMode, setCreateMode] = React.useState<'file' | 'folder' | null>(null);
  const [createName, setCreateName] = React.useState('');
  const [createError, setCreateError] = React.useState<string | null>(null);

  const [editingFile, setEditingFile] = React.useState<CalagopusFileEntry | null>(null);
  const [editorText, setEditorText] = React.useState('');
  const [initialEditorText, setInitialEditorText] = React.useState('');
  const [editorViewMode, setEditorViewMode] = React.useState<'edit' | 'highlight'>('edit');
  const [editorSaveState, setEditorSaveState] = React.useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false);

  const [renamingEntry, setRenamingEntry] = React.useState<CalagopusFileEntry | null>(null);
  const [renameText, setRenameText] = React.useState('');
  const [renameError, setRenameError] = React.useState<string | null>(null);

  const [moveTargets, setMoveTargets] = React.useState<CalagopusFileEntry[]>([]);
  const [moveDestDir, setMoveDestDir] = React.useState('/');
  const [moveError, setMoveError] = React.useState<string | null>(null);

  const [chmodEntry, setChmodEntry] = React.useState<CalagopusFileEntry | null>(null);
  const [chmodValue, setChmodValue] = React.useState('');
  const [chmodError, setChmodError] = React.useState<string | null>(null);

  const [deleteTargets, setDeleteTargets] = React.useState<CalagopusFileEntry[]>([]);
  const [sftpModalOpen, setSftpModalOpen] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploadState, setUploadState] = React.useState<{
    count: number;
    percent: number;
  } | null>(null);
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
  const canCreate = hasPermission(userCtx, 'file.create') || hasPermission(userCtx, 'file.write');
  const canUpdate = hasPermission(userCtx, 'file.update') || hasPermission(userCtx, 'file.write');
  const canDelete = hasPermission(userCtx, 'file.delete') || hasPermission(userCtx, 'file.write');
  const canReadContent = hasPermission(userCtx, 'file.read-content') || hasPermission(userCtx, 'file.read');
  const canSftp = hasPermission(userCtx, 'file.sftp');

  const dirEntries = React.useMemo(
    () => filterFilesByQuery(files, currentDir, searchQuery),
    [files, currentDir, searchQuery],
  );

  const sortedEntries = React.useMemo(
    () => sortFiles(dirEntries, sortKey, sortDirection),
    [dirEntries, sortKey, sortDirection],
  );

  const { pageItems, safePage } = React.useMemo(
    () => paginateSlice(sortedEntries, page, PAGE_SIZE),
    [sortedEntries, page],
  );

  const breadcrumbs = React.useMemo(
    () => resolveDirectoryBreadcrumbs(currentDir),
    [currentDir],
  );

  const existingNamesInDir = React.useMemo(
    () =>
      files
        .filter((f) => normalizeDirectoryPath(f.directory) === normalizeDirectoryPath(currentDir))
        .map((f) => f.name),
    [files, currentDir],
  );

  const availableDirectories = React.useMemo(() => {
    const dirs = new Set<string>(['/']);
    for (const f of files) {
      dirs.add(normalizeDirectoryPath(f.directory));
      if (f.isDirectory) {
        dirs.add(normalizeDirectoryPath(f.path));
      }
    }
    return [...dirs].sort();
  }, [files]);

  const diskUsedBytes = files.reduce((acc, f) => acc + (f.isDirectory ? 0 : f.sizeBytes), 0);
  const trashBytes = 4096;
  const totalLimitBytes = Math.max(1, server.diskLimitMb * 1024 * 1024);
  const diskPct = Math.min(100, ((diskUsedBytes + trashBytes) / totalLimitBytes) * 100);

  const changeDirectory = (nextDir: string) => {
    setCurrentDir(normalizeDirectoryPath(nextDir));
    setSelectedIds([]);
    setPage(1);
  };

  const toggleSort = (key: FileSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const allVisibleSelected =
    pageItems.length > 0 && pageItems.every((item) => selectedIds.includes(item.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const pageSet = new Set(pageItems.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)));
    } else {
      const next = new Set(selectedIds);
      for (const item of pageItems) next.add(item.id);
      setSelectedIds([...next]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleOpenEntry = (entry: CalagopusFileEntry) => {
    if (entry.isDirectory) {
      changeDirectory(entry.path);
      return;
    }
    if (!canReadContent) {
      showToast({
        title: 'Permission required',
        message: 'You do not have permission to open file contents.',
        tone: 'error',
      });
      return;
    }
    if (
      entry.content !== undefined ||
      entry.mimeType.startsWith('text/') ||
      entry.mimeType.includes('json') ||
      entry.mimeType.includes('yaml')
    ) {
      const content = entry.content ?? '';
      setEditingFile(entry);
      setEditorText(content);
      setInitialEditorText(content);
      setEditorViewMode('edit');
      setEditorSaveState('saved');
    } else {
      showToast({
        title: 'Binary file',
        message: `${entry.name} (${entry.mimeType}) cannot be edited inline. Use Download instead.`,
        tone: 'info',
      });
    }
  };

  const isEditorDirty = editingFile !== null && editorText !== initialEditorText;

  const saveCurrentEditor = React.useCallback(async () => {
    if (!editingFile || !canUpdate || editorSaveState === 'saving') return;
    setEditorSaveState('saving');
    try {
      await Promise.resolve(onSaveFileContent(editingFile.id, editorText));
      setInitialEditorText(editorText);
      setEditorSaveState('saved');
      showToast({
        title: 'File saved',
        message: `${editingFile.path} updated.`,
        tone: 'success',
      });
    } catch {
      setEditorSaveState('error');
    }
  }, [editingFile, canUpdate, editorSaveState, onSaveFileContent, editorText]);

  const requestCloseEditor = () => {
    if (isEditorDirty) {
      setDiscardConfirmOpen(true);
    } else {
      setEditingFile(null);
    }
  };

  const processUploadFileList = (selected: File[]) => {
    if (selected.length === 0 || !canCreate) return;
    setUploadState({ count: selected.length, percent: 25 });
    const timer = window.setInterval(() => {
      setUploadState((prev) =>
        prev ? { ...prev, percent: Math.min(90, prev.percent + 20) } : null,
      );
    }, 120);
    const uploadTask = onUploadFiles
      ? Promise.resolve(onUploadFiles(currentDir, selected))
      : Promise.all(selected.map((file) => onCreateEntry(currentDir, file.name, false)));
    void uploadTask
      .then(() => {
        window.clearInterval(timer);
        setUploadState({ count: selected.length, percent: 100 });
        window.setTimeout(() => setUploadState(null), 650);
        showToast({
          title: 'Files uploaded',
          message: `${selected.length} file(s) added to ${currentDir}.`,
          tone: 'success',
        });
      })
      .catch(() => {
        window.clearInterval(timer);
        setUploadState(null);
      });
  };

  const handleDownloadFile = async (entry: CalagopusFileEntry) => {
    if (onDownloadFile) {
      try {
        await Promise.resolve(onDownloadFile(entry));
      } catch {
        // Error surfaced by caller
      }
      return;
    }
    if (entry.content === undefined) {
      showToast({
        title: 'Live daemon required',
        message: `Binary downloads for ${entry.name} require a connected Calagopus panel node.`,
        tone: 'info',
      });
      return;
    }
    const safeName = sanitizeDownloadFilename(entry.name);
    const blob = new Blob([entry.content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast({ title: 'Download started', message: safeName, tone: 'success' });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateFilename(createName, existingNamesInDir);
    if (err) {
      setCreateError(err);
      return;
    }
    const targetName = createName.trim();
    const isDir = createMode === 'folder';
    try {
      await Promise.resolve(onCreateEntry(currentDir, targetName, isDir));
      showToast({
        title: isDir ? 'Folder created' : 'File created',
        message: `${targetName} in ${currentDir}`,
        tone: 'success',
      });
      setCreateMode(null);
      setCreateName('');
      setCreateError(null);
    } catch {
      // Error surfaced by caller
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingEntry) return;
    const otherNames = existingNamesInDir.filter(
      (n) => n.toLowerCase() !== renamingEntry.name.toLowerCase(),
    );
    const err = validateFilename(renameText, otherNames);
    if (err) {
      setRenameError(err);
      return;
    }
    const nextName = renameText.trim();
    try {
      await Promise.resolve(onRenameEntry(renamingEntry.id, nextName));
      showToast({
        title: 'Renamed successfully',
        message: `${renamingEntry.name} -> ${nextName}`,
        tone: 'success',
      });
      setRenamingEntry(null);
      setRenameError(null);
    } catch {
      // Error surfaced by caller
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (moveTargets.length === 0 || !onMoveEntries) return;
    const sample = resolveSafeMoveTarget(moveDestDir, moveTargets[0].name);
    if ('error' in sample) {
      setMoveError(sample.error);
      return;
    }
    try {
      await Promise.resolve(
        onMoveEntries(
          moveTargets.map((t) => t.id),
          sample.directory,
        ),
      );
      showToast({
        title: 'Moved entries',
        message: `${moveTargets.length} item(s) moved to ${sample.directory}.`,
        tone: 'success',
      });
      setSelectedIds([]);
      setMoveTargets([]);
      setMoveError(null);
    } catch {
      // Surfacing handled by caller
    }
  };

  const renderSortIcon = (key: FileSortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 opacity-55" aria-hidden="true" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)]" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)]" aria-hidden="true" />
    );
  };

  const renderFileIcon = (entry: CalagopusFileEntry) => {
    const visualKind = classifyFileVisualKind(entry.name, entry.isDirectory);
    switch (visualKind) {
      case 'folder':
        return <Folder className="h-4 w-4 text-[var(--calagopus-warning)] shrink-0" aria-hidden="true" />;
      case 'jar':
        return <Package className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />;
      case 'archive':
        return <FileArchive className="h-4 w-4 text-[var(--calagopus-warning-text)] shrink-0" aria-hidden="true" />;
      case 'code':
        return <FileCode2 className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0" aria-hidden="true" />;
      case 'log':
        return <ScrollText className="h-4 w-4 text-[var(--calagopus-success-text)] shrink-0" aria-hidden="true" />;
      case 'text':
      default:
        return <FileText className="h-4 w-4 text-[var(--calagopus-text-secondary)] shrink-0" aria-hidden="true" />;
    }
  };

  const triggerDeletePromptOrDirect = (targets: CalagopusFileEntry[]) => {
    if (!canDelete || targets.length === 0) return;
    if (confirmDestructive) {
      setDeleteTargets(targets);
    } else {
      const ids = targets.map((t) => t.id);
      void Promise.resolve(onDeleteEntries(ids))
        .then(() => {
          setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
          showToast({
            title: 'Deleted',
            message:
              targets.length === 1
                ? `Removed ${targets[0]?.name}`
                : `Removed ${targets.length} entries`,
            tone: 'success',
          });
        })
        .catch(() => {});
    }
  };

  const editorLines = React.useMemo(() => editorText.split('\n'), [editorText]);

  return (
    <div
      className="blush-page-enter space-y-5 relative"
      onDragOver={(e) => {
        if (!canCreate) return;
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (!canCreate) return;
        const dropped = Array.from(e.dataTransfer?.files ?? []);
        processUploadFileList(dropped);
      }}
    >
      {isDragOver ? (
        <div
          className="pointer-events-none fixed inset-4 z-40 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--calagopus-primary)] bg-[var(--calagopus-surface)]/90 backdrop-blur-xs"
          aria-live="polite"
        >
          <Upload className="h-9 w-9 text-[var(--calagopus-primary-text)] mb-2" aria-hidden="true" />
          <p className="font-display text-lg font-semibold text-[var(--calagopus-text)]">
            Drop files to upload to {currentDir}
          </p>
          <p className="mt-1 text-sm text-[var(--calagopus-text-secondary)]">
            Files remain scoped inside your authorized server directory.
          </p>
        </div>
      ) : null}

      {/* Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[var(--calagopus-text)]">
            Files
          </h1>
          <p className="mt-1 text-sm text-[var(--calagopus-text-secondary)]">
            Manage container filesystem entries, edit config syntax, and inspect storage quota.
          </p>
        </div>

        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2 sm:shrink-0">
          <input
            ref={fileUploadRef}
            type="file"
            multiple
            className="hidden"
            aria-label="Upload files to current directory"
            onChange={(e) => {
              const selected = Array.from(e.currentTarget.files ?? []);
              e.currentTarget.value = '';
              processUploadFileList(selected);
            }}
          />

          <Button
            variant="secondary"
            size="sm"
            disabled={!canCreate}
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => fileUploadRef.current?.click()}
          >
            Upload
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={!canSftp}
            leftIcon={<Plug className="h-4 w-4" />}
            onClick={() => setSftpModalOpen(true)}
          >
            SFTP Connect
          </Button>

          <DropdownMenu
            label="Create in current path"
            trigger={
              <Button variant="primary" size="sm" disabled={!canCreate} leftIcon={<FilePlus className="h-4 w-4" />}>
                New
              </Button>
            }
            items={[
              {
                id: 'new-file',
                label: 'New File',
                disabled: !canCreate,
                icon: <FilePlus className="h-4 w-4 text-[var(--calagopus-primary-text)]" />,
                onSelect: () => {
                  setCreateMode('file');
                  setCreateName('');
                  setCreateError(null);
                },
              },
              {
                id: 'new-folder',
                label: 'New Folder',
                disabled: !canCreate,
                icon: <FolderPlus className="h-4 w-4 text-[var(--calagopus-primary-text)]" />,
                onSelect: () => {
                  setCreateMode('folder');
                  setCreateName('');
                  setCreateError(null);
                },
              },
            ]}
          />
        </div>
      </div>

      {uploadState ? (
        <Card padding="sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-[var(--calagopus-text)]">
                Uploading {uploadState.count} file(s) to {currentDir}...
              </span>
              <span className="font-mono text-[var(--calagopus-primary-text)] tabular-nums">
                {uploadState.percent}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-[var(--calagopus-primary-soft)]"
              role="progressbar"
              aria-label="File upload progress"
              aria-valuenow={uploadState.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[var(--calagopus-primary)] transition-all duration-150"
                style={{ width: `${uploadState.percent}%` }}
              />
            </div>
          </div>
        </Card>
      ) : null}

      {/* Disk Usage Card */}
      <Card padding="sm">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span className="font-medium text-[var(--calagopus-text)]">Disk Usage</span>
            <span className="font-mono text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
              {formatBytes(diskUsedBytes + trashBytes)} of {formatBytes(totalLimitBytes)} used (
              {diskPct.toFixed(1)}%)
            </span>
          </div>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[var(--calagopus-primary-soft)]"
            role="progressbar"
            aria-label="Container disk usage"
            aria-valuenow={Math.round(diskPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--calagopus-primary)] blush-transition"
              style={{ width: `${Math.max(2, diskPct)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--calagopus-primary)]" aria-hidden="true" />
                Files <strong className="font-mono font-medium text-[var(--calagopus-text)]">{formatBytes(diskUsedBytes)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--calagopus-text-secondary)]" aria-hidden="true" />
                Trash <strong className="font-mono font-medium text-[var(--calagopus-text)]">{formatBytes(trashBytes)}</strong>
              </span>
            </div>
            <span className="text-[11px]">Tip: Drag and drop files anywhere onto this page to upload</span>
          </div>
        </div>
      </Card>

      {/* Path Breadcrumbs + Live Search Strip */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Directory path" className="flex flex-wrap items-center gap-1 text-[13px]">
            <span className="text-[var(--calagopus-text-secondary)] font-mono">/home/</span>
            {breadcrumbs.map((crumb, idx) => {
              const isCurrent = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.path}>
                  {idx > 0 ? <span className="text-[var(--calagopus-border-strong)] font-mono">/</span> : null}
                  {isCurrent ? (
                    <span className="rounded-md bg-[var(--calagopus-primary-soft)] px-2 py-0.5 font-mono font-medium text-[var(--calagopus-primary-text)]">
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => changeDirectory(crumb.path)}
                      className="blush-focus-ring rounded-md px-1.5 py-0.5 font-mono text-[var(--calagopus-text)] hover:bg-[var(--calagopus-primary-subtle)] cursor-pointer"
                    >
                      {crumb.label}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="w-full sm:w-64">
            <SearchField
              aria-label="Search files in current directory"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      {/* Multi-File Bulk Action Bar */}
      {selectedIds.length > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-subtle)] px-4 py-2.5"
          role="region"
          aria-label="Bulk file selection actions"
        >
          <span className="text-sm font-medium text-[var(--calagopus-primary-text)] tabular-nums">
            {selectedIds.length} item(s) selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {onMoveEntries && canUpdate ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FolderInput className="h-3.5 w-3.5" />}
                onClick={() => {
                  const targets = files.filter((f) => selectedIds.includes(f.id));
                  setMoveTargets(targets);
                  setMoveDestDir(currentDir);
                  setMoveError(null);
                }}
              >
                Move Selected
              </Button>
            ) : null}
            <Button
              variant="danger"
              size="sm"
              disabled={!canDelete}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => {
                const targets = files.filter((f) => selectedIds.includes(f.id));
                triggerDeletePromptOrDirect(targets);
              }}
            >
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<X className="h-3.5 w-3.5" />}
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {/* Sortable File Listing */}
      {sortedEntries.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matching files' : 'Directory is empty'}
          description={
            searchQuery
              ? `No files or folders matched "${searchQuery}" in ${currentDir}.`
              : 'Create a new file, create a folder, or drop files to upload into this directory.'
          }
          actionLabel={searchQuery ? 'Clear Search' : canCreate ? 'New File' : undefined}
          onAction={
            searchQuery || canCreate
              ? () => {
                  if (searchQuery) {
                    setSearchQuery('');
                  } else if (canCreate) {
                    setCreateMode('file');
                  }
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {isMobileViewport ? (
            <div className="space-y-2.5">
            {pageItems.map((entry) => {
              const checked = selectedIds.includes(entry.id);
              return (
                <div
                  key={`mobile-${entry.id}`}
                  className="rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        aria-label={`Select ${entry.name}`}
                        checked={checked}
                        onChange={() => toggleSelectOne(entry.id)}
                        className="h-4 w-4 rounded border-[var(--calagopus-border-strong)] accent-[#F4A6C1] cursor-pointer shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => handleOpenEntry(entry)}
                        className="blush-focus-ring inline-flex items-center gap-2 text-left font-medium text-[var(--calagopus-text)] hover:text-[var(--calagopus-primary-text)] truncate cursor-pointer"
                      >
                        {renderFileIcon(entry)}
                        <span className="truncate">{entry.name}</span>
                      </button>
                    </div>
                    <DropdownMenu
                      trigger={
                        <button
                          type="button"
                          aria-label={`Actions for ${entry.name}`}
                          className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] cursor-pointer shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </button>
                      }
                      items={[
                        ...(!entry.isDirectory
                          ? [
                              {
                                id: 'edit',
                                label: 'Edit Content',
                                disabled: !canReadContent,
                                icon: <FileCode2 className="h-4 w-4 text-[var(--calagopus-primary-text)]" />,
                                onSelect: () => handleOpenEntry(entry),
                              },
                              {
                                id: 'download',
                                label: 'Download',
                                icon: <Download className="h-4 w-4 text-[var(--calagopus-text-secondary)]" />,
                                onSelect: () => handleDownloadFile(entry),
                              },
                            ]
                          : []),
                        ...(onMoveEntries && canUpdate
                          ? [
                              {
                                id: 'move',
                                label: 'Move',
                                icon: <FolderInput className="h-4 w-4 text-[var(--calagopus-text-secondary)]" />,
                                onSelect: () => {
                                  setMoveTargets([entry]);
                                  setMoveDestDir(currentDir);
                                  setMoveError(null);
                                },
                              },
                            ]
                          : []),
                        {
                          id: 'rename',
                          label: 'Rename',
                          disabled: !canUpdate,
                          icon: <Pencil className="h-4 w-4 text-[var(--calagopus-text-secondary)]" />,
                          onSelect: () => {
                            setRenamingEntry(entry);
                            setRenameText(entry.name);
                            setRenameError(null);
                          },
                        },
                        {
                          id: 'delete',
                          label: 'Delete',
                          disabled: !canDelete,
                          icon: <Trash2 className="h-4 w-4 text-[var(--calagopus-danger-text)]" />,
                          danger: true,
                          onSelect: () => triggerDeletePromptOrDirect([entry]),
                        },
                      ]}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pl-6 font-mono text-[11px] text-[var(--calagopus-text-secondary)] tabular-nums">
                    <span>{formatBytes(entry.sizeBytes)}</span>
                    <span>·</span>
                    <span>{entry.permissions}</span>
                    <span>·</span>
                    <span>{entry.modifiedAt}</span>
                  </div>
                </div>
              );
            })}
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)]">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <caption className="sr-only">Server Container Files</caption>
              <thead>
                <tr className="border-b border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)]">
                  <th scope="col" className={`w-10 ${compact ? 'px-3.5 py-2' : 'px-4 py-3'}`}>
                    <input
                      type="checkbox"
                      aria-label="Select all visible files"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-[var(--calagopus-border-strong)] accent-[#F4A6C1] cursor-pointer"
                    />
                  </th>
                  <th
                    scope="col"
                    className={`${compact ? 'px-3.5 py-2' : 'px-4 py-3'} text-[12px] font-medium text-[var(--calagopus-text-secondary)]`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="blush-focus-ring inline-flex items-center gap-1.5 hover:text-[var(--calagopus-text)] cursor-pointer"
                    >
                      <span>Name</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className={`${compact ? 'px-3.5 py-2' : 'px-4 py-3'} text-[12px] font-medium text-[var(--calagopus-text-secondary)]`}
                  >
                    Mode
                  </th>
                  <th
                    scope="col"
                    className={`${compact ? 'px-3.5 py-2' : 'px-4 py-3'} text-right text-[12px] font-medium text-[var(--calagopus-text-secondary)]`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('sizeBytes')}
                      className="blush-focus-ring inline-flex flex-row-reverse items-center gap-1.5 hover:text-[var(--calagopus-text)] cursor-pointer"
                    >
                      <span>Size</span>
                      {renderSortIcon('sizeBytes')}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className={`${compact ? 'px-3.5 py-2' : 'px-4 py-3'} text-right text-[12px] font-medium text-[var(--calagopus-text-secondary)]`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('modifiedEpoch')}
                      className="blush-focus-ring inline-flex flex-row-reverse items-center gap-1.5 hover:text-[var(--calagopus-text)] cursor-pointer"
                    >
                      <span>Modified</span>
                      {renderSortIcon('modifiedEpoch')}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className={`${compact ? 'px-3.5 py-2' : 'px-4 py-3'} text-right text-[12px] font-medium text-[var(--calagopus-text-secondary)]`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--calagopus-border)]">
                {pageItems.map((entry) => {
                  const checked = selectedIds.includes(entry.id);
                  const cellPad = compact ? 'px-3.5 py-2' : 'px-4 py-3';

                  return (
                    <tr key={entry.id} className="blush-transition hover:bg-[var(--calagopus-primary-subtle)]">
                      <td className={cellPad}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${entry.name}`}
                          checked={checked}
                          onChange={() => toggleSelectOne(entry.id)}
                          className="h-4 w-4 rounded border-[var(--calagopus-border-strong)] accent-[#F4A6C1] cursor-pointer"
                        />
                      </td>
                      <td className={cellPad}>
                        <button
                          type="button"
                          onClick={() => handleOpenEntry(entry)}
                          className="blush-focus-ring inline-flex items-center gap-2.5 text-left font-medium text-[var(--calagopus-text)] hover:text-[var(--calagopus-primary-text)] cursor-pointer"
                        >
                          {renderFileIcon(entry)}
                          <span>{entry.name}</span>
                        </button>
                      </td>
                      <td className={`${cellPad} font-mono text-[12px] text-[var(--calagopus-text-secondary)]`}>
                        {entry.permissions}
                      </td>
                      <td className={`${cellPad} text-right font-mono text-[13px] text-[var(--calagopus-text)] tabular-nums`}>
                        {formatBytes(entry.sizeBytes)}
                      </td>
                      <td className={`${cellPad} text-right font-mono text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums`}>
                        {entry.modifiedAt}
                      </td>
                      <td className={`${cellPad} text-right`}>
                        <DropdownMenu
                          trigger={
                            <button
                              type="button"
                              aria-label={`Actions for ${entry.name}`}
                              className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-border)] hover:bg-[var(--calagopus-surface)] hover:text-[var(--calagopus-text)] cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            </button>
                          }
                          items={[
                            ...(!entry.isDirectory
                              ? [
                                  {
                                    id: 'edit',
                                    label: 'Edit Content',
                                    disabled: !canReadContent,
                                    icon: <FileCode2 className="h-4 w-4 text-[var(--calagopus-primary-text)]" />,
                                    onSelect: () => handleOpenEntry(entry),
                                  },
                                  {
                                    id: 'download',
                                    label: 'Download',
                                    icon: <Download className="h-4 w-4 text-[var(--calagopus-text-secondary)]" />,
                                    onSelect: () => handleDownloadFile(entry),
                                  },
                                ]
                              : []),
                            {
                              id: 'rename',
                              label: 'Rename',
                              disabled: !canUpdate,
                              icon: <Pencil className="h-4 w-4 text-[var(--calagopus-text-secondary)]" />,
                              onSelect: () => {
                                setRenamingEntry(entry);
                                setRenameText(entry.name);
                                setRenameError(null);
                              },
                            },
                            ...(onMoveEntries && canUpdate
                              ? [
                                  {
                                    id: 'move',
                                    label: 'Move',
                                    icon: <FolderInput className="h-4 w-4 text-[var(--calagopus-text-secondary)]" />,
                                    onSelect: () => {
                                      setMoveTargets([entry]);
                                      setMoveDestDir(currentDir);
                                      setMoveError(null);
                                    },
                                  },
                                ]
                              : []),
                            {
                              id: 'permissions',
                              label: 'Permissions',
                              disabled: !canUpdate,
                              icon: <Shield className="h-4 w-4 text-[var(--calagopus-text-secondary)]" />,
                              onSelect: () => {
                                setChmodEntry(entry);
                                setChmodValue(entry.permissions);
                                setChmodError(null);
                              },
                            },
                            {
                              id: 'delete',
                              label: 'Delete',
                              disabled: !canDelete,
                              icon: <Trash2 className="h-4 w-4 text-[var(--calagopus-danger-text)]" />,
                              danger: true,
                              onSelect: () => triggerDeletePromptOrDirect([entry]),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          <Pagination
            currentPage={safePage}
            totalItems={sortedEntries.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* New File / Folder Modal */}
      <ModalDialog
        opened={createMode !== null}
        onClose={() => setCreateMode(null)}
        title={createMode === 'folder' ? 'Create New Folder' : 'Create New File'}
        description={`Target path: ${currentDir}`}
        size="sm"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <TextInput
            label={createMode === 'folder' ? 'Folder Name' : 'File Name'}
            placeholder={createMode === 'folder' ? 'e.g. backups-local' : 'e.g. motd.txt'}
            required
            value={createName}
            error={createError ?? undefined}
            onChange={(e) => {
              setCreateName(e.currentTarget.value);
              setCreateError(null);
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setCreateMode(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* Redesigned Syntax-Highlighted File Content Editor Modal */}
      <ModalDialog
        opened={editingFile !== null}
        onClose={requestCloseEditor}
        title={editingFile ? `Editing ${editingFile.name}` : 'File Editor'}
        description={editingFile?.path}
        size="xl"
      >
        <div
          className="space-y-3"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
              e.preventDefault();
              void saveCurrentEditor();
            }
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex items-center rounded-md border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] p-0.5"
                role="group"
                aria-label="Editor view mode"
              >
                <button
                  type="button"
                  onClick={() => setEditorViewMode('edit')}
                  aria-pressed={editorViewMode === 'edit'}
                  className={`blush-focus-ring inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    editorViewMode === 'edit'
                      ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
                      : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Edit Source</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorViewMode('highlight')}
                  aria-pressed={editorViewMode === 'highlight'}
                  className={`blush-focus-ring inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    editorViewMode === 'highlight'
                      ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
                      : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Syntax Preview</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-[var(--calagopus-text-secondary)] tabular-nums">
                {editorLines.length} lines · {formatBytes(new Blob([editorText]).size)}
              </span>
            </div>

            <StatusBadge
              tone={
                editorSaveState === 'saving'
                  ? 'pink'
                  : editorSaveState === 'error'
                    ? 'danger'
                    : isEditorDirty
                      ? 'warning'
                      : 'success'
              }
              label={
                editorSaveState === 'saving'
                  ? 'Saving...'
                  : editorSaveState === 'error'
                    ? 'Save failed'
                    : isEditorDirty
                      ? 'Unsaved changes'
                      : 'Saved'
              }
            />
          </div>

          {editorViewMode === 'edit' ? (
            <div className="flex overflow-hidden rounded-xl border border-[var(--calagopus-border)] bg-[#17151E]">
              <div
                aria-hidden="true"
                className="select-none border-r border-[#2C283A] bg-[#13111A] px-2.5 py-3 text-right font-mono text-[12px] leading-relaxed text-[#7E768A] tabular-nums"
              >
                {editorLines.map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
              <textarea
                aria-label="Edit file contents"
                readOnly={!canUpdate}
                rows={15}
                value={editorText}
                onChange={(e) => {
                  setEditorText(e.currentTarget.value);
                  setEditorSaveState('dirty');
                }}
                spellCheck={false}
                className="w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[12px] leading-relaxed text-[#FFF8FA] focus:outline-none"
              />
            </div>
          ) : (
            <div
              className="max-h-[380px] overflow-auto rounded-xl border border-[var(--calagopus-border)] bg-[#17151E] py-3 font-mono text-[12px] leading-relaxed"
              aria-label="Syntax highlighted file preview"
            >
              {editorLines.map((line, idx) => (
                <div key={idx} className="flex px-3 hover:bg-white/5">
                  <span className="w-9 shrink-0 select-none text-right pr-3 text-[#7E768A] tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="whitespace-pre">
                    {tokenizeSyntaxLine(line, editingFile?.name ?? '').map((tok, tIdx) => (
                      <span key={tIdx} className={tokenColorClass(tok.kind)}>
                        {tok.text}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-[var(--calagopus-text-secondary)]">
              Shortcut: <kbd className="font-mono">Ctrl/Cmd + S</kbd> to save
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" type="button" onClick={requestCloseEditor}>
                Close
              </Button>
              <Button
                variant="primary"
                type="button"
                disabled={!canUpdate || !isEditorDirty}
                loading={editorSaveState === 'saving'}
                leftIcon={<Save className="h-3.5 w-3.5" />}
                onClick={() => void saveCurrentEditor()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </ModalDialog>

      {/* Unsaved-Change Warning Dialog */}
      <ConfirmDialog
        opened={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          setEditingFile(null);
        }}
        title="Discard Unsaved Changes"
        message={`You have unsaved edits in ${editingFile?.name ?? 'this file'}. Closing the editor will discard them.`}
        confirmLabel="Discard Changes"
        destructive
      />

      {/* Move Entries Modal */}
      <ModalDialog
        opened={moveTargets.length > 0}
        onClose={() => {
          setMoveTargets([]);
          setMoveError(null);
        }}
        title={moveTargets.length > 1 ? `Move ${moveTargets.length} Selected Entries` : `Move ${moveTargets[0]?.name ?? ''}`}
        description="Destination paths are safely normalized inside the server root directory."
        size="sm"
      >
        <form onSubmit={handleMoveSubmit} className="space-y-4">
          <TextInput
            label="Destination Directory"
            placeholder="/plugins"
            required
            value={moveDestDir}
            error={moveError ?? undefined}
            onChange={(e) => {
              setMoveDestDir(e.currentTarget.value);
              setMoveError(null);
            }}
            description="Relative segments like '..' are clamped cleanly to /"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {availableDirectories.slice(0, 6).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setMoveDestDir(dir)}
                className={`blush-focus-ring rounded-md border px-2 py-1 font-mono text-[11px] cursor-pointer ${
                  normalizeDirectoryPath(moveDestDir) === dir
                    ? 'border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
                    : 'border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] text-[var(--calagopus-text)] hover:border-[var(--calagopus-primary-border)]'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setMoveTargets([]);
                setMoveError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" leftIcon={<FolderInput className="h-3.5 w-3.5" />}>
              Move Here
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* Rename Entry Modal */}
      <ModalDialog
        opened={renamingEntry !== null}
        onClose={() => setRenamingEntry(null)}
        title="Rename Entry"
        description={renamingEntry?.path}
        size="sm"
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <TextInput
            label="New Name"
            required
            value={renameText}
            error={renameError ?? undefined}
            onChange={(e) => {
              setRenameText(e.currentTarget.value);
              setRenameError(null);
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setRenamingEntry(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Rename
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* Permissions Modal */}
      <ModalDialog
        opened={chmodEntry !== null}
        onClose={() => {
          setChmodEntry(null);
          setChmodError(null);
        }}
        title="Update File Mode"
        description={chmodEntry?.path}
        size="sm"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!chmodEntry) return;
            const err = validateFileMode(chmodValue);
            if (err) {
              setChmodError(err);
              return;
            }
            const nextPerm = chmodValue.trim();
            const target = chmodEntry;
            try {
              await Promise.resolve(onUpdatePermissions(target.id, nextPerm));
              showToast({
                title: 'Permissions updated',
                message: `${target.name} mode set to ${nextPerm}`,
                tone: 'success',
              });
              setChmodEntry(null);
              setChmodError(null);
            } catch {
              // Error surfaced by caller
            }
          }}
          className="space-y-4"
        >
          <TextInput
            label="POSIX Permission String"
            required
            value={chmodValue}
            error={chmodError ?? undefined}
            onChange={(e) => {
              setChmodValue(e.currentTarget.value);
              setChmodError(null);
            }}
            description="Example: -rw-r--r-- or 644"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setChmodEntry(null);
                setChmodError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Apply Mode
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* SFTP Connection Modal */}
      <ModalDialog
        opened={sftpModalOpen}
        onClose={() => setSftpModalOpen(false)}
        title="SFTP Connection Details"
        description="Connect using FileZilla, WinSCP, or any standard SFTP client."
        size="sm"
      >
        <div className="space-y-3 text-[13px]">
          <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--calagopus-text-secondary)]">Server Address</span>
              <span className="font-mono text-[var(--calagopus-text)]">{`sftp://${server.sftpHost}:${server.sftpPort}`}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--calagopus-text-secondary)]">Username</span>
              <span className="font-mono text-[var(--calagopus-text)]">{server.sftpUsername}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              leftIcon={<Copy className="h-3.5 w-3.5" />}
              onClick={() => {
                void navigator.clipboard?.writeText(`sftp://${server.sftpHost}:${server.sftpPort}`);
                showToast({ title: 'SFTP address copied', tone: 'success' });
              }}
            >
              Copy Address
            </Button>
            <Button variant="primary" onClick={() => setSftpModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        opened={deleteTargets.length > 0}
        onClose={() => setDeleteTargets([])}
        onConfirm={() => {
          const targets = deleteTargets;
          setDeleteTargets([]);
          if (targets.length === 0) return;
          const ids = targets.map((t) => t.id);
          void Promise.resolve(onDeleteEntries(ids))
            .then(() => {
              setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
              showToast({
                title: 'Deleted',
                message:
                  targets.length === 1
                    ? `Removed ${targets[0]?.name}`
                    : `Removed ${targets.length} entries`,
                tone: 'success',
              });
            })
            .catch(() => {});
        }}
        title={deleteTargets.length > 1 ? 'Delete Selected Files' : 'Delete Entry'}
        message={
          deleteTargets.length > 1
            ? `Permanently delete ${deleteTargets.length} selected items from ${currentDir}?`
            : `Permanently delete "${deleteTargets[0]?.name}" from ${currentDir}?`
        }
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
