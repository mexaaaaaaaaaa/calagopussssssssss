import React from 'react';
import {
  Copy,
  Cpu,
  HardDrive,
  Image as ImageIcon,
  Play,
  RotateCcw,
  RotateCw,
  Server as ServerIcon,
  Square,
  Star,
  Terminal,
  Upload,
} from 'lucide-react';
import { formatUptime, type ServerPowerAction } from '../api/calagopusCore';
import {
  formatMegabytes,
  formatPercent,
  type CalagopusServerSummary,
} from '../api/calagopusDashboard';
import {
  classifyServerSoftware,
  validateBannerImageFile,
} from '../utils/serverArtwork';
import { SERVER_ARTWORK_ASSETS } from '../utils/serverArtworkAssets';
import { Button, IconButton } from './Button';
import { ModalDialog, showToast, Tooltip } from './Overlays';
import { StatusBadge } from './Surface';
import { Card as ShadcnCard } from './ui/card';

export interface ServerCardProps {
  server: CalagopusServerSummary;
  uptimeSeconds?: number;
  customBannerSrc?: string;
  isFavorite?: boolean;
  canControlPower?: boolean;
  onNavigate: (path: string) => void;
  onPowerAction?: (serverId: string, action: ServerPowerAction) => void;
  onSaveCustomBanner?: (serverId: string, dataUri: string | null) => void;
  onToggleFavorite?: (serverId: string) => void;
}

function getServerStatusTone(state: CalagopusServerSummary['state']) {
  if (state === 'running') return 'success' as const;
  if (state === 'starting' || state === 'stopping') return 'warning' as const;
  if (state === 'suspended') return 'danger' as const;
  return 'neutral' as const;
}

