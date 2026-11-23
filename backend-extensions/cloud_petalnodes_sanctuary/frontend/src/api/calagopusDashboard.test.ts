import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeServerOverviewMetrics,
  filterServersByQuery,
  formatMegabytes,
  formatPercent,
  SANDBOX_CLIENT_FIXTURE,
} from './calagopusDashboard';

test('computeServerOverviewMetrics counts running, offline, and memory totals', () => {
  const metrics = computeServerOverviewMetrics(SANDBOX_CLIENT_FIXTURE.servers);
  assert.equal(metrics.total, 3);
  assert.equal(metrics.running, 2);
  assert.equal(metrics.offline, 1);
  assert.equal(metrics.allocatedMemoryMb, 16384);
});

test('filterServersByQuery filters by name, node, egg, or allocation', () => {
  const byNode = filterServersByQuery(SANDBOX_CLIENT_FIXTURE.servers, 'us-east-2');
  assert.equal(byNode.length, 1);
  assert.equal(byNode[0].uuidShort, 'charlie-03');

  const byEgg = filterServersByQuery(SANDBOX_CLIENT_FIXTURE.servers, 'velocity');
  assert.equal(byEgg.length, 1);
  assert.equal(byEgg[0].uuidShort, 'bravo-02');
});

test('formatMegabytes and formatPercent format numeric metrics consistently', () => {
  assert.equal(formatMegabytes(512), '512 MiB');
  assert.equal(formatMegabytes(8192), '8.0 GiB');
  assert.equal(formatMegabytes(0), '0 MiB');
  assert.equal(formatPercent(34.24), '34.2%');
});
