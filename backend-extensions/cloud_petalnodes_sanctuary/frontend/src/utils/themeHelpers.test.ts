import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePaginationRange,
  getContrastRatio,
  getInitials,
  sortRowsByKey,
} from './themeHelpers';
import { blushTokens } from '../theme/tokens';

test('computePaginationRange calculates item bounds and compact pages', () => {
  const simple = computePaginationRange(1, 25, 10);
  assert.deepEqual(simple.pages, [1, 2, 3]);
  assert.equal(simple.startItem, 1);
  assert.equal(simple.endItem, 10);
  assert.equal(simple.totalPages, 3);

  const mid = computePaginationRange(5, 100, 10);
  assert.deepEqual(mid.pages, [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  assert.equal(mid.startItem, 41);
  assert.equal(mid.endItem, 50);

  const empty = computePaginationRange(1, 0, 10);
  assert.equal(empty.startItem, 0);
  assert.equal(empty.endItem, 0);
  assert.equal(empty.totalPages, 1);
});

test('sortRowsByKey sorts numeric and string fields stably', () => {
  const rows = [
    { name: 'Beta', count: 20 },
    { name: 'Alpha', count: 5 },
    { name: 'Gamma', count: 12 },
  ];

  assert.deepEqual(
    sortRowsByKey(rows, 'name', 'asc').map((r) => r.name),
    ['Alpha', 'Beta', 'Gamma'],
  );
  assert.deepEqual(
    sortRowsByKey(rows, 'count', 'desc').map((r) => r.count),
    [20, 12, 5],
  );
});

test('blush theme color pairings satisfy WCAG AA 4.5:1 text contrast', () => {
  const textOnBg = getContrastRatio(blushTokens.colors.mainText, blushTokens.colors.background);
  const textOnSurface = getContrastRatio(blushTokens.colors.mainText, blushTokens.colors.surface);
  const textOnPrimary = getContrastRatio(blushTokens.colors.mainText, blushTokens.colors.primary);
  const roseOnSoft = getContrastRatio(
    blushTokens.colors.primaryTextOnSoft,
    blushTokens.colors.primarySoft,
  );
  const secondaryOnSurface = getContrastRatio(
    blushTokens.colors.secondaryText,
    blushTokens.colors.surface,
  );

  assert.ok(textOnBg >= 4.5, `Expected >= 4.5, got ${textOnBg}`);
  assert.ok(textOnSurface >= 4.5, `Expected >= 4.5, got ${textOnSurface}`);
  assert.ok(textOnPrimary >= 4.5, `Expected >= 4.5, got ${textOnPrimary}`);
  assert.ok(roseOnSoft >= 4.5, `Expected >= 4.5, got ${roseOnSoft}`);
  assert.ok(secondaryOnSurface >= 4.5, `Expected >= 4.5, got ${secondaryOnSurface}`);
});

test('getInitials extracts clean two-letter fallback initials', () => {
  assert.equal(getInitials('Clara Vance'), 'CV');
  assert.equal(getInitials('Mina'), 'MI');
  assert.equal(getInitials('  '), '?');
});