export function ServerCard({
  server,
  uptimeSeconds,
  customBannerSrc,
  isFavorite = false,
  canControlPower = true,
  onNavigate,
  onPowerAction,
  onSaveCustomBanner,
  onToggleFavorite,
}: ServerCardProps) {
  const software = classifyServerSoftware(server.eggName, server.name);
  const defaultArtSrc = SERVER_ARTWORK_ASSETS[software.artKey];
  const resolvedSrc = customBannerSrc || defaultArtSrc;

  const [imgFailed, setImgFailed] = React.useState(false);
  const [bannerModalOpen, setBannerModalOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setImgFailed(false);
  }, [resolvedSrc]);

  const isRunning = server.state === 'running' || server.state === 'starting';
  const memPct =
    server.memoryLimitMb > 0
      ? Math.min(100, Math.round((server.memoryUsedMb / server.memoryLimitMb) * 100))
      : 0;
  const diskPct =
    server.diskLimitMb > 0
      ? Math.min(100, Math.round((server.diskUsedMb / server.diskLimitMb) * 100))
      : 0;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard?.writeText(server.allocation);
      showToast({ title: 'Server IP copied', message: server.allocation, tone: 'success' });
    } catch {
      showToast({ title: 'Server Address', message: server.allocation, tone: 'info' });
    }
  };

  const handleBannerFileSelect = (file: File) => {
    const err = validateBannerImageFile(file);
    if (err) {
      showToast({ title: 'Invalid banner image', message: err, tone: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && onSaveCustomBanner) {
        onSaveCustomBanner(server.uuidShort, reader.result);
        setBannerModalOpen(false);
        showToast({
          title: 'Server cover updated',
          message: `Saved custom artwork for ${server.name} locally in your browser.`,
          tone: 'success',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <ShadcnCard className="group flex flex-col overflow-hidden blush-transition hover:-translate-y-0.5 hover:border-[var(--calagopus-primary-border)] hover:shadow-[var(--calagopus-shadow-popover)]">
      {/* 16:9 Visual Banner Header */}
      <div
        className="relative aspect-[16/9] w-full overflow-hidden bg-[#16151E]"
        style={{ background: software.gradient }}
      >
        {!imgFailed ? (
          <img
            src={resolvedSrc}
            alt={`${server.name} — ${software.label} cover artwork`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : null}

        {/* Readable gradient scrim protecting top & bottom overlays */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#111116]/90 via-[#111116]/30 to-[#111116]/40"
        />

        {/* Top Bar: Software Badge + Status Badge */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#111116]/75 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <span
              className="inline-block h-2 w-2 rounded-xs shrink-0"
              style={{ backgroundColor: software.accentHex }}
              aria-hidden="true"
            />
            <span>{server.eggName}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <StatusBadge
              tone={getServerStatusTone(server.state)}
              label={server.state.charAt(0).toUpperCase() + server.state.slice(1)}
            />
            {onToggleFavorite ? (
              <Tooltip label={isFavorite ? 'Remove from favorites' : 'Pin to favorites'}>
                <button
                  type="button"
                  aria-label={
                    isFavorite ? `Unfavorite ${server.name}` : `Favorite ${server.name}`
                  }
                  aria-pressed={isFavorite}
                  onClick={() => onToggleFavorite(server.uuidShort)}
                  className={`blush-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 backdrop-blur-sm cursor-pointer ${
                    isFavorite
                      ? 'bg-[#F4A6C1] text-[#29232A]'
                      : 'bg-[#111116]/75 text-white/90 hover:bg-[#111116] hover:text-white'
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                </button>
              </Tooltip>
            ) : null}
            {onSaveCustomBanner ? (
              <Tooltip label="Customize server cover art">
                <button
                  type="button"
                  aria-label={`Customize artwork for ${server.name}`}
                  onClick={() => setBannerModalOpen(true)}
                  className="blush-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-[#111116]/75 text-white/90 hover:bg-[#111116] hover:text-white backdrop-blur-sm cursor-pointer"
                >
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>
            ) : null}
          </div>
        </div>

        {/* Bottom Scrim Overlay: Title + Node + Allocation */}
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-white leading-tight truncate drop-shadow-sm">
              {server.name}
            </h3>
            <p className="mt-0.5 font-mono text-[11px] text-white/80 tabular-nums truncate">
              {server.uuidShort} · {server.node}
              {uptimeSeconds && uptimeSeconds > 0 && isRunning
                ? ` · Up ${formatUptime(uptimeSeconds)}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyAddress()}
            title="Copy server allocation"
            className="blush-focus-ring inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#111116]/75 px-2 py-1 font-mono text-[11px] text-white hover:bg-[#111116] backdrop-blur-sm shrink-0 cursor-pointer tabular-nums"
          >
            <span>{server.allocation}</span>
            <Copy className="h-3 w-3 opacity-80" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Resource Telemetry Body */}
      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2.5 py-2">
            <div className="flex items-center gap-1 text-[11px] text-[var(--calagopus-text-secondary)]">
              <Cpu className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>CPU</span>
            </div>
            <p className="mt-0.5 font-mono text-[13px] font-semibold text-[var(--calagopus-text)] tabular-nums">
              {formatPercent(server.cpuPercent)}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2.5 py-2">
            <div className="flex items-center gap-1 text-[11px] text-[var(--calagopus-text-secondary)]">
              <ServerIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>RAM</span>
            </div>
            <p className="mt-0.5 font-mono text-[13px] font-semibold text-[var(--calagopus-text)] tabular-nums truncate">
              {formatMegabytes(server.memoryUsedMb)}
            </p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--calagopus-primary-soft)]">
              <div
                className="h-full rounded-full bg-[var(--calagopus-primary)]"
                style={{ width: `${memPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2.5 py-2">
            <div className="flex items-center gap-1 text-[11px] text-[var(--calagopus-text-secondary)]">
              <HardDrive className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>Disk</span>
            </div>
            <p className="mt-0.5 font-mono text-[13px] font-semibold text-[var(--calagopus-text)] tabular-nums truncate">
              {formatMegabytes(server.diskUsedMb)}
            </p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--calagopus-primary-soft)]">
              <div
                className="h-full rounded-full bg-[var(--calagopus-primary-hover)]"
                style={{ width: `${diskPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Power Controls & Manage Actions */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {canControlPower && onPowerAction ? (
            <div className="flex items-center gap-1.5">
              {isRunning ? (
                <Tooltip label={`Stop ${server.name}`}>
                  <IconButton
                    variant="secondary"
                    size="sm"
                    aria-label={`Stop ${server.name}`}
                    icon={<Square className="h-3.5 w-3.5 text-[var(--calagopus-danger-text)]" />}
                    onClick={() => onPowerAction(server.uuidShort, 'stop')}
                  />
                </Tooltip>
              ) : (
                <Tooltip label={`Start ${server.name}`}>
                  <IconButton
                    variant="soft"
                    size="sm"
                    aria-label={`Start ${server.name}`}
                    icon={<Play className="h-3.5 w-3.5" />}
                    onClick={() => onPowerAction(server.uuidShort, 'start')}
                  />
                </Tooltip>
              )}
              <Tooltip label={`Restart ${server.name}`}>
                <IconButton
                  variant="secondary"
                  size="sm"
                  aria-label={`Restart ${server.name}`}
                  icon={<RotateCw className="h-3.5 w-3.5" />}
                  onClick={() => onPowerAction(server.uuidShort, 'restart')}
                />
              </Tooltip>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--calagopus-text-secondary)]">Read-only scope</span>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate(`/server/${server.uuidShort}/overview`)}
            >
              Overview
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Terminal className="h-3.5 w-3.5" />}
              onClick={() => onNavigate(`/server/${server.uuidShort}`)}
            >
              Console
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Server Banner Modal */}
      {onSaveCustomBanner ? (
        <ModalDialog
          opened={bannerModalOpen}
          onClose={() => setBannerModalOpen(false)}
          title={`Cover Artwork · ${server.name}`}
          description="Upload a custom 16:9 image (PNG, JPEG, or WebP, max 1.5 MB) or revert to Petalnodes default artwork. Saved locally in your browser."
          size="sm"
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[var(--calagopus-border)] aspect-[16/9]">
              <img
                src={resolvedSrc}
                alt={`${server.name} preview`}
                className="h-full w-full object-cover"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              aria-label="Choose custom server banner image"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = '';
                if (file) handleBannerFileSelect(file);
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              {customBannerSrc ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => {
                    onSaveCustomBanner(server.uuidShort, null);
                    setBannerModalOpen(false);
                    showToast({
                      title: 'Reverted to default artwork',
                      message: `${server.name} now uses ${software.label} cover art.`,
                      tone: 'info',
                    });
                  }}
                >
                  Reset Default
                </Button>
              ) : (
                <span className="text-[12px] text-[var(--calagopus-text-secondary)]">
                  Using {software.label} default
                </span>
              )}

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Upload className="h-3.5 w-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Image
              </Button>
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </ShadcnCard>
  );
}
