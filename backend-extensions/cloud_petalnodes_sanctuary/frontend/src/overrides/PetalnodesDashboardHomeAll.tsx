import { faBell, faServer, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { z } from 'zod';
import { getEmptyPaginationSet, httpErrorToHuman } from '@/api/axios.ts';
import getServerGroups from '@/api/me/servers/groups/getServerGroups.ts';
import getServers from '@/api/server/getServers.ts';
import { AdminCan } from '@/elements/Can.tsx';
import AccountContentContainer from '@/elements/containers/AccountContentContainer.tsx';
import { NoItems, Pagination } from '@/elements/data-display/Table.tsx';
import EmptyState from '@/elements/feedback/EmptyState.tsx';
import ErrorState from '@/elements/feedback/ErrorState.tsx';
import Spinner from '@/elements/feedback/Spinner.tsx';
import Checkbox from '@/elements/input/Checkbox.tsx';
import Switch from '@/elements/input/Switch.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import Divider from '@/elements/layout/Divider.tsx';
import Group from '@/elements/layout/Group.tsx';
import { ObjectSet } from '@/lib/objectSet.ts';
import { queryKeys } from '@/lib/queryKeys.ts';
import { serverPowerAction, serverSchema } from '@/lib/schemas/server/server.ts';
import OrigDashboardHomeAll from '@/pages/dashboard/home/DashboardHomeAll.tsx';
import BulkActionBar from '@/pages/dashboard/home/BulkActionBar.tsx';
import DashboardHomeTitle from '@/pages/dashboard/home/DashboardHomeTitle.tsx';
import ServerItem from '@/pages/dashboard/home/ServerItem.tsx';
import { useSearchablePaginatedTable } from '@/plugins/resource/useSearchablePaginatedTable.ts';
import { useSelectKeyHeld } from '@/plugins/selection/useSelectKeyHeld.ts';
import { useBulkPowerActions } from '@/plugins/server/useBulkPowerActions.ts';
import { useServerListShowOthers } from '@/plugins/server/useServerListShowOthers.ts';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useUserStore } from '@/stores/user.ts';
import { NodeyMascot } from '../components/NodeyMascot';

function isPetalnodesActive(): boolean {
  return typeof document === 'undefined' || document.documentElement.hasAttribute('data-petalnodes-theme');
}

