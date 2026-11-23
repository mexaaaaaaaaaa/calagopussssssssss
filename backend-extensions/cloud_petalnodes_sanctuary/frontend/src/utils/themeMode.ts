export type PetalnodesThemeMode = 'light' | 'dark';

export const THEME_MODE_STORAGE_KEY = 'petalnodes.theme.mode';

export function resolveInitialThemeMode(storage?: Pick<Storage, 'getItem'> | null, prefersDark?: boolean): PetalnodesThemeMode {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const saved = store?.getItem(THEME_MODE_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted frames
  }

  if (typeof prefersDark === 'boolean') {
    return prefersDark ? 'dark' : 'light';
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }

  return 'light';
}

export function persistThemeMode(mode: PetalnodesThemeMode, storage?: Pick<Storage, 'setItem'> | null): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage write errors in restricted frames
  }
}

export function applyThemeModeToDocument(mode: PetalnodesThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.setAttribute('data-mantine-color-scheme', mode);
  root.style.colorScheme = mode;
}
