import React from 'react';
import {
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  FileCode2,
  FolderOpen,
  Gamepad2,
  Image as ImageIcon,
  Layers,
  Package,
  Power,
  Save,
  Shield,
  Terminal,
  UserCheck,
  UserPlus,
  Wrench,
} from 'lucide-react';
import type {
  CalagopusConsoleLine,
  CalagopusFileEntry,
  CalagopusServerDetail,
} from '../api/calagopusCore';
import { formatBytes } from '../api/calagopusCore';
import { Button } from '../components/Button';
import { EmptyState } from '../components/FeedbackStates';
import { SelectDropdown, SwitchInput, TextInput } from '../components/FormControls';
import { showToast } from '../components/Overlays';
import { StatCard } from '../components/StatCard';
import { Card, PageHeader, StatusBadge } from '../components/Surface';
import {
  analyzeCrashLogs,
  parseMinecraftMotdSegments,
  parseServerProperties,
  serializeServerProperties,
} from '../utils/petalnodesFeatures';

export interface ServerMinecraftPageProps {
  server: CalagopusServerDetail;
  files: readonly CalagopusFileEntry[];
  consoleLogs: readonly CalagopusConsoleLine[];
  onSaveFile: (path: string, content: string) => Promise<void> | void;
  onCreateFile?: (directory: string, name: string, isDirectory: boolean) => Promise<void> | void;
  onRenameFile?: (entry: CalagopusFileEntry, nextName: string) => Promise<void> | void;
  onSendCommand?: (command: string) => Promise<void> | void;
  onNavigate: (path: string) => void;
}

interface WhitelistRecord {
  uuid: string;
  name: string;
}

interface OpRecord {
  uuid: string;
  name: string;
  level: number;
}

