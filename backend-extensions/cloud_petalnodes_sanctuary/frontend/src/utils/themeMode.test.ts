import assert from 'node:assert/strict';
import test from 'node:test';
import { persistThemeMode, resolveInitialThemeMode, THEME_MODE_STORAGE_KEY } from './themeMode';

test('resolveInitialThemeMode reads saved preference first', () => {
  const store = new Map<string, string>([[THEME_MODE_STORAGE_KEY, 'dark']]);
  assert.equal(resolveInitialThemeMode({ getItem: (k) => store.get(k) ?? null }, false), 'dark');

  store.set(THEME_MODE_STORAGE_KEY, 'light');
  assert.equal(resolveInitialThemeMode({ getItem: (k) => store.get(k) ?? null }, true), 'light');
});

test('resolveInitialThemeMode falls back to system preference then light', () => {
  const emptyStore = { getItem: () => null };
  assert.equal(resolveInitialThemeMode(emptyStore, true), 'dark');
  assert.equal(resolveInitialThemeMode(emptyStore, false), 'light');
  assert.equal(resolveInitialThemeMode(emptyStore), 'light');
});

test('persistThemeMode writes valid mode safely', () => {
  const saved: Record<string, string> = {};
  persistThemeMode('dark', { setItem: (k, v) => { saved[k] = v; } });
  assert.equal(saved[THEME_MODE_STORAGE_KEY], 'dark');
});
