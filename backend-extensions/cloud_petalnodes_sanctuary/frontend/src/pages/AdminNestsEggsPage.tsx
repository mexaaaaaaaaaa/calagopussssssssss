import React from 'react';
import {
  CheckCircle2,
  Code2,
  Container,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FolderGit2,
  Gamepad2,
  Layers,
  Terminal,
} from 'lucide-react';
import type { CalagopusUserContext } from '../navigation/calagopusRoutes';
import {
  CALAGOPUS_EGG_CATALOG,
  CONFIGURED_EGG_REPOSITORIES,
  filterAndSortEggs,
  generateEggArtworkCoverageReport,
  resolveEggArtworkId,
  type CalagopusEggEntry,
  type EggCategoryGroup,
  type EggRepositorySlug,
  type EggSortKey,
} from '../utils/eggCatalog';
import { getEggArtworkUrl } from '../utils/eggArtworkAssets';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState, ErrorState, SkeletonBlock } from '../components/FeedbackStates';
import { SearchField, SelectDropdown } from '../components/FormControls';
import { ModalDialog } from '../components/Overlays';
import { StatCard } from '../components/StatCard';
import { Card, PageHeader, StatusBadge } from '../components/Surface';

export interface AdminNestsEggsPageProps {
  user: CalagopusUserContext;
  eggs?: readonly CalagopusEggEntry[];
  loading?: boolean;
  onNavigate: (path: string) => void;
  onImportEgg?: (egg: CalagopusEggEntry) => Promise<void> | void;
  compact?: boolean;
}

function EggThumbnail({ egg }: { egg: CalagopusEggEntry }) {
  const artworkId = resolveEggArtworkId(egg);
  const src = getEggArtworkUrl(artworkId);
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-primary-subtle)] text-[var(--calagopus-primary-text)]">
        <Layers className="h-6 w-6 mb-1" aria-hidden="true" />
        <span className="text-[11px] font-medium">{egg.shortTag}</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--calagopus-border)] bg-[#14121B]">
      <img
        src={src}
        alt={`${egg.name} visual artwork`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/55 to-transparent" />
      <span className="absolute bottom-2 left-2.5 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
        {egg.shortTag}
      </span>
    </div>
  );
}

