import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeCrashLogs,
  computeBackupRetentionCandidates,
  evaluateAlertThresholds,
  parseMinecraftMotdSegments,
  parseServerProperties,
  PROMPT_21_FEATURE_MATRIX,
  redactSensitiveDiagnosticData,
  serializeServerProperties,
  translateUi,
} from './petalnodesFeatures.ts';

test('parseServerProperties and serializeServerProperties preserve comments and update keys', () => {
  const sample = [
    '# Minecraft server properties',
    'motd=Welcome to Petalnodes',
    'max-players=20',
    'pvp=true',
  ].join('\n');

  const parsed = parseServerProperties(sample);
  assert.equal(parsed.motd, 'Welcome to Petalnodes');
  assert.equal(parsed['max-players'], '20');
  assert.equal(parsed.pvp, 'true');

  const updated = serializeServerProperties(sample, {
    'max-players': '64',
    'view-distance': '10',
  });
  assert.match(updated, /^# Minecraft server properties/m);
  assert.match(updated, /^max-players=64$/m);
  assert.match(updated, /^view-distance=10$/m);
  assert.match(updated, /^pvp=true$/m);
});

test('parseMinecraftMotdSegments parses formatting codes safely without HTML', () => {
  const segments = parseMinecraftMotdSegments('&d&lPetalnodes &r&7Survival &a1.21');
  assert.equal(segments.length, 3);
  assert.deepEqual(segments[0], {
    text: 'Petalnodes ',
    color: '#FF55FF',
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
  });
  assert.equal(segments[1].bold, false);
  assert.equal(segments[1].color, '#AAAAAA');
  assert.equal(segments[2].color, '#55FF55');
});

test('analyzeCrashLogs detects OutOfMemoryError, Java mismatch, EULA, and port bind', () => {
  const findings = analyzeCrashLogs(
    [
      { level: 'ERROR', message: 'java.lang.OutOfMemoryError: Java heap space' },
      { level: 'ERROR', message: 'java.lang.UnsupportedClassVersionError: compiled by a more recent version of the Java Runtime' },
      { level: 'WARN', message: 'You need to agree to the EULA in order to run the server.' },
      { level: 'ERROR', message: '**** FAILED TO BIND TO PORT!' },
    ],
  );
  const ids = findings.map((f) => f.id).sort();
  assert.deepEqual(ids, ['eula-false', 'java-version', 'oom', 'port-bind']);
});

test('evaluateAlertThresholds reports CPU, RAM, and Disk threshold breaches', () => {
  const alerts = evaluateAlertThresholds(
    [
      {
        id: '1',
        uuidShort: 'alpha-01',
        name: 'PaperMC Survival',
        node: 'eu-west-1',
        eggName: 'PaperMC',
        allocation: '198.51.100.14:25565',
        cpuPercent: 92,
        memoryUsedMb: 7200,
        memoryLimitMb: 8192,
        diskUsedMb: 28000,
        diskLimitMb: 30720,
        state: 'running',
      },
    ],
    { cpuPercent: 85, memoryPercent: 85, diskPercent: 90 },
  );
  assert.equal(alerts.length, 3);
  assert.deepEqual(
    alerts.map((a) => a.metric),
    ['cpu', 'memory', 'disk'],
  );
});

test('redactSensitiveDiagnosticData masks tokens, passwords, and emails', () => {
  const redacted = redactSensitiveDiagnosticData({
    user: { email: 'elena@petalnodes.cloud', apiKey: 'ptlc_secret123456' },
    notes: 'Bearer eyJhbGciOiJIUzI1NiJ9.foo and ptla_admin999',
    nested: { password: 'MySuperSecretPassword' },
  });
  assert.equal(redacted.user.email, 'el***@petalnodes.cloud');
  assert.equal(redacted.user.apiKey, '[REDACTED]');
  assert.equal(redacted.nested.password, '[REDACTED]');
  assert.ok(!redacted.notes.includes('ptla_admin999'));
  assert.ok(redacted.notes.includes('[REDACTED_TOKEN]'));
});

test('computeBackupRetentionCandidates excludes locked backups', () => {
  const candidates = computeBackupRetentionCandidates(
    [
      {
        id: 'b1',
        uuidShort: 'b1',
        serverId: 'alpha-01',
        name: 'Locked Old',
        checksum: 'sha256:1',
        bytes: 100,
        createdAt: '2026-11-01 00:00',
        isLocked: true,
        isSuccessful: true,
        ignoredFiles: '',
      },
      {
        id: 'b2',
        uuidShort: 'b2',
        serverId: 'alpha-01',
        name: 'Newest',
        checksum: 'sha256:2',
        bytes: 100,
        createdAt: '2026-11-22 00:00',
        isLocked: false,
        isSuccessful: true,
        ignoredFiles: '',
      },
      {
        id: 'b3',
        uuidShort: 'b3',
        serverId: 'alpha-01',
        name: 'Older Unlocked',
        checksum: 'sha256:3',
        bytes: 100,
        createdAt: '2026-11-10 00:00',
        isLocked: false,
        isSuccessful: true,
        ignoredFiles: '',
      },
    ],
    1,
  );
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, 'b3');
});

test('PROMPT_21_FEATURE_MATRIX contains all 50 numbered practical features and i18n translates cleanly', () => {
  assert.equal(PROMPT_21_FEATURE_MATRIX.length, 50);
  assert.equal(translateUi('es', 'servers'), 'Servidores');
  assert.equal(translateUi('de', 'diagnostics'), 'Systemdiagnose');
  assert.equal(translateUi('ja', 'profile'), 'アカウント設定');
});
