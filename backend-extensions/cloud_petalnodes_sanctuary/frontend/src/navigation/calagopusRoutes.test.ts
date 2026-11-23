import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBreadcrumbsForPath,
  getNavGroupsForScope,
  hasPermission,
  inferScopeFromPath,
  isRouteActive,
} from './calagopusRoutes.ts';

test('hasPermission enforces exact, namespace wildcard, and admin wildcard rules', () => {
  assert.equal(hasPermission({ isAdmin: true, permissions: [] }, 'admin.settings.read'), true);
  assert.equal(
    hasPermission({ isAdmin: false, permissions: ['control.*', 'file.read'] }, 'control.console'),
    true,
  );
  assert.equal(
    hasPermission({ isAdmin: false, permissions: ['file.read'] }, 'admin.nodes.read'),
    false,
  );
});

test('getNavGroupsForScope rewrites server paths and includes Minecraft Tools & Diagnostics', () => {
  const adminUser = { isAdmin: true, permissions: ['*'] };
  const serverGroups = getNavGroupsForScope('server', adminUser, 'bravo-02');
  const serverPaths = serverGroups.flatMap((g) => g.items.map((i) => i.path));
  assert.ok(serverPaths.includes('/server/bravo-02/minecraft'));
  assert.ok(serverPaths.includes('/server/bravo-02/backups'));

  const adminGroups = getNavGroupsForScope('admin', adminUser);
  const adminPaths = adminGroups.flatMap((g) => g.items.map((i) => i.path));
  assert.ok(adminPaths.includes('/admin/diagnostics'));
  assert.ok(adminPaths.includes('/admin/allocations'));
});

test('inferScopeFromPath, isRouteActive, and buildBreadcrumbsForPath resolve new routes cleanly', () => {
  assert.equal(inferScopeFromPath('/server/alpha-01/minecraft'), 'server');
  assert.equal(inferScopeFromPath('/admin/diagnostics'), 'admin');
  assert.equal(inferScopeFromPath('/notifications'), 'client');

  assert.equal(isRouteActive('/server/alpha-01/minecraft', '/server/alpha-01', true), false);
  assert.equal(isRouteActive('/server/alpha-01/minecraft', '/server/alpha-01/minecraft'), true);

  const mcCrumbs = buildBreadcrumbsForPath('/server/alpha-01/minecraft', 'PaperMC Survival');
  assert.equal(mcCrumbs[mcCrumbs.length - 1]?.label, 'Minecraft Tools');

  const diagCrumbs = buildBreadcrumbsForPath('/admin/diagnostics');
  assert.equal(diagCrumbs[diagCrumbs.length - 1]?.label, 'Diagnostics');
});
