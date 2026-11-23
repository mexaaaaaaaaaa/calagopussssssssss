import {
  faAdd,
  faBan,
  faCheckCircle,
  faCircleXmark,
  faEllipsisVertical,
  faHardDrive,
  faInfoCircle,
  faMemory,
  faMicrochip,
  faMinus,
  faPlay,
  faRotateRight,
  faSkull,
  faStop,
  faTriangleExclamation,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import { useCallback, useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import { z } from 'zod';
import ActionIcon from '@/elements/buttons/ActionIcon.tsx';
import CopyOnClick from '@/elements/CopyOnClick.tsx';
import Card from '@/elements/data-display/Card.tsx';
import Spinner from '@/elements/feedback/Spinner.tsx';
import ConfirmationModal from '@/elements/modals/ConfirmationModal.tsx';
import ContextMenu, { ContextMenuItem } from '@/elements/overlays/ContextMenu.tsx';
import Tooltip from '@/elements/overlays/Tooltip.tsx';
import ScrollingText from '@/elements/ScrollingText.tsx';
import RedactedText from '@/elements/typography/RedactedText.tsx';
import { formatAllocation, serverStatusInfo, statusToColor } from '@/lib/domain/server.ts';
import { bytesToString, mbToBytes } from '@/lib/format/size.ts';
import { serverPowerAction, serverSchema } from '@/lib/schemas/server/server.ts';
import OrigServerItem from '@/pages/dashboard/home/ServerItem.tsx';
import ServerAddGroupModal from '@/pages/dashboard/home/modals/ServerAddGroupModal.tsx';
import { useBulkPowerActions } from '@/plugins/server/useBulkPowerActions.ts';
import { useServerListShowOthers } from '@/plugins/server/useServerListShowOthers.ts';
import { useServerStats, useServerStatsUnavailable } from '@/plugins/server/useServerStats.ts';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useUserStore } from '@/stores/user.ts';
import { getEggArtworkUrl } from '../utils/eggArtworkAssets';
import { matchEggArtworkId } from '../utils/eggCatalog';

interface ServerItemProps {
  server: z.infer<typeof serverSchema>;
  to?: string;
  showGroupAddButton?: boolean;
  showForeignServerBadge?: boolean;
  showContextMenu?: boolean;
  onGroupRemove?: () => void;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  onClick?: (event: React.MouseEvent) => void;
  showSelection?: boolean;
  sKeyPressedRef?: React.RefObject<boolean>;
}

function isPetalnodesActive(): boolean {
  return typeof document === 'undefined' || document.documentElement.hasAttribute('data-petalnodes-theme');
}

function ThemedServerItem({
  server,
  to,
  showGroupAddButton = false,
  showForeignServerBadge = false,
  showContextMenu = false,
  onGroupRemove,
  isSelected = false,
  onSelectionChange,
  onClick,
  showSelection = true,
  sKeyPressedRef,
}: ServerItemProps) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const serverGroups = useUserStore((state) => state.serverGroups);
  const [serverListShowOthers] = useServerListShowOthers();
  const [openModal, setOpenModal] = useState<'add-group' | 'kill' | null>(null);
  const stats = useServerStats(server);
  const statsUnavailable = useServerStatsUnavailable(server);

  const availableServerGroups = useMemo(
    () => serverGroups.filter((g) => !g.serverOrder.includes(server.uuid)),
    [serverGroups, server.uuid],
  );

  const { handleBulkPowerAction, bulkActionLoading } = useBulkPowerActions();
  const state = stats?.state;
  const powerBlocked = !!server.status || server.isSuspended || server.isTransferring || server.nodeMaintenanceEnabled;

  const permissionSet = useMemo(
    () => new Set([...server.permissions, ...(user?.role?.serverPermissions ?? [])]),
    [server.permissions, user?.role?.serverPermissions],
  );

  const canPower = useCallback(
    (action: string) => permissionSet.has('*') || permissionSet.has(action),
    [permissionSet],
  );

  const doPowerAction = useCallback(
    (action: z.infer<typeof serverPowerAction>) => handleBulkPowerAction([server.uuid], action),
    [handleBulkPowerAction, server.uuid],
  );

  const diskLimit = server.limits.disk !== 0 ? bytesToString(mbToBytes(server.limits.disk)) : t('common.unlimited', {});
  const memoryLimit =
    server.limits.memory !== 0 ? bytesToString(mbToBytes(server.limits.memory)) : t('common.unlimited', {});
  const cpuLimit = server.limits.cpu !== 0 ? `${server.limits.cpu}%` : t('common.unlimited', {});

  const artworkId = matchEggArtworkId(server.egg?.name ?? '', server.name);
  const artworkUrl = getEggArtworkUrl(artworkId);

  const stateBadgeLabel = server.isSuspended
    ? t('common.server.state.suspended', {})
    : server.isTransferring
      ? t('common.server.state.transferring', {})
      : state === 'running'
        ? 'Online'
        : state === 'starting'
          ? 'Starting'
          : state === 'stopping'
            ? 'Stopping'
            : 'Offline';

  const contextMenuItems: ContextMenuItem[] = useMemo(
    () => [
      {
        type: 'action' as const,
        icon: faPlay,
        label: t('common.enum.serverPowerAction.start', {}),
        color: 'gray',
        canAccess: canPower('control.start'),
        disabled: powerBlocked || bulkActionLoading !== null || state !== 'offline',
        onClick: () => doPowerAction('start'),
      },
      {
        type: 'action' as const,
        icon: faRotateRight,
        label: t('common.enum.serverPowerAction.restart', {}),
        canAccess: canPower('control.restart'),
        disabled: powerBlocked || bulkActionLoading !== null || !state,
        onClick: () => doPowerAction('restart'),
      },
      {
        type: 'action' as const,
        icon: faStop,
        label: t('common.enum.serverPowerAction.stop', {}),
        color: 'red',
        canAccess: canPower('control.stop'),
        disabled: powerBlocked || bulkActionLoading !== null || !state || state === 'offline',
        onClick: () => doPowerAction('stop'),
      },
      {
        type: 'action' as const,
        icon: faSkull,
        label: t('common.enum.serverPowerAction.kill', {}),
        color: 'red',
        hidden: state !== 'stopping',
        canAccess: canPower('control.stop'),
        disabled: powerBlocked || bulkActionLoading !== null,
        onClick: () => setOpenModal('kill'),
      },
    ],
    [t, doPowerAction, canPower, powerBlocked, bulkActionLoading, state],
  );

  return (
    <>
      <ServerAddGroupModal server={server} opened={openModal === 'add-group'} onClose={() => setOpenModal(null)} />
      <ConfirmationModal
        opened={openModal === 'kill'}
        onClose={() => setOpenModal(null)}
        title={t('pages.server.console.power.modal.forceStop.title', {})}
        confirm={t('common.button.continue', {})}
        onConfirmed={() => doPowerAction('kill')}
      >
        {t('pages.server.console.power.modal.forceStop.content', {}).md()}
      </ConfirmationModal>

      <ContextMenu enabled={showContextMenu} items={contextMenuItems}>
        {({ items, openMenu }) => (
          <div className='min-w-0'>
            <div
              onClick={onClick}
              onContextMenu={(e) => {
                e.preventDefault();
                openMenu(e.clientX, e.clientY);
              }}
              className='min-w-0'
            >
              <NavLink
                to={to ?? `/server/${server.uuidShort}`}
                className='block min-w-0'
                onClick={(e) => {
                  if (sKeyPressedRef?.current) {
                    e.preventDefault();
                  }
                }}
              >
                <Card
                  p={0}
                  className={classNames(
                    '@container duration-200 h-full flex flex-col justify-between rounded-2xl! overflow-hidden min-w-0',
                    isSelected && 'border-(--calagopus-primary)! ring-2 ring-(--calagopus-primary)/30',
                  )}
                  leftStripeClassName={statusToColor(stats?.state)}
                  hoverable
                >
                  {/* Signature Egg Artwork Banner */}
                  <div className='relative h-24 w-full overflow-hidden border-b border-(--calagopus-border) bg-(--calagopus-surface-secondary)'>
                    <img
                      src={artworkUrl}
                      alt={server.egg?.name || server.name}
                      className='h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-[1.03]'
                    />
                    <div className='absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-transparent' />
                    <div className='absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2'>
                      <span className='inline-flex items-center gap-1.5 rounded-md bg-black/55 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium text-white border border-white/15 truncate max-w-[65%]'>
                        <span className={classNames('h-2 w-2 rounded-full shrink-0', statusToColor(stats?.state))} />
                        <span className='truncate'>{server.egg?.name || 'Container'}</span>
                      </span>
                      <span className='inline-flex items-center rounded-md bg-black/55 backdrop-blur-md px-2 py-0.5 text-[10.5px] font-mono text-white/90 border border-white/15'>
                        {server.nodeName}
                      </span>
                    </div>
                    <div className='absolute bottom-2 left-3 right-3 flex items-center justify-between gap-2'>
                      <span className='text-[11px] font-medium text-white/90'>{stateBadgeLabel}</span>
                      <span className='text-[10.5px] font-mono text-white/75'>{server.uuidShort}</span>
                    </div>
                  </div>

                  <div className='p-4 flex flex-col gap-3 flex-1 justify-between min-w-0'>
                    <div className='flex flex-col @md:flex-row @md:items-center gap-2 justify-between overflow-hidden min-w-0'>
                      <div className='flex gap-2 items-center min-w-0 flex-1'>
                        {showSelection && (
                          <Tooltip
                            label={
                              isSelected
                                ? t('pages.account.home.bulkActions.deselect', {})
                                : t('pages.account.home.bulkActions.select', {})
                            }
                          >
                            <ActionIcon
                              size='input-sm'
                              variant={isSelected ? undefined : 'light'}
                              color={isSelected ? 'green' : 'gray'}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onSelectionChange?.(!isSelected);
                              }}
                            >
                              <FontAwesomeIcon icon={isSelected ? faCheckCircle : faCircleXmark} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <span className='font-display text-lg font-semibold flex items-center gap-2 min-w-0 flex-1 text-(--calagopus-text)'>
                          <ScrollingText className='flex-1'>{server.name}</ScrollingText>
                          {showForeignServerBadge && !server.isOwner && (
                            <Tooltip label={t('pages.account.home.tooltip.foreign', {})}>
                              <FontAwesomeIcon
                                size='sm'
                                icon={faUsers}
                                className='shrink-0 text-(--mantine-color-yellow-filled)'
                              />
                            </Tooltip>
                          )}
                          {!serverListShowOthers && serverGroups.every((g) => !g.serverOrder.includes(server.uuid)) && (
                            <Tooltip label={t('pages.account.home.tooltip.noGroup', {})}>
                              <FontAwesomeIcon size='sm' icon={faInfoCircle} className='shrink-0 opacity-75' />
                            </Tooltip>
                          )}
                        </span>
                      </div>

                      <div className='flex flex-row items-center min-w-0 @md:justify-end @md:max-w-none'>
                        {server.allocation ? (
                          server.egg.separatePort ? (
                            <div className='flex flex-row gap-1.5 min-w-0'>
                              <CopyOnClick
                                content={server.allocation.ipAlias ?? server.allocation.ip}
                                className='min-w-0'
                              >
                                <Card p='xs' hoverable className='leading-[100%] min-w-0 rounded-lg!'>
                                  <p className='text-xs font-mono text-(--mantine-color-dimmed)'>
                                    <ScrollingText>
                                      <RedactedText value={server.allocation.ipAlias ?? server.allocation.ip} />
                                    </ScrollingText>
                                  </p>
                                </Card>
                              </CopyOnClick>
                              <CopyOnClick content={server.allocation.port.toString()} className='shrink-0'>
                                <Card p='xs' hoverable className='leading-[100%] text-nowrap rounded-lg!'>
                                  <p className='text-xs font-mono text-(--mantine-color-dimmed)'>
                                    {server.allocation.port.toString()}
                                  </p>
                                </Card>
                              </CopyOnClick>
                            </div>
                          ) : (
                            <CopyOnClick content={formatAllocation(server.allocation)} className='min-w-0'>
                              <Card p='xs' hoverable className='leading-[100%] min-w-0 rounded-lg!'>
                                <p className='text-xs font-mono text-(--mantine-color-dimmed)'>
                                  <ScrollingText>
                                    <RedactedText value={formatAllocation(server.allocation)} />
                                  </ScrollingText>
                                </p>
                              </Card>
                            </CopyOnClick>
                          )
                        ) : (
                          <Card p='xs' className='leading-[100%] min-w-0 rounded-lg! max-w-full'>
                            <p className='text-xs text-(--mantine-color-dimmed) truncate'>
                              {t('common.server.noAllocation', {})}
                            </p>
                          </Card>
                        )}

                        {showGroupAddButton && (
                          <Tooltip
                            label={
                              availableServerGroups.length === 0
                                ? t('pages.account.home.tooltip.noGroups', {})
                                : t('pages.account.home.tooltip.addToGroup', {})
                            }
                            className='ml-1.5'
                          >
                            <ActionIcon
                              size='input-sm'
                              variant='light'
                              disabled={availableServerGroups.length === 0}
                              onClick={(e) => {
                                e.preventDefault();
                                setOpenModal('add-group');
                              }}
                            >
                              <FontAwesomeIcon icon={faAdd} />
                            </ActionIcon>
                          </Tooltip>
                        )}

                        {onGroupRemove && (
                          <Tooltip label={t('pages.account.home.tooltip.removeFromGroup', {})} className='ml-1.5'>
                            <ActionIcon
                              size='input-sm'
                              color='red'
                              variant='light'
                              onClick={(e) => {
                                e.preventDefault();
                                onGroupRemove();
                              }}
                            >
                              <FontAwesomeIcon icon={faMinus} />
                            </ActionIcon>
                          </Tooltip>
                        )}

                        {showContextMenu && items.some((item) => !item.hidden && item.canAccess !== false) && (
                          <Tooltip label={t('common.form.powerAction', {})} className='ml-1.5'>
                            <ActionIcon
                              size='input-sm'
                              variant='light'
                              color='gray'
                              loading={bulkActionLoading !== null}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                openMenu(rect.left, rect.bottom);
                              }}
                            >
                              <FontAwesomeIcon icon={faEllipsisVertical} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    <div className='border-t border-(--calagopus-border) pt-3'>
                      {server.isSuspended ? (
                        <div className='flex flex-row items-center justify-center py-1'>
                          <FontAwesomeIcon size='1x' icon={faBan} color='red' />
                          <p className='ml-2 text-xs font-medium'>{t('common.server.state.suspended', {})}</p>
                        </div>
                      ) : server.isTransferring ? (
                        <div className='flex flex-row items-center justify-center py-1'>
                          <Spinner size={16} />
                          <p className='ml-2 text-xs font-medium'>{t('common.server.state.transferring', {})}</p>
                        </div>
                      ) : server.nodeMaintenanceEnabled ? (
                        <div className='flex flex-row items-center justify-center py-1'>
                          <FontAwesomeIcon size='1x' icon={faBan} color='red' />
                          <p className='ml-2 text-xs font-medium'>{t('common.server.state.nodeMaintenance', {})}</p>
                        </div>
                      ) : server.status ? (
                        <div className='flex flex-row items-center justify-center py-1'>
                          {serverStatusInfo[server.status].failed ? (
                            <FontAwesomeIcon size='1x' icon={faTriangleExclamation} color='yellow' />
                          ) : (
                            <Spinner size={16} />
                          )}
                          <p className='ml-2 text-xs font-medium'>{serverStatusInfo[server.status].label()}</p>
                        </div>
                      ) : !stats ? (
                        <div className='flex flex-row items-center justify-center py-1'>
                          {statsUnavailable ? (
                            <>
                              <FontAwesomeIcon size='1x' icon={faTriangleExclamation} color='yellow' />
                              <p className='ml-2 text-xs'>{t('common.server.state.resourcesUnavailable', {})}</p>
                            </>
                          ) : (
                            <Spinner size={16} />
                          )}
                        </div>
                      ) : (
                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                          <div className='rounded-xl border border-(--calagopus-border) bg-(--calagopus-surface-secondary) px-2.5 py-2 flex items-center gap-2'>
                            <FontAwesomeIcon icon={faMicrochip} className='text-(--calagopus-primary-text) shrink-0' />
                            <div className='min-w-0'>
                              <div className='text-xs font-semibold tabular-nums text-(--calagopus-text)'>
                                {stats.cpuAbsolute.toFixed(1)}%
                              </div>
                              <div className='text-[10px] text-(--mantine-color-dimmed) truncate'>/ {cpuLimit}</div>
                            </div>
                          </div>
                          <div className='rounded-xl border border-(--calagopus-border) bg-(--calagopus-surface-secondary) px-2.5 py-2 flex items-center gap-2'>
                            <FontAwesomeIcon icon={faMemory} className='text-(--calagopus-primary-text) shrink-0' />
                            <div className='min-w-0'>
                              <div className='text-xs font-semibold tabular-nums text-(--calagopus-text) truncate'>
                                {bytesToString(stats.memoryBytes)}
                              </div>
                              <div className='text-[10px] text-(--mantine-color-dimmed) truncate'>/ {memoryLimit}</div>
                            </div>
                          </div>
                          <div className='rounded-xl border border-(--calagopus-border) bg-(--calagopus-surface-secondary) px-2.5 py-2 flex items-center gap-2'>
                            <FontAwesomeIcon icon={faHardDrive} className='text-(--calagopus-primary-text) shrink-0' />
                            <div className='min-w-0'>
                              <div className='text-xs font-semibold tabular-nums text-(--calagopus-text) truncate'>
                                {bytesToString(stats.diskBytes)}
                              </div>
                              <div className='text-[10px] text-(--mantine-color-dimmed) truncate'>/ {diskLimit}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </NavLink>
            </div>
          </div>
        )}
      </ContextMenu>
    </>
  );
}

export default function PetalnodesServerItem(props: ServerItemProps) {
  if (!isPetalnodesActive()) {
    return <OrigServerItem {...props} />;
  }
  return <ThemedServerItem {...props} />;
}
