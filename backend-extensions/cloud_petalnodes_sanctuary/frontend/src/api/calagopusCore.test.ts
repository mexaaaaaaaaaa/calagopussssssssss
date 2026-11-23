import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeUtf8ToBase64,
  extractSafeApiErrorMessage,
  filterApiKeys,
  filterConsoleLines,
  filterFilesByQuery,
  formatBytes,
  formatUptime,
  nextRuntimeStateForPowerAction,
  normalizeDirectoryPath,
  paginateSlice,
  resolveDirectoryBreadcrumbs,
  SANDBOX_API_KEYS,
  SANDBOX_CONSOLE_LOGS,
  SANDBOX_SERVER_FILES,
  sanitizeDownloadFilename,
  sanitizeHref,
  sanitizeImageSrc,
  sanitizeSubEndpoint,
  sortFiles,
  validateApiKeyInput,
  validateFileMode,
  validateFilename,
  validateServerIdentifier,
} from './calagopusCore.ts';

test('formatBytes and formatUptime render tabular human-readable units', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(4096), '4.0 KiB');
  assert.equal(formatBytes(1048576), '1.00 MiB');
  assert.equal(formatBytes(19327352832), '18.0 GiB');

  assert.equal(formatUptime(0), 'Offline');
  assert.equal(formatUptime(230280), '2d 15h 58m');
});

test('normalizeDirectoryPath and resolveDirectoryBreadcrumbs prevent traversal escapes', () => {
  assert.equal(normalizeDirectoryPath('/../../etc/passwd'), '/etc/passwd');
  assert.equal(normalizeDirectoryPath('/config/../world/./region'), '/world/region');
  assert.equal(normalizeDirectoryPath('..\\..\\..'), '/');

  assert.deepEqual(resolveDirectoryBreadcrumbs('/'), [{ label: 'container', path: '/' }]);
  assert.deepEqual(resolveDirectoryBreadcrumbs('/config/world/'), [
    { label: 'container', path: '/' },
    { label: 'config', path: '/config' },
    { label: 'world', path: '/config/world' },
  ]);
});

test('filterFilesByQuery and sortFiles keep directories grouped first', () => {
  const rootFiles = filterFilesByQuery(SANDBOX_SERVER_FILES, '/', '');
  assert.ok(rootFiles.some((f) => f.name === 'server.properties'));
  assert.ok(!rootFiles.some((f) => f.name === 'paper-global.yml'));

  const filtered = filterFilesByQuery(SANDBOX_SERVER_FILES, '/', 'bukkit');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.name, 'bukkit.yml');

  const sorted = sortFiles(rootFiles, 'name', 'desc');
  const firstFileIdx = sorted.findIndex((entry) => !entry.isDirectory);
  assert.ok(firstFileIdx > 0);
  assert.ok(sorted.slice(0, firstFileIdx).every((entry) => entry.isDirectory));
});

test('validateFilename, validateFileMode, and sanitizeDownloadFilename enforce safe inputs', () => {
  assert.equal(validateFilename('', ['eula.txt']), 'Name is required.');
  assert.equal(validateFilename('..', ['eula.txt']), 'Reserved relative path is not allowed.');
  assert.equal(
    validateFilename('bad/name.txt', ['eula.txt']),
    'Name cannot contain slashes or null characters.',
  );
  assert.equal(
    validateFilename('EULA.txt', ['eula.txt']),
    '"EULA.txt" already exists in this directory.',
  );
  assert.equal(validateFilename('paper-world.yml', ['eula.txt']), null);

  assert.equal(validateFileMode('-rw-r--r--'), null);
  assert.equal(validateFileMode('644'), null);
  assert.ok(validateFileMode('invalid-mode'));

  assert.equal(sanitizeDownloadFilename('../../secret.yml'), '.._.._secret.yml');
  assert.equal(sanitizeDownloadFilename('..'), 'download.bin');
});