export function AdminNestsEggsPage({
  user,
  eggs = CALAGOPUS_EGG_CATALOG,
  loading = false,
  onNavigate,
  compact = false,
}: AdminNestsEggsPageProps) {
  const [query, setQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<'all' | EggCategoryGroup>('all');
  const [repoFilter, setRepoFilter] = React.useState<'all' | EggRepositorySlug>('all');
  const [sortBy, setSortBy] = React.useState<EggSortKey>('name-asc');
  const [inspectedEgg, setInspectedEgg] = React.useState<CalagopusEggEntry | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);

  const canAccessAdmin =
    user.isAdmin || user.permissions.some((p) => p.startsWith('admin.'));

  const filteredEggs = React.useMemo(
    () =>
      filterAndSortEggs(eggs, {
        query,
        category: categoryFilter,
        repository: repoFilter,
        sortBy,
      }),
    [eggs, query, categoryFilter, repoFilter, sortBy],
  );

  const coverageReport = React.useMemo(
    () => generateEggArtworkCoverageReport(eggs),
    [eggs],
  );

  if (!canAccessAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Egg Library"
          description="Visual artwork registry across pre-configured Calagopus Egg repositories."
        />
        <ErrorState
          title="Administrator permission required"
          description="Your current account does not hold permission to inspect /admin/nests."
          retryLabel="Return to Workspace"
          onRetry={() => onNavigate('/')}
        />
      </div>
    );
  }

  const gameCount = eggs.filter((e) => e.category === 'Game Eggs').length;
  const appCount = eggs.filter((e) => e.category === 'Application Eggs').length;
  const genericCount = eggs.filter((e) => e.category === 'Generic Eggs').length;

  const handleDownloadMappingJson = () => {
    const blob = new Blob([JSON.stringify(coverageReport, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'petalnodes-egg-artwork-report.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const reportColumns: readonly TableColumn<
    (typeof coverageReport.entries)[number] & { id: string }
  >[] = [
    {
      key: 'eggName',
      header: 'Egg Name',
      render: (r) => (
        <div>
          <p className="font-medium text-[var(--calagopus-text)]">{r.eggName}</p>
          <p className="font-mono text-[11px] text-[var(--calagopus-text-secondary)]">{r.eggId}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category' },
    {
      key: 'repository',
      header: 'Configured Repository',
      render: (r) => <span className="font-mono text-[12px]">{r.repository}</span>,
    },
    {
      key: 'assetFile',
      header: 'Assigned Image',
      render: (r) => (
        <span className="font-mono text-[12px] text-[var(--calagopus-primary-text)]">
          {r.assetFile}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Egg Library"
        description="Read-only visual showcase assigning unique domain-authentic artwork to every Egg across your three pre-configured repositories."
        metadata={[
          `${eggs.length} discovered Eggs`,
          `${coverageReport.uniqueArtworkCount} unique artworks`,
          '3 pre-configured repos',
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileCheck2 className="h-4 w-4" />}
            onClick={() => setReportOpen(true)}
          >
            Artwork Mapping Report
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Discovered Eggs"
          value={eggs.length}
          helper={`${coverageReport.fallbackCount} using fallback artwork`}
          icon={<Layers className="h-4 w-4" />}
        />
        <StatCard
          label="Game Eggs"
          value={gameCount}
          helper="pterodactyl/game-eggs"
          icon={<Gamepad2 className="h-4 w-4" />}
        />
        <StatCard
          label="Application Eggs"
          value={appCount}
          helper="pterodactyl/application-eggs"
          icon={<Container className="h-4 w-4" />}
        />
        <StatCard
          label="Generic Runtimes"
          value={genericCount}
          helper="pterodactyl/generic-eggs"
          icon={<Code2 className="h-4 w-4" />}
        />
      </div>

      {/* Existing Configured Repositories (Strictly Read-Only — never duplicate or re-add) */}
      <Card
        title="Configured Egg Repositories"
        description="Synced directly by Calagopus core. Existing repository URLs, installation scripts, and startup variables remain untouched."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {CONFIGURED_EGG_REPOSITORIES.map((repo) => (
            <div
              key={repo.slug}
              className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderGit2
                    className="h-4 w-4 text-[var(--calagopus-primary-text)] shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[13px] font-semibold text-[var(--calagopus-text)] truncate">
                    {repo.slug}
                  </span>
                </div>
                <StatusBadge tone="success" label="Synced" />
              </div>
              <p className="text-[12px] text-[var(--calagopus-text-secondary)] leading-relaxed">
                {repo.description}
              </p>
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--calagopus-primary-text)] hover:underline"
              >
                <span>{repo.url}</span>
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Egg Catalog"
        description="Filter by category, repository, or runtime, and inspect read-only startup commands and container images."
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-1"
              role="tablist"
              aria-label="Filter eggs by category"
            >
              {(['all', 'Game Eggs', 'Application Eggs', 'Generic Eggs'] as const).map((cat) => {
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
                    {cat === 'all' ? 'All Eggs' : cat}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-56">
                <SearchField
                  aria-label="Search Egg catalog"
                  placeholder="Search game, runtime, or tag..."
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <div className="w-full sm:w-48">
                <SelectDropdown
                  aria-label="Filter by source repository"
                  value={repoFilter}
                  onChange={(val) => setRepoFilter((val as 'all' | EggRepositorySlug) ?? 'all')}
                  data={[
                    { value: 'all', label: 'All repositories' },
                    { value: 'pterodactyl/game-eggs', label: 'pterodactyl/game-eggs' },
                    { value: 'pterodactyl/application-eggs', label: 'pterodactyl/application-eggs' },
                    { value: 'pterodactyl/generic-eggs', label: 'pterodactyl/generic-eggs' },
                  ]}
                />
              </div>
              <div className="w-full sm:w-36">
                <SelectDropdown
                  aria-label="Sort Eggs"
                  value={sortBy}
                  onChange={(val) => setSortBy((val as EggSortKey) ?? 'name-asc')}
                  data={[
                    { value: 'name-asc', label: 'Name (A–Z)' },
                    { value: 'name-desc', label: 'Name (Z–A)' },
                    { value: 'category', label: 'Category' },
                  ]}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <SkeletonBlock lines={6} />
          ) : filteredEggs.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-5 w-5" />}
              title="No matching Eggs"
              description="Reset your search filter or repository selection to view all synced Eggs."
              actionLabel="Reset Filters"
              onAction={() => {
                setQuery('');
                setCategoryFilter('all');
                setRepoFilter('all');
                setSortBy('name-asc');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredEggs.map((egg) => (
                <article
                  key={egg.id}
                  className="flex flex-col justify-between gap-3.5 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-4 blush-transition hover:border-[var(--calagopus-primary-border)]"
                >
                  <div className="space-y-3">
                    <EggThumbnail egg={egg} />

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-[15px] font-semibold text-[var(--calagopus-text)] truncate">
                          {egg.name}
                        </h3>
                        <p className="text-[12px] text-[var(--calagopus-text-secondary)] truncate">
                          {egg.category} · {egg.runtimeLabel}
                        </p>
                      </div>
                      <StatusBadge
                        tone={egg.imported ? 'success' : 'neutral'}
                        label={egg.imported ? 'Imported' : 'Catalog'}
                      />
                    </div>

                    <p className="text-[12.5px] leading-relaxed text-[var(--calagopus-text-secondary)] line-clamp-2">
                      {egg.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[var(--calagopus-border)] pt-3">
                    <span className="font-mono text-[11px] text-[var(--calagopus-text-secondary)] truncate tabular-nums">
                      {egg.repository} · {egg.variableCount} vars
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => setInspectedEgg(egg)}
                    >
                      Details
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Egg Read-Only Inspection Modal */}
      <ModalDialog
        opened={inspectedEgg !== null}
        onClose={() => setInspectedEgg(null)}
        title={inspectedEgg ? inspectedEgg.name : 'Egg Details'}
        description={
          inspectedEgg
            ? `${inspectedEgg.repository} · ${inspectedEgg.category} (${inspectedEgg.subcategory})`
            : undefined
        }
        size="lg"
      >
        {inspectedEgg ? (
          <div className="space-y-4">
            <EggThumbnail egg={inspectedEgg} />

            <p className="text-sm text-[var(--calagopus-text-secondary)] leading-relaxed">
              {inspectedEgg.description}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--calagopus-text-secondary)]">
                  Runtime &amp; Status
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--calagopus-text)]">
                  {inspectedEgg.runtimeLabel} · {inspectedEgg.imported ? 'Imported into Calagopus' : 'Available in Repo'}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--calagopus-text-secondary)]">
                  Assigned Artwork File
                </p>
                <p className="mt-1 font-mono text-[12px] text-[var(--calagopus-primary-text)] break-all">
                  assets/eggs/{resolveEggArtworkId(inspectedEgg)}.svg
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--calagopus-text)]">
                <Container className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)]" aria-hidden="true" />
                Container Docker Images (Read-Only)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {inspectedEgg.dockerImages.map((img) => (
                  <code
                    key={img}
                    className="rounded-md border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2 py-1 font-mono text-[11px] text-[var(--calagopus-text)]"
                  >
                    {img}
                  </code>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--calagopus-text)]">
                <Terminal className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)]" aria-hidden="true" />
                Startup Command (Preserved Unmodified)
              </p>
              <pre className="overflow-x-auto rounded-lg border border-[var(--calagopus-border)] bg-[#16141C] p-3 font-mono text-[12px] text-[#F7F2F5]">
                {inspectedEgg.startupCommand}
              </pre>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--calagopus-border)] pt-3 text-[12px] text-[var(--calagopus-text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--calagopus-success)]" aria-hidden="true" />
                {inspectedEgg.variableCount} Egg environment variables preserved in Calagopus
              </span>
              <Button variant="primary" size="sm" onClick={() => setInspectedEgg(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </ModalDialog>

      {/* Complete Egg-to-Image Coverage Report Modal */}
      <ModalDialog
        opened={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Egg-to-Image Mapping Report"
        description={`${coverageReport.totalEggs} Eggs verified · ${coverageReport.uniqueArtworkCount} unique artworks assigned · ${coverageReport.duplicateArtworkIds.length} duplicates`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge
              tone={coverageReport.duplicateArtworkIds.length === 0 ? 'success' : 'warning'}
              label={
                coverageReport.duplicateArtworkIds.length === 0
                  ? '100% Unique Egg Mapping Verified'
                  : `${coverageReport.duplicateArtworkIds.length} Duplicate Mappings`
              }
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleDownloadMappingJson}
            >
              Export JSON Report
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--calagopus-border)]">
            <DataTable
              caption="Egg Artwork Mapping Report"
              columns={reportColumns}
              rows={coverageReport.entries.map((entry) => ({
                ...entry,
                id: entry.eggId,
              }))}
              compact={compact}
            />
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setReportOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