function safeJsonArray<T>(raw: string | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function ServerMinecraftPage({
  server,
  files,
  consoleLogs,
  onSaveFile,
  onCreateFile,
  onRenameFile,
  onSendCommand,
  onNavigate,
}: ServerMinecraftPageProps) {
  const propertiesFile = files.find((f) => f.path === '/server.properties');
  const eulaFile = files.find((f) => f.path === '/eula.txt');
  const whitelistFile = files.find((f) => f.path === '/whitelist.json');
  const opsFile = files.find((f) => f.path === '/ops.json');
  const latestLogFile = files.find((f) => f.path === '/logs/latest.log');
  const serverIconFile = files.find((f) => f.path === '/server-icon.png');

  const parsedProps = React.useMemo(
    () => parseServerProperties(propertiesFile?.content ?? ''),
    [propertiesFile?.content],
  );

  const [motd, setMotd] = React.useState(parsedProps.motd ?? '&d&lPetalnodes &r&7Survival Server');
  const [maxPlayers, setMaxPlayers] = React.useState(parsedProps['max-players'] ?? '40');
  const [gamemode, setGamemode] = React.useState(parsedProps.gamemode ?? 'survival');
  const [difficulty, setDifficulty] = React.useState(parsedProps.difficulty ?? 'normal');
  const [pvp, setPvp] = React.useState((parsedProps.pvp ?? 'true') === 'true');
  const [whitelistEnabled, setWhitelistEnabled] = React.useState(
    (parsedProps['white-list'] ?? 'false') === 'true',
  );
  const [onlineMode, setOnlineMode] = React.useState(
    (parsedProps['online-mode'] ?? 'true') === 'true',
  );
  const [viewDistance, setViewDistance] = React.useState(parsedProps['view-distance'] ?? '10');
  const [allowFlight, setAllowFlight] = React.useState(
    (parsedProps['allow-flight'] ?? 'false') === 'true',
  );

  React.useEffect(() => {
    setMotd(parsedProps.motd ?? '&d&lPetalnodes &r&7Survival Server');
    setMaxPlayers(parsedProps['max-players'] ?? '40');
    setGamemode(parsedProps.gamemode ?? 'survival');
    setDifficulty(parsedProps.difficulty ?? 'normal');
    setPvp((parsedProps.pvp ?? 'true') === 'true');
    setWhitelistEnabled((parsedProps['white-list'] ?? 'false') === 'true');
    setOnlineMode((parsedProps['online-mode'] ?? 'true') === 'true');
    setViewDistance(parsedProps['view-distance'] ?? '10');
    setAllowFlight((parsedProps['allow-flight'] ?? 'false') === 'true');
  }, [parsedProps]);

  const [playerInput, setPlayerInput] = React.useState('');
  const [banReason, setBanReason] = React.useState('');
  const [iconPreviewUrl, setIconPreviewUrl] = React.useState<string | null>(null);
  const iconInputRef = React.useRef<HTMLInputElement | null>(null);

  const eulaAccepted = (eulaFile?.content ?? '').toLowerCase().includes('eula=true');

  const whitelistEntries = React.useMemo(
    () => safeJsonArray<WhitelistRecord>(whitelistFile?.content),
    [whitelistFile?.content],
  );
  const opEntries = React.useMemo(
    () => safeJsonArray<OpRecord>(opsFile?.content),
    [opsFile?.content],
  );

  const pluginsAndMods = React.useMemo(
    () =>
      files.filter(
        (f) =>
          !f.isDirectory &&
          (f.directory === '/plugins' || f.directory === '/mods') &&
          (f.name.endsWith('.jar') || f.name.endsWith('.jar.disabled')),
      ),
    [files],
  );

  const worldDirs = React.useMemo(
    () =>
      files.filter(
        (f) =>
          f.isDirectory &&
          f.directory === '/' &&
          (f.name === 'world' || f.name.startsWith('world_')),
      ),
    [files],
  );

  const crashFindings = React.useMemo(
    () => analyzeCrashLogs(consoleLogs, latestLogFile?.content ?? ''),
    [consoleLogs, latestLogFile?.content],
  );

  const motdSegments = React.useMemo(() => parseMinecraftMotdSegments(motd), [motd]);

  const handleSaveProperties = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = serializeServerProperties(propertiesFile?.content ?? '', {
      motd,
      'max-players': String(Math.max(1, Number(maxPlayers) || 20)),
      gamemode,
      difficulty,
      pvp: String(pvp),
      'white-list': String(whitelistEnabled),
      'online-mode': String(onlineMode),
      'view-distance': String(Math.min(32, Math.max(2, Number(viewDistance) || 10))),
      'allow-flight': String(allowFlight),
    });
    try {
      await Promise.resolve(onSaveFile('/server.properties', updated));
      showToast({
        title: 'server.properties saved',
        message: 'Restart the server or run /reload to apply updated settings.',
        tone: 'success',
      });
    } catch {
      // Caller surfaces error
    }
  };

  const handleAcceptEula = async () => {
    const content = `# Petalnodes EULA acceptance\n# ${new Date().toISOString()}\neula=true\n`;
    try {
      if (!eulaFile && onCreateFile) {
        await Promise.resolve(onCreateFile('/', 'eula.txt', false));
      }
      await Promise.resolve(onSaveFile('/eula.txt', content));
      showToast({
        title: 'Minecraft EULA accepted',
        message: 'Updated /eula.txt with eula=true.',
        tone: 'success',
      });
    } catch {
      // Caller surfaces error
    }
  };

  const handleAddPlayerToList = async (target: 'whitelist' | 'op' | 'ban') => {
    const cleanName = playerInput.trim();
    if (!/^[a-zA-Z0-9_]{2,16}$/.test(cleanName)) {
      showToast({
        title: 'Invalid username',
        message: 'Minecraft usernames use 2–16 letters, numbers, or underscores.',
        tone: 'warning',
      });
      return;
    }

    if (target === 'whitelist') {
      if (!whitelistEntries.some((p) => p.name.toLowerCase() === cleanName.toLowerCase())) {
        const next = [
          ...whitelistEntries,
          { uuid: `offline-${cleanName.toLowerCase()}`, name: cleanName },
        ];
        await Promise.resolve(onSaveFile('/whitelist.json', JSON.stringify(next, null, 2)));
      }
      if (onSendCommand) {
        await Promise.resolve(onSendCommand(`whitelist add ${cleanName}`));
      }
      showToast({ title: 'Whitelist updated', message: `Added ${cleanName}`, tone: 'success' });
    } else if (target === 'op') {
      if (!opEntries.some((p) => p.name.toLowerCase() === cleanName.toLowerCase())) {
        const next = [
          ...opEntries,
          { uuid: `offline-${cleanName.toLowerCase()}`, name: cleanName, level: 4 },
        ];
        await Promise.resolve(onSaveFile('/ops.json', JSON.stringify(next, null, 2)));
      }
      if (onSendCommand) {
        await Promise.resolve(onSendCommand(`op ${cleanName}`));
      }
      showToast({ title: 'Operator granted', message: `Granted OP to ${cleanName}`, tone: 'success' });
    } else {
      const cmd = banReason.trim() ? `ban ${cleanName} ${banReason.trim()}` : `ban ${cleanName}`;
      if (onSendCommand) {
        await Promise.resolve(onSendCommand(cmd));
      }
      showToast({ title: 'Ban command dispatched', message: cmd, tone: 'warning' });
    }
    setPlayerInput('');
    setBanReason('');
  };

  const handleRemoveWhitelist = async (name: string) => {
    const next = whitelistEntries.filter((p) => p.name !== name);
    await Promise.resolve(onSaveFile('/whitelist.json', JSON.stringify(next, null, 2)));
    if (onSendCommand) await Promise.resolve(onSendCommand(`whitelist remove ${name}`));
    showToast({ title: 'Removed from whitelist', message: name, tone: 'info' });
  };

  const handleRemoveOp = async (name: string) => {
    const next = opEntries.filter((p) => p.name !== name);
    await Promise.resolve(onSaveFile('/ops.json', JSON.stringify(next, null, 2)));
    if (onSendCommand) await Promise.resolve(onSendCommand(`deop ${name}`));
    showToast({ title: 'Operator revoked', message: name, tone: 'info' });
  };

  const handleIconFileCheck = (file: File) => {
    if (file.type !== 'image/png') {
      showToast({
        title: 'PNG required',
        message: 'Minecraft requires server-icon.png to be a 64×64 PNG image.',
        tone: 'warning',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const img = new Image();
      img.onload = () => {
        if (img.width !== 64 || img.height !== 64) {
          showToast({
            title: 'Invalid dimensions',
            message: `Uploaded image is ${img.width}×${img.height}. Minecraft requires 64×64 pixels.`,
            tone: 'warning',
          });
          return;
        }
        setIconPreviewUrl(reader.result as string);
        showToast({
          title: '64×64 PNG validated',
          message: 'Use File Manager upload in / to write server-icon.png onto Wings.',
          tone: 'success',
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="blush-page-enter space-y-6">
      <PageHeader
        title="Minecraft & Server Tools"
        description={`Visual server.properties editor, live MOTD preview, whitelist/OP control, plugin toggle, world overview, and crash analyzer for ${server.name}.`}
        metadata={[server.eggName, server.allocation, eulaAccepted ? 'EULA Accepted' : 'EULA Pending']}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FolderOpen className="h-3.5 w-3.5" />}
              onClick={() => onNavigate(`/server/${server.uuidShort}/files`)}
            >
              File Manager
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              onClick={() => onNavigate(`/server/${server.uuidShort}/startup`)}
            >
              Versions &amp; Flags
            </Button>
            {!eulaAccepted ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                onClick={() => void handleAcceptEula()}
              >
                Accept EULA
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Quick KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="EULA Compliance"
          value={eulaAccepted ? 'Accepted' : 'Pending'}
          helper={eulaFile ? '/eula.txt detected' : 'Will create /eula.txt'}
          icon={<Shield className="h-4 w-4" />}
        />
        <StatCard
          label="Plugins & Mods"
          value={pluginsAndMods.length}
          helper={`${pluginsAndMods.filter((p) => p.name.endsWith('.jar')).length} active · ${pluginsAndMods.filter((p) => p.name.endsWith('.disabled')).length} disabled`}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          label="Whitelist & Ops"
          value={`${whitelistEntries.length} / ${opEntries.length}`}
          helper="Managed in whitelist.json & ops.json"
          icon={<UserCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Crash Signatures"
          value={crashFindings.length}
          helper={crashFindings.length === 0 ? 'No known crash errors found' : 'Review diagnostics below'}
          icon={<Wrench className="h-4 w-4" />}
        />
      </div>

      {/* Visual server.properties & Live MOTD Previewer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Visual server.properties Editor"
          description="Edits are written directly to /server.properties without losing file comments."
          headerAction={
            <StatusBadge
              tone={propertiesFile ? 'success' : 'warning'}
              label={propertiesFile ? '/server.properties loaded' : 'Using defaults'}
            />
          }
        >
          <form onSubmit={handleSaveProperties} className="space-y-4">
            <TextInput
              label="Server MOTD (supports & / § color codes)"
              value={motd}
              onChange={(e) => setMotd(e.currentTarget.value)}
            />

            {/* Live Minecraft Multiplayer List MOTD Preview */}
            <div className="rounded-xl border border-[var(--calagopus-border)] bg-[#14131A] p-3.5 text-white">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-[#232030]">
                  {iconPreviewUrl ? (
                    <img src={iconPreviewUrl} alt="Server icon 64x64" className="h-14 w-14 object-cover" />
                  ) : (
                    <Gamepad2 className="h-6 w-6 text-[#F4A6C1]" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[13.5px] font-semibold text-white truncate">
                      {server.name}
                    </span>
                    <span className="font-mono text-[11px] text-[#AAAAAA]">0/{maxPlayers}</span>
                  </div>
                  <p className="mt-1 font-mono text-[12.5px] leading-snug break-words">
                    {motdSegments.length === 0 ? (
                      <span className="text-[#AAAAAA]">(Empty MOTD)</span>
                    ) : (
                      motdSegments.map((seg, i) => (
                        <span
                          key={`${i}-${seg.text}`}
                          style={{
                            color: seg.color,
                            fontWeight: seg.bold ? 700 : 400,
                            fontStyle: seg.italic ? 'italic' : 'normal',
                            textDecoration: [
                              seg.underline ? 'underline' : '',
                              seg.strikethrough ? 'line-through' : '',
                            ]
                              .filter(Boolean)
                              .join(' ') || undefined,
                          }}
                        >
                          {seg.text}
                        </span>
                      ))
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextInput
                label="Max Players"
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.currentTarget.value)}
              />
              <TextInput
                label="View Distance"
                type="number"
                value={viewDistance}
                onChange={(e) => setViewDistance(e.currentTarget.value)}
              />
              <SelectDropdown
                label="Gamemode"
                value={gamemode}
                onChange={(v) => v && setGamemode(v)}
                data={[
                  { value: 'survival', label: 'Survival' },
                  { value: 'creative', label: 'Creative' },
                  { value: 'adventure', label: 'Adventure' },
                  { value: 'spectator', label: 'Spectator' },
                ]}
              />
              <SelectDropdown
                label="Difficulty"
                value={difficulty}
                onChange={(v) => v && setDifficulty(v)}
                data={[
                  { value: 'peaceful', label: 'Peaceful' },
                  { value: 'easy', label: 'Easy' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'hard', label: 'Hard' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
              <SwitchInput label="Enable PvP Combat (pvp)" checked={pvp} onChange={setPvp} />
              <SwitchInput
                label="Enforce Whitelist (white-list)"
                checked={whitelistEnabled}
                onChange={setWhitelistEnabled}
              />
              <SwitchInput
                label="Mojang Online Auth (online-mode)"
                checked={onlineMode}
                onChange={setOnlineMode}
              />
              <SwitchInput
                label="Allow Flight (allow-flight)"
                checked={allowFlight}
                onChange={setAllowFlight}
              />
            </div>

            <div className="flex justify-end border-t border-[var(--calagopus-border)] pt-3">
              <Button type="submit" variant="primary" size="sm" leftIcon={<Save className="h-3.5 w-3.5" />}>
                Save server.properties
              </Button>
            </div>
          </form>
        </Card>

        {/* Server Icon & Worlds Column */}
        <div className="space-y-6">
          <Card
            title="Server Icon (64×64 PNG)"
            description="Validates image format and exact pixel dimensions before uploading to /server-icon.png."
            headerAction={<ImageIcon className="h-4 w-4 text-[var(--calagopus-primary-text)]" aria-hidden="true" />}
          >
            <div className="space-y-3">
              <input
                ref={iconInputRef}
                type="file"
                accept="image/png"
                className="hidden"
                aria-label="Validate server-icon.png"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  if (file) handleIconFileCheck(file);
                }}
              />
              <div className="flex items-center gap-3 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--calagopus-border)] bg-[#14131A]">
                  {iconPreviewUrl ? (
                    <img src={iconPreviewUrl} alt="Validated icon" className="h-12 w-12" />
                  ) : (
                    <Gamepad2 className="h-5 w-5 text-[#F4A6C1]" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 text-[12px]">
                  <p className="font-medium text-[var(--calagopus-text)]">
                    {serverIconFile ? 'server-icon.png detected' : iconPreviewUrl ? '64×64 PNG validated' : 'No custom icon set'}
                  </p>
                  <p className="text-[var(--calagopus-text-secondary)]">Must be 64×64 PNG</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => iconInputRef.current?.click()}>
                  Validate 64×64 PNG
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(`/server/${server.uuidShort}/files`)}
                >
                  Open Root Files
                </Button>
              </div>
            </div>
          </Card>

          <Card
            title="World & Dimensions"
            description="Detected level folders in server root."
            headerAction={
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Archive className="h-3.5 w-3.5" />}
                onClick={() => onNavigate(`/server/${server.uuidShort}/backups`)}
              >
                Backup World
              </Button>
            }
          >
            {worldDirs.length === 0 ? (
              <EmptyState
                title="No world folders scanned yet"
                description="World directories (/world, /world_nether, /world_the_end) appear once initialized."
              />
            ) : (
              <ul className="space-y-2">
                {worldDirs.map((dir) => (
                  <li
                    key={dir.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-3 py-2 text-[12.5px]"
                  >
                    <div>
                      <p className="font-mono font-medium text-[var(--calagopus-text)]">{dir.path}</p>
                      <p className="text-[11px] text-[var(--calagopus-text-secondary)]">
                        Updated {dir.modifiedAt}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(`/server/${server.uuidShort}/files`)}
                    >
                      Browse
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Whitelist, OP, Ban List & Plugin/Mod Toggle */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Player Access · Whitelist, OP & Ban Control"
          description="Updates whitelist.json / ops.json and dispatches live console commands."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <TextInput
                label="Player Username"
                placeholder="e.g. Steve"
                value={playerInput}
                onChange={(e) => setPlayerInput(e.currentTarget.value)}
              />
              <TextInput
                label="Ban Reason (optional)"
                placeholder="Griefing / Rule violation"
                value={banReason}
                onChange={(e) => setBanReason(e.currentTarget.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                onClick={() => void handleAddPlayerToList('whitelist')}
              >
                Add Whitelist
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Shield className="h-3.5 w-3.5" />}
                onClick={() => void handleAddPlayerToList('op')}
              >
                Grant OP
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Ban className="h-3.5 w-3.5" />}
                onClick={() => void handleAddPlayerToList('ban')}
              >
                Ban Player
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-[var(--calagopus-border)] pt-3">
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-[var(--calagopus-text)]">
                  Whitelisted ({whitelistEntries.length})
                </p>
                {whitelistEntries.length === 0 ? (
                  <p className="text-[12px] text-[var(--calagopus-text-secondary)]">No entries in whitelist.json.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {whitelistEntries.map((p) => (
                      <li
                        key={p.name}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2.5 py-1.5 text-[12px]"
                      >
                        <span className="font-mono text-[var(--calagopus-text)]">{p.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => void handleRemoveWhitelist(p.name)}>
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-[var(--calagopus-text)]">
                  Operators ({opEntries.length})
                </p>
                {opEntries.length === 0 ? (
                  <p className="text-[12px] text-[var(--calagopus-text-secondary)]">No operators in ops.json.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {opEntries.map((p) => (
                      <li
                        key={p.name}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-2.5 py-1.5 text-[12px]"
                      >
                        <span className="font-mono text-[var(--calagopus-text)]">
                          {p.name} (Lvl {p.level})
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => void handleRemoveOp(p.name)}>
                          Deop
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="Plugins & Mods (.jar Toggle)"
          description="Enable or disable server JARs by renaming between .jar and .jar.disabled."
          headerAction={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate(`/server/${server.uuidShort}/files`)}
            >
              Upload .jar
            </Button>
          }
        >
          {pluginsAndMods.length === 0 ? (
            <EmptyState
              icon={<Package className="h-5 w-5" />}
              title="No plugins or mods detected"
              description="Upload .jar plugins to /plugins or mods to /mods in the File Manager."
              actionLabel="Open File Manager"
              onAction={() => onNavigate(`/server/${server.uuidShort}/files`)}
            />
          ) : (
            <ul className="divide-y divide-[var(--calagopus-border)]">
              {pluginsAndMods.map((entry) => {
                const enabled = !entry.name.endsWith('.disabled');
                const nextName = enabled
                  ? `${entry.name}.disabled`
                  : entry.name.replace(/\.disabled$/, '');
                return (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[12.5px] font-medium text-[var(--calagopus-text)] truncate">
                        {entry.name}
                      </p>
                      <p className="text-[11px] text-[var(--calagopus-text-secondary)]">
                        {entry.directory} · {formatBytes(entry.sizeBytes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge
                        tone={enabled ? 'success' : 'neutral'}
                        label={enabled ? 'Enabled' : 'Disabled'}
                      />
                      {onRenameFile ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Power className="h-3.5 w-3.5" />}
                          onClick={() => {
                            void Promise.resolve(onRenameFile(entry, nextName)).then(() => {
                              showToast({
                                title: enabled ? 'Plugin disabled' : 'Plugin enabled',
                                message: `Renamed to ${nextName}. Restart server to apply.`,
                                tone: 'info',
                              });
                            });
                          }}
                        >
                          {enabled ? 'Disable' : 'Enable'}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Crash Log Analyzer */}
      <Card
        title="Crash & Startup Log Analyzer"
        description="Scans recent console output and /logs/latest.log for JVM OOM, port bind, Java mismatch, EULA, or plugin failures."
        headerAction={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Terminal className="h-3.5 w-3.5" />}
            onClick={() => onNavigate(`/server/${server.uuidShort}`)}
          >
            Open Live Console
          </Button>
        }
      >
        {crashFindings.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--calagopus-success-border)] bg-[var(--calagopus-success-bg)] p-3.5 text-[13px] text-[var(--calagopus-success-text)]">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>No crash signatures or startup errors found in current logs.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {crashFindings.map((finding) => (
              <div
                key={finding.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--calagopus-warning-border)] bg-[var(--calagopus-warning-bg)] p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[var(--calagopus-warning-text)] shrink-0" aria-hidden="true" />
                    <span className="text-[13px] font-semibold text-[var(--calagopus-warning-text)]">
                      {finding.title}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[var(--calagopus-text)]">{finding.remediation}</p>
                  <p className="font-mono text-[11px] text-[var(--calagopus-text-secondary)] truncate">
                    {finding.matchedLine}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<FileCode2 className="h-3.5 w-3.5" />}
                  onClick={() => onNavigate(`/server/${server.uuidShort}/${finding.targetSubRoute}`)}
                >
                  Fix Now
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