function ThemedDashboardHomeAll() {
  const { t } = useTranslations();
  const { user } = useAuth();
  const navigate = useNavigate();
  const setServerGroups = useUserStore((state) => state.setServerGroups);
  const [serverListShowOthers, setServerListShowOthers] = useServerListShowOthers();
  const { addToast } = useToast();
  const [selectedServers, setSelectedServers] = useState(
    new ObjectSet<z.infer<typeof serverSchema>, 'uuid'>('uuid'),
  );
  const sKeyPressedRef = useSelectKeyHeld();
  const { handleBulkPowerAction, bulkActionLoading } = useBulkPowerActions();

  useEffect(() => {
    getServerGroups()
      .then((response) => {
        setServerGroups(response);
      })
      .catch((msg) => {
        addToast(httpErrorToHuman(msg), 'error');
      });
  }, [addToast, setServerGroups]);

  const {
    data: servers,
    loading,
    error,
    refetch,
    search,
    debouncedSearch,
    setSearch,
    setPage,
  } = useSearchablePaginatedTable({
    queryKey: queryKeys.user.servers.all(),
    fetcher: (page, searchQuery) => getServers(page, searchQuery, serverListShowOthers),
    deps: [serverListShowOthers],
  });

  const selectedPageCount = servers?.data.filter((server) => selectedServers.has(server)).length ?? 0;
  const allSelected = selectedPageCount > 0 && selectedPageCount === servers?.data.length;

  const handleServerSelectionChange = (server: z.infer<typeof serverSchema>, selected: boolean) => {
    setSelectedServers((prev) => {
      const newSet = prev.clone();
      if (selected) {
        newSet.add(server);
      } else {
        newSet.delete(server);
      }
      return newSet;
    });
  };

  const handleServerClick = (server: z.infer<typeof serverSchema>, event: React.MouseEvent) => {
    if (sKeyPressedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      handleServerSelectionChange(server, !selectedServers.has(server));
    }
  };

  const onBulkAction = async (action: z.infer<typeof serverPowerAction>) => {
    await handleBulkPowerAction(selectedServers.keys(), action);
    setSelectedServers(new ObjectSet('uuid'));
  };

  const visibleServers = servers?.data ?? [];
  const suspendedCount = visibleServers.filter((s) => s.isSuspended).length;
  const displayName = user?.nameFirst ? user.nameFirst : (user?.username ?? 'Explorer');

  return (
    <AccountContentContainer
      title={t('pages.account.home.title', {})}
      registry={window.extensionContext.extensionRegistry.pages.dashboard.home.containerAll}
    >
      {/* Petalnodes Sanctuary Welcome & Fleet Summary Banner */}
      <section className='mb-5 rounded-2xl border border-(--calagopus-primary-border) bg-linear-to-br from-(--calagopus-surface) via-(--calagopus-surface) to-(--calagopus-primary-subtle) p-4 sm:p-5 shadow-[var(--calagopus-shadow-card)]'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-3.5 min-w-0'>
            <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-(--calagopus-primary-border) bg-(--calagopus-primary-soft) text-(--calagopus-text)'>
              <NodeyMascot size={36} />
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h2 className='font-display text-base sm:text-lg font-bold tracking-tight text-(--calagopus-text) truncate'>
                  Welcome back, {displayName}
                </h2>
                <span className='inline-flex items-center rounded-md border border-(--calagopus-primary-border) bg-(--calagopus-primary-soft) px-2 py-0.5 text-[11px] font-semibold text-(--calagopus-primary-text)'>
                  {servers?.total ?? 0} {servers?.total === 1 ? 'Server' : 'Servers'}
                </span>
                {suspendedCount > 0 && (
                  <span className='inline-flex items-center rounded-md border border-(--calagopus-danger-border) bg-(--calagopus-danger-bg) px-2 py-0.5 text-[11px] font-semibold text-(--calagopus-danger-text)'>
                    {suspendedCount} Suspended
                  </span>
                )}
              </div>
              <p className='mt-0.5 text-xs text-(--calagopus-text-secondary)'>
                Manage live containers, inspect real-time resource usage, or hold <kbd className='rounded border border-(--calagopus-border) px-1 py-0.5 font-mono text-[10px]'>S</kbd> to batch-select servers.
              </p>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2 shrink-0'>
            <NavLink
              to='/account/security'
              className='blush-transition inline-flex items-center gap-1.5 rounded-xl border border-(--calagopus-border) bg-(--calagopus-surface) px-3 py-1.5 text-xs font-medium text-(--calagopus-text) hover:border-(--calagopus-primary-border) hover:text-(--calagopus-primary-text)'
            >
              <FontAwesomeIcon icon={faShieldHalved} className='text-[11px] text-(--calagopus-primary-text)' />
              <span>Security</span>
            </NavLink>
            <NavLink
              to='/account/notifications'
              className='blush-transition inline-flex items-center gap-1.5 rounded-xl border border-(--calagopus-border) bg-(--calagopus-surface) px-3 py-1.5 text-xs font-medium text-(--calagopus-text) hover:border-(--calagopus-primary-border) hover:text-(--calagopus-primary-text)'
            >
              <FontAwesomeIcon icon={faBell} className='text-[11px] text-(--calagopus-primary-text)' />
              <span>Notification Center</span>
            </NavLink>
          </div>
        </div>
      </section>

      <DashboardHomeTitle />

      <Group mb='md' justify='space-between'>
        <Group wrap='nowrap' className='w-full md:w-auto'>
          <Checkbox
            aria-label={t('common.button.selectAll', {})}
            title={t('common.button.selectAll', {})}
            className='shrink-0'
            checked={allSelected}
            indeterminate={selectedPageCount > 0 && !allSelected}
            disabled={loading || !servers?.data.length}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              setSelectedServers((previous) => {
                const next = previous.clone();
                for (const server of servers?.data ?? []) {
                  if (checked) {
                    next.add(server);
                  } else {
                    next.delete(server);
                  }
                }
                return next;
              });
            }}
          />
          <TextInput
            placeholder={t('common.input.search', {})}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              const firstServer = servers?.data[0];
              if (e.key === 'Enter' && firstServer && !loading && search === debouncedSearch) {
                e.preventDefault();
                navigate(`/server/${firstServer.uuidShort}`);
              }
            }}
            className='flex-1 min-w-0 md:w-62.5'
          />
        </Group>
        <AdminCan action='servers.read'>
          <Switch
            label={t('pages.account.home.tabs.allServers.page.input.showOtherUsersServers', {})}
            checked={serverListShowOthers}
            onChange={(e) => {
              setPage(1);
              setServerListShowOthers(e.currentTarget.checked);
            }}
          />
        </AdminCan>
      </Group>

      {(servers?.total ?? 0) > (servers?.perPage ?? 0) && (
        <>
          <Pagination data={servers ?? getEmptyPaginationSet()} onPageSelect={setPage} />
          <Divider my='md' />
        </>
      )}

      {loading && !servers ? (
        <Spinner.Centered />
      ) : error && !servers ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : servers?.total === 0 ? (
        debouncedSearch ? (
          <NoItems />
        ) : (
          <EmptyState
            icon={faServer}
            title={t('pages.account.home.empty.title', {})}
            description={t('pages.account.home.empty.description', {})}
          />
        )
      ) : (
        <div
          className={classNames(
            'gap-4 grid md:grid-cols-2',
            loading && 'opacity-50 pointer-events-none transition-opacity',
          )}
        >
          {servers?.data.map((server) => (
            <ServerItem
              key={server.uuid}
              server={server}
              showContextMenu
              showGroupAddButton
              showForeignServerBadge
              isSelected={selectedServers.has(server.uuid)}
              onSelectionChange={(selected) => handleServerSelectionChange(server, selected)}
              onClick={(e) => handleServerClick(server, e)}
              sKeyPressedRef={sKeyPressedRef}
            />
          ))}
        </div>
      )}

      <BulkActionBar
        selectedCount={selectedServers.size}
        onClear={() => setSelectedServers(new ObjectSet('uuid'))}
        onAction={onBulkAction}
        loading={bulkActionLoading}
      />

      {(servers?.total ?? 0) > (servers?.perPage ?? 0) && (
        <>
          <Divider my='md' />
          <Pagination data={servers ?? getEmptyPaginationSet()} onPageSelect={setPage} />
        </>
      )}
    </AccountContentContainer>
  );
}

export default function PetalnodesDashboardHomeAll() {
  if (!isPetalnodesActive()) {
    return <OrigDashboardHomeAll />;
  }
  return <ThemedDashboardHomeAll />;
}
