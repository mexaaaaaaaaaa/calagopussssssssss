import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeBackupStorageBytes,
  filterRecordsByText,
  formatCronSummary,
  SANDBOX_ADMIN_NODES,
  SANDBOX_BACKUPS,
  SANDBOX_DATABASES,
  SANDBOX_SCHEDULES,
  validateBackupName,
  validateConnectionsFrom,
  validateDatabaseName,
  validatePasswordUpdate,
  validateScheduleInput,
  validateSshPublicKey,
  validateSubuserEmail,
} from './calagopusModules.ts';

test('validateDatabaseName and validateBackupName enforce Calagopus rules', () => {
  assert.equal(validateDatabaseName('', ['s42_luckperms']), 'Database name is required.');
  assert.equal(
    validateDatabaseName('bad-name!', ['s42_luckperms']),
    'Use 2–48 alphanumeric characters or underscores only.',
  );
  assert.equal(
    validateDatabaseName('S42_LUCKPERMS', ['s42_luckperms']),
    'Database "S42_LUCKPERMS" already exists on this server.',
  );
  assert.equal(validateDatabaseName('s42_economy', ['s42_luckperms']), null);

  assert.equal(validateBackupName('ab'), 'Backup name must be between 3 and 80 characters.');
  assert.equal(validateBackupName('Pre-Update Snapshot'), null);
  assert.equal(computeBackupStorageBytes(SANDBOX_BACKUPS), 8160437862);
});

test('validateScheduleInput and formatCronSummary validate cron fields', () => {
  const invalid = validateScheduleInput({
    name: 'X',
    minute: 'bad',
    hour: '4',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  });
  assert.ok(invalid.nameError);
  assert.ok(invalid.cronError);

  const valid = validateScheduleInput({
    name: 'Hourly Save',
    minute: '*/30',
    hour: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  });
  assert.equal(valid.nameError, undefined);
  assert.equal(valid.cronError, undefined);
  assert.equal(formatCronSummary(SANDBOX_SCHEDULES[0]!), '0 4 * * *');
});

test('validateSubuserEmail, validateSshPublicKey, and validatePasswordUpdate catch bad input', () => {
  assert.equal(validateSubuserEmail('not-email', []), 'Enter a valid email address.');
  assert.equal(
    validateSubuserEmail('LUCAS@petalnodes.cloud', ['lucas@petalnodes.cloud']),
    '"lucas@petalnodes.cloud" already has subuser access to this server.',
  );
  assert.equal(validateSubuserEmail('alex@petalnodes.cloud', ['lucas@petalnodes.cloud']), null);

  const badSsh = validateSshPublicKey('L', 'not-a-key');
  assert.ok(badSsh.nameError);
  assert.ok(badSsh.keyError);

  const goodSsh = validateSshPublicKey(
    'MacBook Pro',
    'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMk8examplekeymaterialhere',
  );
  assert.equal(goodSsh.nameError, undefined);
  assert.equal(goodSsh.keyError, undefined);

  const badPwd = validatePasswordUpdate('', 'short', 'mismatch');
  assert.ok(badPwd.currentError);
  assert.ok(badPwd.nextError);
  assert.ok(badPwd.confirmError);
});

test('filterRecordsByText filters and sorts databases and nodes cleanly', () => {
  const matchedDb = filterRecordsByText(
    SANDBOX_DATABASES,
    'coreprotect',
    (db) => [db.name, db.username],
  );
  assert.equal(matchedDb.length, 1);
  assert.equal(matchedDb[0]?.id, 'db-02');

  const sortedNodes = filterRecordsByText(
    SANDBOX_ADMIN_NODES,
    '',
    (n) => [n.name, n.location],
    'name',
    'asc',
  );
  assert.equal(sortedNodes[0]?.name, 'ap-south-1');
});

test('validateConnectionsFrom accepts MySQL wildcards and valid IPv4/CIDR and rejects malformed entries', () => {
  assert.equal(validateConnectionsFrom('%'), null);
  assert.equal(validateConnectionsFrom('10.40.0.%'), null);
  assert.equal(validateConnectionsFrom('192.168.1.50'), null);
  assert.equal(validateConnectionsFrom('10.40.0.0/24'), null);

  assert.ok(validateConnectionsFrom('not a host'));
  assert.ok(validateConnectionsFrom('999.0.0.1'));
  assert.ok(validateConnectionsFrom('10.40.0.0/99'));
  assert.ok(validateConnectionsFrom('javascript:alert(1)'));
});
