import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPanelNotifications,
  classifyAdminExtension,
  classifyFileVisualKind,
  filterAdminExtensions,
  filterAndSortBackups,
  filterAndSortServers,
  filterConsoleSuggestions,
  generateExtensionBuildLog,
  resolveSafeMoveTarget,
  tokenizeSyntaxLine,
  validateExtensionUploadFile,
} from './panelEnhancements';

test('buildPanelNotifications reflects real errors, suspended/high-CPU servers, and activity', () => {
  const notifications = buildPanelNotifications(
    [
      {
        id: '1',
        uuidShort: 'srv-1',
        name: 'Alpha SMP',
        node: 'eu-west-1',
        allocation: '198.51.100.14:25565',
        eggName: 'Paper 1.21',
        state: 'running',
        cpuPercent: 92.4,
        memoryUsedMb: 4096,
        memoryLimitMb: 8192,
        diskUsedMb: 10000,
        diskLimitMb: 20000,
      },
      {
        id: '2',
        uuidShort: 'srv-2',
        name: 'Suspended Box',
        node: 'us-east-2',
        allocation: '203.0.113.10:25566',
        eggName: 'Vanilla',
        state: 'suspended',
        cpuPercent: 0,
        memoryUsedMb: 0,
        memoryLimitMb: 2048,
        diskUsedMb: 1000,
        diskLimitMb: 10000,
      },
    ],
    [
      {
        id: 'act-1',
        event: 'server:power.start',
        description: 'Started Alpha SMP',
        actor: 'elena',
        ipAddress: '127.0.0.1',
        timestamp: '2026-11-23 12:00',
        status: 'completed',
      },
    ],
    'API timeout',
  );

  assert.equal(notifications[0]?.severity, 'danger');
  assert.ok(notifications.some((n) => n.title.includes('High CPU')));
  assert.ok(notifications.some((n) => n.title.includes('suspended')));
  assert.ok(notifications.some((n) => n.title === 'Started Alpha SMP'));
});

test('filterAndSortServers filters by query, status, software category, and sorts numerically', () => {
  const servers = [
    {
      id: '1',
      uuidShort: 'a1',
      name: 'Survival SMP',
      node: 'eu-west-1',
      allocation: '198.51.100.14:25565',
      eggName: 'Paper 1.21.4',
      state: 'running' as const,
      cpuPercent: 32,
      memoryUsedMb: 4000,
      memoryLimitMb: 8192,
      diskUsedMb: 12000,
      diskLimitMb: 40000,
    },
    {
      id: '2',
      uuidShort: 'b2',
      name: 'Modded ATM9',
      node: 'us-east-1',
      allocation: '203.0.113.20:25565',
      eggName: 'NeoForge 1.21',
      state: 'offline' as const,
      cpuPercent: 0,
      memoryUsedMb: 0,
      memoryLimitMb: 12288,
      diskUsedMb: 24000,
      diskLimitMb: 50000,
    },
    {
      id: '3',
      uuidShort: 'c3',
      name: 'Edge Proxy',
      node: 'eu-west-1',
      allocation: '198.51.100.14:25577',
      eggName: 'Velocity Proxy',
      state: 'running' as const,
      cpuPercent: 64,
      memoryUsedMb: 1024,
      memoryLimitMb: 2048,
      diskUsedMb: 500,
      diskLimitMb: 5000,
    },
  ];

  const moddedOnly = filterAndSortServers(servers, {
    query: '',
    stateFilter: 'all',
    categoryFilter: 'Modded',
    sortKey: 'name',
    sortDirection: 'asc',
  });
  assert.equal(moddedOnly.length, 1);
  assert.equal(moddedOnly[0]?.uuidShort, 'b2');

  const runningDescCpu = filterAndSortServers(servers, {
    query: '',
    stateFilter: 'running',
    categoryFilter: 'all',
    sortKey: 'cpuPercent',
    sortDirection: 'desc',
  });
  assert.deepEqual(
    runningDescCpu.map((s) => s.uuidShort),
    ['c3', 'a1'],
  );
});

test('classifyAdminExtension groups extensions into Theme, Minecraft, Integrations, Infrastructure', () => {
  assert.equal(
    classifyAdminExtension({
      identifier: 'cloud.petalnodes.sanctuary',
      name: 'Petalnodes Sanctuary Theme',
      version: '2.1.0',
      author: 'Petalnodes',
      status: 'active',
      description: 'Light and dark theme',
    }).category,
    'Theme',
  );
  assert.equal(
    classifyAdminExtension({
      identifier: 'gg.ir77.mcversionchooser',
      name: 'MC Version Chooser',
      version: '1.2.0',
      author: 'ir77',
      status: 'active',
      description: 'Minecraft jar picker',
    }).category,
    'Minecraft',
  );
  assert.equal(
    classifyAdminExtension({
      identifier: 'dev.caloptreyx.gdrive',
      name: 'Google Drive Backups',
      version: '1.0.1',
      author: 'caloptreyx',
      status: 'disabled',
      description: 'Remote cloud backup sync',
    }).category,
    'Integrations',
  );
});

