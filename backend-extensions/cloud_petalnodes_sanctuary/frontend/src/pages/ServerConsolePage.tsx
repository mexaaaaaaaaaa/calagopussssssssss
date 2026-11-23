import React from 'react';
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  Clock,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Minus,
  OctagonAlert,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  Square,
  Terminal,
  Trash2,
  WrapText,
} from 'lucide-react';
import {
  filterConsoleLines,
  formatBytesPerSecond,
  formatUptime,
  type CalagopusConsoleLine,
  type CalagopusServerDetail,
  type ServerPowerAction,
} from '../api/calagopusCore';
import { formatMegabytes, formatPercent } from '../api/calagopusDashboard';
import { Button } from '../components/Button';
import { SkeletonBlock } from '../components/FeedbackStates';
import { SearchField, SelectDropdown } from '../components/FormControls';
import { MiniSparkline } from '../components/MiniChart';
import { ConfirmDialog, showToast, Tooltip } from '../components/Overlays';
import { Card, StatusBadge } from '../components/Surface';
import { hasPermission } from '../navigation/calagopusRoutes';
import { filterConsoleSuggestions } from '../utils/panelEnhancements';
import { getInitials } from '../utils/themeHelpers';

export type ConsoleConnectionState = 'connected' | 'reconnecting' | 'disconnected' | 'offline';

export interface ServerConsolePageProps {
  server: CalagopusServerDetail;
  logs: readonly CalagopusConsoleLine[];
  onSendCommand: (command: string) => Promise<void> | void;
  onClearLogs: () => void;
  onPowerAction: (action: ServerPowerAction) => Promise<void> | void;
  onReconnect?: () => Promise<void> | void;
  connectionState?: ConsoleConnectionState;
  loading?: boolean;
  permissions?: readonly string[];
  isAdmin?: boolean;
  defaultAutoScroll?: boolean;
  confirmDestructive?: boolean;
}