test('filterConsoleLines and nextRuntimeStateForPowerAction operate cleanly', () => {
  const warnLines = filterConsoleLines(SANDBOX_CONSOLE_LOGS, 'WARN');
  assert.equal(warnLines.length, 1);
  assert.equal(warnLines[0]?.source, 'PaperVersionCheck');

  assert.equal(nextRuntimeStateForPowerAction('start'), 'running');
  assert.equal(nextRuntimeStateForPowerAction('stop'), 'stopping');
  assert.equal(nextRuntimeStateForPowerAction('kill'), 'offline');
});

test('filterApiKeys, strict IPv4/IPv6 validateApiKeyInput, and paginateSlice work reliably', () => {
  const filtered = filterApiKeys(SANDBOX_API_KEYS, 'prometheus', 'all');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.identifier, 'ptlc_01J8K3M9');

  const scoped = filterApiKeys(SANDBOX_API_KEYS, '', 'backup.create');
  assert.equal(scoped.length, 1);

  const invalid = validateApiKeyInput('ab', 'not-an-ip');
  assert.ok(invalid.descriptionError);
  assert.ok(invalid.allowedIpsError);

  assert.ok(validateApiKeyInput('Bad Octet', '999.0.0.1').allowedIpsError);
  assert.ok(validateApiKeyInput('Bad Colon Injection', 'javascript:alert(1)').allowedIpsError);

  const valid = validateApiKeyInput('Deploy Worker', '192.0.2.10, 198.51.100.0/24, 2001:db8::/32');
  assert.equal(valid.descriptionError, undefined);
  assert.equal(valid.allowedIpsError, undefined);
  assert.deepEqual(valid.parsedIps, ['192.0.2.10', '198.51.100.0/24', '2001:db8::/32']);

  const page2 = paginateSlice(SANDBOX_API_KEYS, 2, 4);
  assert.equal(page2.safePage, 2);
  assert.equal(page2.pageItems.length, 2);
});

test('sanitizeHref, server identifier, sub-endpoint, and API error extractor block unsafe values', async () => {
  assert.equal(sanitizeHref('javascript:alert(1)'), undefined);
  assert.equal(sanitizeHref('  data:text/html,<script>alert(1)</script>'), undefined);
  assert.equal(sanitizeHref('//evil.example.com'), undefined);
  assert.equal(sanitizeHref('https://petalnodes.cloud'), 'https://petalnodes.cloud/');
  assert.equal(sanitizeHref('/account/security'), '/account/security');

  assert.equal(validateServerIdentifier('alpha-01'), 'alpha-01');
  assert.throws(() => validateServerIdentifier('../admin'));

  assert.equal(sanitizeSubEndpoint('files/create-folder'), 'files/create-folder');
  assert.throws(() => sanitizeSubEndpoint('../../admin/users'));
  assert.throws(() => sanitizeSubEndpoint('power?evil=1'));

  const htmlErrorRes = new Response('<html><body>502 Bad Gateway stack trace</body></html>', {
    status: 502,
    headers: { 'content-type': 'text/html' },
  });
  const safeHtmlMsg = await extractSafeApiErrorMessage(htmlErrorRes, 'Calagopus client API');
  assert.equal(safeHtmlMsg, 'Calagopus client API returned HTTP 502');
  assert.ok(!safeHtmlMsg.includes('stack trace'));
});

test('sanitizeImageSrc and encodeUtf8ToBase64 enforce safe image sources and UTF-8 encoding', () => {
  assert.equal(sanitizeImageSrc('javascript:alert(1)'), undefined);
  assert.equal(sanitizeImageSrc('//evil.example.com/avatar.png'), undefined);
  assert.equal(sanitizeImageSrc('data:image/svg+xml;base64,PHN2Zz4='), undefined);
  assert.equal(sanitizeImageSrc('https://petalnodes.cloud/avatar.png'), 'https://petalnodes.cloud/avatar.png');
  assert.equal(sanitizeImageSrc('/avatars/elena.webp'), '/avatars/elena.webp');
  assert.equal(sanitizeImageSrc('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');

  const utf8B64 = encodeUtf8ToBase64('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMk8 🌸-key');
  assert.ok(utf8B64.length > 10);
  assert.equal(
    new TextDecoder().decode(Uint8Array.from(atob(utf8B64), (c) => c.charCodeAt(0))),
    'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMk8 🌸-key',
  );
});