test('filterAdminExtensions, validateExtensionUploadFile, and generateExtensionBuildLog work reliably', () => {
  const list = [
    classifyAdminExtension({
      identifier: 'cloud.petalnodes.sanctuary',
      name: 'Petalnodes Sanctuary Theme',
      version: '2.1.0',
      author: 'Petalnodes',
      status: 'active',
      description: 'Light and dark theme',
    }),
    classifyAdminExtension({
      identifier: 'dev.caloptreyx.gdrive',
      name: 'Google Drive Backups',
      version: '2.0.1',
      author: 'Caloptreyx',
      status: 'disabled',
      description: 'Remote cloud backup sync',
    }),
  ];

  assert.equal(filterAdminExtensions(list, 'petalnodes', 'Theme', 'active').length, 1);
  assert.equal(filterAdminExtensions(list, '', 'all', 'disabled').length, 1);

  assert.equal(validateExtensionUploadFile({ name: 'theme.c7s.zip', size: 10240 }), null);
  assert.ok(validateExtensionUploadFile({ name: 'script.sh', size: 100 }));
  assert.ok(validateExtensionUploadFile({ name: 'empty.c7s.zip', size: 0 }));

  const logs = generateExtensionBuildLog(list[0]);
  assert.ok(logs.some((line) => line.includes('cloud_petalnodes_sanctuary')));
});

test('classifyFileVisualKind recognizes folders, jars, archives, configs, logs, and text', () => {
  assert.equal(classifyFileVisualKind('plugins', true), 'folder');
  assert.equal(classifyFileVisualKind('paper-1.21.jar', false), 'jar');
  assert.equal(classifyFileVisualKind('world-backup.tar.gz', false), 'archive');
  assert.equal(classifyFileVisualKind('server.properties', false), 'code');
  assert.equal(classifyFileVisualKind('latest.log', false), 'log');
  assert.equal(classifyFileVisualKind('eula.txt', false), 'text');
});

test('filterConsoleSuggestions returns matching presets and handles leading slash', () => {
  const defaults = filterConsoleSuggestions('');
  assert.equal(defaults.length, 5);
  const matched = filterConsoleSuggestions('/white');
  assert.equal(matched[0]?.command, 'whitelist list');
  assert.equal(filterConsoleSuggestions('tps')[0]?.command, 'tps');
});

test('resolveSafeMoveTarget prevents directory traversal outside server container root', () => {
  const safe = resolveSafeMoveTarget('../../plugins/../config/', 'paper.yml');
  assert.deepEqual(safe, { directory: '/config', path: '/config/paper.yml' });

  const rootTarget = resolveSafeMoveTarget('/', 'server.properties');
  assert.deepEqual(rootTarget, { directory: '/', path: '/server.properties' });

  const invalid = resolveSafeMoveTarget('/plugins', '..');
  assert.ok('error' in invalid);
});

test('tokenizeSyntaxLine classifies JSON, YAML/properties, and log warning/error tokens', () => {
  const jsonTokens = tokenizeSyntaxLine('  "online-mode": true,', 'ops.json');
  assert.equal(jsonTokens.find((t) => t.kind === 'key')?.text, '"online-mode"');
  assert.equal(jsonTokens.find((t) => t.kind === 'boolean')?.text, 'true');

  const propTokens = tokenizeSyntaxLine('max-players=40', 'server.properties');
  assert.equal(propTokens[0]?.kind, 'key');
  assert.equal(propTokens[0]?.text, 'max-players');
  assert.equal(propTokens[2]?.kind, 'number');

  const logError = tokenizeSyntaxLine('[12:00:01 ERROR]: OutOfMemoryError', 'latest.log');
  assert.equal(logError[0]?.kind, 'level-error');
});

test('filterAndSortBackups filters by status and sorts by bytes, name, and date', () => {
  const sample = [
    {
      id: 'b1',
      uuidShort: '1111aaaa',
      name: 'Pre-Reset Archive',
      checksum: 'sha256:111',
      bytes: 2048,
      createdAt: '2026-11-20 10:00',
      isLocked: true,
      isSuccessful: true,
    },
    {
      id: 'b2',
      uuidShort: '2222bbbb',
      name: 'Alpha Daily',
      checksum: 'sha256:222',
      bytes: 512,
      createdAt: '2026-11-22 10:00',
      isLocked: false,
      isSuccessful: false,
    },
    {
      id: 'b3',
      uuidShort: '3333cccc',
      name: 'Nightly Backup',
      checksum: 'sha256:333',
      bytes: 4096,
      createdAt: '2026-11-21 10:00',
      isLocked: false,
      isSuccessful: true,
    },
  ];

  assert.equal(
    filterAndSortBackups(sample, {
      query: '',
      statusFilter: 'locked',
      sortKey: 'createdAt',
      sortDirection: 'desc',
    }).length,
    1,
  );
  assert.equal(
    filterAndSortBackups(sample, {
      query: '',
      statusFilter: 'failed',
      sortKey: 'createdAt',
      sortDirection: 'desc',
    })[0]?.id,
    'b2',
  );
  assert.deepEqual(
    filterAndSortBackups(sample, {
      query: '',
      statusFilter: 'all',
      sortKey: 'bytes',
      sortDirection: 'desc',
    }).map((b) => b.id),
    ['b3', 'b1', 'b2'],
  );
});