export function ServerConsolePage({
  server,
  logs,
  onSendCommand,
  onClearLogs,
  onPowerAction,
  onReconnect,
  connectionState,
  loading = false,
  permissions = ['*'],
  isAdmin = true,
  defaultAutoScroll = true,
  confirmDestructive = true,
}: ServerConsolePageProps) {
  const [commandInput, setCommandInput] = React.useState('');
  const [commandHistory, setCommandHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);

  const [logSearch, setLogSearch] = React.useState('');
  const [levelFilter, setLevelFilter] = React.useState<'ALL' | CalagopusConsoleLine['level']>('ALL');
  const [showTimestamps, setShowTimestamps] = React.useState(true);
  const [wordWrap, setWordWrap] = React.useState(true);
  const [autoScroll, setAutoScroll] = React.useState(defaultAutoScroll);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const [fontSizePx, setFontSizePx] = React.useState(12);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const [pendingPowerAction, setPendingPowerAction] = React.useState<ServerPowerAction | null>(null);
  const [sendingCommand, setSendingCommand] = React.useState(false);
  const [reconnecting, setReconnecting] = React.useState(false);
  const [confirmStopOpen, setConfirmStopOpen] = React.useState(false);
  const [confirmKillOpen, setConfirmKillOpen] = React.useState(false);

  React.useEffect(() => {
    setAutoScroll(defaultAutoScroll);
  }, [defaultAutoScroll]);

  React.useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  const logViewportRef = React.useRef<HTMLDivElement | null>(null);
  const userCtx = React.useMemo(
    () => ({ isAdmin, permissions }),
    [isAdmin, permissions],
  );
  const canControlPower =
    hasPermission(userCtx, 'control.power') ||
    hasPermission(userCtx, 'control.start') ||
    hasPermission(userCtx, 'control.stop') ||
    hasPermission(userCtx, 'control.restart');
  const canSendConsole = hasPermission(userCtx, 'control.console');

  const filteredLogs = React.useMemo(() => {
    const textMatched = filterConsoleLines(logs, logSearch);
    return levelFilter === 'ALL'
      ? textMatched
      : textMatched.filter((line) => line.level === levelFilter);
  }, [logs, logSearch, levelFilter]);

  const commandSuggestions = React.useMemo(
    () => filterConsoleSuggestions(commandInput),
    [commandInput],
  );

  const isRunning = server.state === 'running' || server.state === 'starting';
  const resolvedConnection: ConsoleConnectionState =
    connectionState ?? (isRunning ? 'connected' : 'offline');

  const scrollToLatest = React.useCallback(() => {
    const el = logViewportRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setIsAtBottom(true);
    }
  }, []);

  React.useEffect(() => {
    if (!autoScroll) return;
    scrollToLatest();
  }, [filteredLogs.length, autoScroll, isFullscreen, scrollToLatest]);

  const handleViewportScroll = () => {
    const el = logViewportRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 24;
    setIsAtBottom(nearBottom);
  };

  const scrollManual = (direction: 'up' | 'down') => {
    const el = logViewportRef.current;
    if (!el) return;
    setAutoScroll(false);
    el.scrollBy({
      top: direction === 'up' ? -180 : 180,
      behavior: 'smooth',
    });
  };

  const executePowerAction = async (action: ServerPowerAction) => {
    if (pendingPowerAction) return;
    setPendingPowerAction(action);
    try {
      await Promise.resolve(onPowerAction(action));
    } finally {
      setPendingPowerAction(null);
    }
  };

  const submitCommand = async (rawCommand: string) => {
    const cmd = rawCommand.trim();
    if (!cmd || !canSendConsole || sendingCommand) return;
    setSendingCommand(true);
    try {
      await Promise.resolve(onSendCommand(cmd));
      setCommandHistory((prev) => [cmd, ...prev.filter((item) => item !== cmd)].slice(0, 30));
      setHistoryIndex(-1);
      setCommandInput('');
      showToast({
        title: 'Command dispatched',
        message: cmd,
        tone: 'info',
        autoCloseMs: 2200,
      });
    } catch {
      // Errors surfaced by caller
    } finally {
      setSendingCommand(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && commandSuggestions.length > 0 && commandInput.trim().length > 0) {
      e.preventDefault();
      setCommandInput(commandSuggestions[0].command);
      return;
    }
    if (e.key === 'ArrowUp' && commandHistory.length > 0) {
      e.preventDefault();
      const nextIdx = Math.min(commandHistory.length - 1, historyIndex + 1);
      setHistoryIndex(nextIdx);
      setCommandInput(commandHistory[nextIdx] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommandInput(commandHistory[nextIdx] ?? '');
      }
    }
  };

  const handleDownloadLogs = () => {
    const content = logs
      .map((line) => `[${line.timestamp} ${line.level}] [${line.source}]: ${line.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${server.uuidShort}-console.log`;
    link.click();
    URL.revokeObjectURL(url);
    showToast({
      title: 'Console log downloaded',
      message: `${logs.length} lines saved to ${server.uuidShort}-console.log`,
      tone: 'success',
    });
  };

  const handleCopyLogs = async () => {
    const activeSelection = window.getSelection();
    const viewport = logViewportRef.current;
    const selectedText =
      activeSelection &&
      viewport &&
      activeSelection.toString().trim().length > 0 &&
      viewport.contains(activeSelection.anchorNode)
        ? activeSelection.toString()
        : null;

    const content =
      selectedText ??
      filteredLogs
        .map((line) => `[${line.timestamp} ${line.level}] [${line.source}]: ${line.message}`)
        .join('\n');

    try {
      await navigator.clipboard?.writeText(content);
      showToast({
        title: selectedText ? 'Selected output copied' : 'Console output copied',
        message: selectedText
          ? `${selectedText.split('\n').length} selected line(s) copied.`
          : `${filteredLogs.length} filtered line(s) copied to clipboard.`,
        tone: 'success',
      });
    } catch {
      showToast({
        title: 'Clipboard unavailable',
        message: 'Could not access clipboard from this browser context.',
        tone: 'info',
      });
    }
  };

  const handleReconnectClick = async () => {
    if (!onReconnect || reconnecting) return;
    setReconnecting(true);
    try {
      await Promise.resolve(onReconnect());
      showToast({
        title: 'Console reconnected',
        message: `Synchronized stream state for ${server.name}.`,
        tone: 'success',
      });
    } catch {
      // Surfacing handled by caller
    } finally {
      setReconnecting(false);
    }
  };

  const connectionLabel =
    resolvedConnection === 'connected'
      ? 'Socket Connected'
      : resolvedConnection === 'reconnecting' || reconnecting
        ? 'Reconnecting Stream...'
        : resolvedConnection === 'disconnected'
          ? 'Socket Disconnected'
          : 'Instance Offline';

  const connectionDotColor =
    resolvedConnection === 'connected'
      ? 'bg-[var(--calagopus-success)]'
      : resolvedConnection === 'reconnecting' || reconnecting
        ? 'bg-[var(--calagopus-warning)]'
        : resolvedConnection === 'disconnected'
          ? 'bg-[var(--calagopus-danger)]'
          : 'bg-[var(--calagopus-text-secondary)]';

  return (
    <div className="blush-page-enter space-y-5">
      <Card padding="sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-soft)] font-display text-sm font-bold text-[var(--calagopus-primary-text)] shrink-0"
              aria-hidden="true"
            >
              {getInitials(server.name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold text-[var(--calagopus-text)] truncate">
                  {server.name}
                </h1>
                <StatusBadge
                  tone={
                    server.state === 'running'
                      ? 'success'
                      : server.state === 'stopping' || server.state === 'starting'
                        ? 'warning'
                        : server.state === 'suspended'
                          ? 'danger'
                          : 'neutral'
                  }
                  label={server.state.charAt(0).toUpperCase() + server.state.slice(1)}
                />
                {server.uptimeSeconds > 0 ? (
                  <span className="font-mono text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
                    Up {formatUptime(server.uptimeSeconds)}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 font-mono text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
                {server.node} · {server.allocation} · {server.eggName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant={isRunning ? 'secondary' : 'primary'}
              size="sm"
              disabled={!canControlPower || isRunning || pendingPowerAction !== null}
              loading={pendingPowerAction === 'start'}
              leftIcon={<Play className="h-3.5 w-3.5" />}
              onClick={() => void executePowerAction('start')}
            >
              Start
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!canControlPower || pendingPowerAction !== null}
              loading={pendingPowerAction === 'restart'}
              leftIcon={<RotateCw className="h-3.5 w-3.5" />}
              onClick={() => void executePowerAction('restart')}
            >
              Restart
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!canControlPower || !isRunning || pendingPowerAction !== null}
              loading={pendingPowerAction === 'stop'}
              leftIcon={<Square className="h-3.5 w-3.5" />}
              onClick={() => {
                if (confirmDestructive) {
                  setConfirmStopOpen(true);
                } else {
                  void executePowerAction('stop');
                }
              }}
            >
              Stop
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!canControlPower || server.state === 'offline' || pendingPowerAction !== null}
              loading={pendingPowerAction === 'kill'}
              leftIcon={<OctagonAlert className="h-3.5 w-3.5" />}
              onClick={() => {
                if (confirmDestructive) {
                  setConfirmKillOpen(true);
                } else {
                  void executePowerAction('kill');
                }
              }}
            >
              Kill
            </Button>
          </div>
        </div>
      </Card>

      {!isFullscreen ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--calagopus-text-secondary)]">Memory</p>
              <p className="mt-0.5 font-mono text-[15px] font-semibold text-[var(--calagopus-text)] tabular-nums">
                {formatMegabytes(server.memoryUsedMb)}
              </p>
            </div>
            <MiniSparkline values={server.telemetryHistory.map((p) => p.memoryMb)} />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--calagopus-text-secondary)]">Disk</p>
              <p className="mt-0.5 font-mono text-[15px] font-semibold text-[var(--calagopus-text)] tabular-nums">
                {formatMegabytes(server.diskUsedMb)}
              </p>
            </div>
            <MiniSparkline values={[server.diskUsedMb * 0.96, server.diskUsedMb * 0.98, server.diskUsedMb]} />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--calagopus-text-secondary)]">Net in</p>
              <p className="mt-0.5 font-mono text-[15px] font-semibold text-[var(--calagopus-text)] tabular-nums">
                {formatBytesPerSecond(server.netInBytesSec)}
              </p>
            </div>
            <MiniSparkline values={server.telemetryHistory.map((p) => p.netInKb)} />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--calagopus-text-secondary)]">Net out</p>
              <p className="mt-0.5 font-mono text-[15px] font-semibold text-[var(--calagopus-text)] tabular-nums">
                {formatBytesPerSecond(server.netOutBytesSec)}
              </p>
            </div>
            <MiniSparkline values={server.telemetryHistory.map((p) => p.netOutKb)} />
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center justify-between gap-2 rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--calagopus-text-secondary)]">CPU</p>
              <p className="mt-0.5 font-mono text-[15px] font-semibold text-[var(--calagopus-text)] tabular-nums">
                {formatPercent(server.cpuPercent)}
              </p>
            </div>
            <MiniSparkline values={server.telemetryHistory.map((p) => p.cpu)} color="#F4A6C1" />
          </div>
        </div>
      ) : null}

      <section
        className={
          isFullscreen
            ? 'fixed inset-3 z-50 flex flex-col overflow-hidden rounded-xl border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-surface)] shadow-[var(--calagopus-shadow-popover)]'
            : 'overflow-hidden rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] shadow-[var(--calagopus-shadow-card)]'
        }
        aria-label={isFullscreen ? 'Fullscreen server console' : 'Server console'}
      >
        {/* Subtle top pink & purple terminal accent bar */}
        <div
          className="h-0.5 w-full bg-gradient-to-r from-[#F4A6C1] via-[#A78BFA] to-[#F4A6C1]/70"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-3 border-b border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2.5 text-[12px] text-[var(--calagopus-text-secondary)]">
            <Terminal className="h-3.5 w-3.5 text-[#A78BFA]" aria-hidden="true" />
            <span className={`h-2 w-2 rounded-full ${connectionDotColor}`} aria-hidden="true" />
            <span className="font-medium text-[var(--calagopus-text)]">{connectionLabel}</span>
            {resolvedConnection === 'connected' && server.latencyMs > 0 ? (
              <span className="font-mono tabular-nums">({server.latencyMs}ms ping)</span>
            ) : null}
            {onReconnect && resolvedConnection !== 'connected' ? (
              <button
                type="button"
                onClick={() => void handleReconnectClick()}
                disabled={reconnecting}
                className="blush-focus-ring inline-flex items-center gap-1 rounded-md border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--calagopus-primary-text)] hover:bg-[var(--calagopus-primary-soft)] cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${reconnecting ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Reconnect</span>
              </button>
            ) : null}
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {filteredLogs.length} / {logs.length} lines
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-44">
              <SearchField
                aria-label="Filter console output"
                placeholder="Search logs..."
                value={logSearch}
                onChange={setLogSearch}
              />
            </div>

            <div className="w-full sm:w-32">
              <SelectDropdown
                aria-label="Filter by log level"
                value={levelFilter}
                onChange={(val) =>
                  setLevelFilter((val as 'ALL' | CalagopusConsoleLine['level']) ?? 'ALL')
                }
                data={[
                  { value: 'ALL', label: 'All levels' },
                  { value: 'INFO', label: 'INFO' },
                  { value: 'WARN', label: 'WARN' },
                  { value: 'ERROR', label: 'ERROR' },
                  { value: 'CMD', label: 'CMD' },
                ]}
              />
            </div>

            <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] p-0.5">
              <Tooltip label={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}>
                <button
                  type="button"
                  aria-label={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
                  aria-pressed={autoScroll}
                  onClick={() => setAutoScroll((p) => !p)}
                  className={`blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md cursor-pointer ${
                    autoScroll
                      ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
                      : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
                  }`}
                >
                  {autoScroll ? (
                    <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </Tooltip>

              <Tooltip label="Scroll console up">
                <button
                  type="button"
                  aria-label="Scroll console up"
                  onClick={() => scrollManual('up')}
                  className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>

              <Tooltip label="Scroll console down">
                <button
                  type="button"
                  aria-label="Scroll console down"
                  onClick={() => scrollManual('down')}
                  className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>

              <Tooltip label="Toggle timestamps">
                <button
                  type="button"
                  aria-label="Toggle timestamps"
                  aria-pressed={showTimestamps}
                  onClick={() => setShowTimestamps((p) => !p)}
                  className={`blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md cursor-pointer ${
                    showTimestamps
                      ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
                      : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>

              <Tooltip label="Toggle line wrap">
                <button
                  type="button"
                  aria-label="Toggle line wrap"
                  aria-pressed={wordWrap}
                  onClick={() => setWordWrap((p) => !p)}
                  className={`blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md cursor-pointer ${
                    wordWrap
                      ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
                      : 'text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
                  }`}
                >
                  <WrapText className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>

              <Tooltip label="Decrease font size">
                <button
                  type="button"
                  aria-label="Decrease console font size"
                  onClick={() => setFontSizePx((s) => Math.max(11, s - 1))}
                  className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>

              <span className="px-1 font-mono text-[11px] text-[var(--calagopus-text-secondary)] tabular-nums select-none">
                {fontSizePx}px
              </span>

              <Tooltip label="Increase font size">
                <button
                  type="button"
                  aria-label="Increase console font size"
                  onClick={() => setFontSizePx((s) => Math.min(16, s + 1))}
                  className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>

              <Tooltip label="Copy selected or filtered output">
                <button
                  type="button"
                  aria-label="Copy console output"
                  onClick={() => void handleCopyLogs()}
                  className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>

              <Tooltip label="Download console log">
                <button
                  type="button"
                  aria-label="Download console log"
                  onClick={handleDownloadLogs}
                  className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>

              <Tooltip label="Clear visible output">
                <button
                  type="button"
                  aria-label="Clear console view"
                  onClick={onClearLogs}
                  className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-danger-bg)] hover:text-[var(--calagopus-danger-text)] cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>

              <Tooltip label={isFullscreen ? 'Exit fullscreen console' : 'Fullscreen console'}>
                <button
                  type="button"
                  aria-label={isFullscreen ? 'Exit fullscreen console' : 'Enter fullscreen console'}
                  aria-pressed={isFullscreen}
                  onClick={() => setIsFullscreen((p) => !p)}
                  className={`blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md cursor-pointer ${
                    isFullscreen
                      ? 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
                      : 'text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)]'
                  }`}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className={`relative ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
          <div
            ref={logViewportRef}
            onScroll={handleViewportScroll}
            role="log"
            aria-live="polite"
            aria-label="Server console stream"
            style={{ fontSize: `${fontSizePx}px` }}
            className={`${
              isFullscreen ? 'h-full' : 'h-[340px] sm:h-[380px]'
            } overflow-y-auto bg-[#17151E] px-4 py-3 font-mono leading-relaxed text-[#FFF8FA] ${
              wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
            }`}
          >
            {loading ? (
              <div className="space-y-2 py-2">
                <SkeletonBlock lines={5} />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-4">
                <Terminal className="h-7 w-7 text-[#A78BFA] mb-2 opacity-80" aria-hidden="true" />
                <p className="text-sm font-medium text-[#FFF8FA]">
                  {logSearch || levelFilter !== 'ALL'
                    ? 'No matching console entries'
                    : 'Console buffer cleared'}
                </p>
                <p className="mt-1 max-w-md text-xs text-[#C8B9C0]">
                  {logSearch || levelFilter !== 'ALL'
                    ? 'Clear the search filter or log level selector to inspect all captured container output.'
                    : 'Clearing visible output does not erase disk log files. Start the server or enter a command below.'}
                </p>
              </div>
            ) : (
              filteredLogs.map((line) => {
                const rowAccent =
                  line.level === 'ERROR'
                    ? 'border-l-2 border-[#F396A1] bg-[#F396A1]/10 pl-2.5 rounded-r'
                    : line.level === 'WARN'
                      ? 'border-l-2 border-[#F5C57A] bg-[#F5C57A]/10 pl-2.5 rounded-r'
                      : line.level === 'CMD'
                        ? 'border-l-2 border-[#A78BFA] bg-[#A78BFA]/10 pl-2.5 rounded-r'
                        : 'border-l-2 border-transparent pl-2.5';

                const levelColor =
                  line.level === 'WARN'
                    ? 'text-[#F5C57A]'
                    : line.level === 'ERROR'
                      ? 'text-[#F396A1]'
                      : line.level === 'CMD'
                        ? 'text-[#F7BDD2]'
                        : 'text-[#A6D8B4]';

                return (
                  <div key={line.id} className={`py-0.5 ${rowAccent}`}>
                    {showTimestamps ? (
                      <span className="text-[#C8B9C0] mr-2 select-none">[{line.timestamp}]</span>
                    ) : null}
                    <span className={`${levelColor} font-semibold mr-2`}>[{line.level}]</span>
                    <span className="text-[#C4B5FD] mr-2">[{line.source}]:</span>
                    <span>{line.message}</span>
                  </div>
                );
              })
            )}
          </div>

          {!autoScroll && !isAtBottom && filteredLogs.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setAutoScroll(true);
                scrollToLatest();
              }}
              className="blush-focus-ring absolute bottom-3 right-4 inline-flex items-center gap-1.5 rounded-lg border border-[#F4A6C1]/45 bg-[#231F2E]/95 px-3 py-1.5 font-sans text-xs font-medium text-[#FCE7EF] shadow-md hover:bg-[#2E293C] cursor-pointer"
            >
              <ArrowDownToLine className="h-3.5 w-3.5 text-[#F4A6C1]" aria-hidden="true" />
              <span>Jump to latest</span>
            </button>
          ) : null}
        </div>

        <div className="border-t border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-4 py-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[var(--calagopus-text-secondary)] mr-1">
              {commandInput.trim() ? 'Matching suggestions (Tab):' : 'Safe commands:'}
            </span>
            {commandSuggestions.length === 0 ? (
              <span className="text-[11px] text-[var(--calagopus-text-secondary)]">
                Custom console command
              </span>
            ) : (
              commandSuggestions.map((preset) => (
                <Tooltip key={preset.command} label={preset.description}>
                  <button
                    type="button"
                    disabled={!canSendConsole}
                    onClick={() => {
                      if (commandInput.trim()) {
                        setCommandInput(preset.command);
                      } else {
                        void submitCommand(preset.command);
                      }
                    }}
                    className="blush-transition blush-focus-ring rounded-md border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-2.5 py-1 font-mono text-[11px] text-[var(--calagopus-text)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-primary-text)] cursor-pointer disabled:opacity-50"
                  >
                    {preset.command}
                  </button>
                </Tooltip>
              ))
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitCommand(commandInput);
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="calagopus-console-input" className="sr-only">
              Send server console command
            </label>
            <div className="relative min-w-0 flex-1">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-[var(--calagopus-primary-text)]"
                aria-hidden="true"
              >
                &gt;
              </span>
              <input
                id="calagopus-console-input"
                type="text"
                disabled={!canSendConsole}
                value={commandInput}
                onChange={(e) => setCommandInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !canSendConsole
                    ? 'Missing control.console permission'
                    : isRunning
                      ? 'Type a command... (Tab to complete, ArrowUp/Down for history)'
                      : 'Server is offline — start container to execute commands'
                }
                className="blush-focus-ring h-10 w-full rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] pl-8 pr-3 font-mono text-[13px] text-[var(--calagopus-text)] placeholder:text-[var(--calagopus-text-secondary)] disabled:opacity-60"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={sendingCommand}
              disabled={!canSendConsole || !commandInput.trim()}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Send
            </Button>
          </form>
        </div>
      </section>

      <ConfirmDialog
        opened={confirmStopOpen}
        onClose={() => setConfirmStopOpen(false)}
        onConfirm={() => {
          setConfirmStopOpen(false);
          void executePowerAction('stop');
        }}
        title="Stop Server Gracefully"
        message={`Send stop signal to ${server.name}? Connected clients will be disconnected cleanly.`}
        confirmLabel="Stop Server"
        destructive
      />

      <ConfirmDialog
        opened={confirmKillOpen}
        onClose={() => setConfirmKillOpen(false)}
        onConfirm={() => {
          setConfirmKillOpen(false);
          void executePowerAction('kill');
        }}
        title="Force Kill Server Process"
        message={`Forcefully terminate ${server.name}? Unsaved chunk or plugin memory data could be lost.`}
        confirmLabel="Kill Process"
        destructive
      />
    </div>
  );
}
