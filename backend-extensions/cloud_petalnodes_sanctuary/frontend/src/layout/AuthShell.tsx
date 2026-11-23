import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { AmbientPetalBackground } from '../components/AmbientPetalBackground';
import { PetalnodesLogo } from '../components/PetalnodesLogo';
import { PETALNODES_BRAND, PETALNODES_LINKS } from '../navigation/petalnodesBrand';
import type { PetalnodesThemeMode } from '../utils/themeMode';

export interface AuthShellProps {
  brandName?: string;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  themeMode?: PetalnodesThemeMode;
  onToggleThemeMode?: () => void;
}

export function AuthShell({
  brandName = PETALNODES_BRAND,
  title,
  subtitle,
  footer,
  children,
  themeMode = 'light',
  onToggleThemeMode,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[var(--calagopus-bg)] px-4 py-8 text-[var(--calagopus-text)]">
      <AmbientPetalBackground />

      {onToggleThemeMode ? (
        <div className="relative z-10 flex justify-end max-w-5xl w-full mx-auto">
          <button
            type="button"
            onClick={onToggleThemeMode}
            aria-label={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="blush-transition blush-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text-secondary)] hover:border-[var(--calagopus-primary-border)] hover:text-[var(--calagopus-primary-text)] cursor-pointer"
          >
            {themeMode === 'dark' ? (
              <Sun className="h-4 w-4 text-[var(--calagopus-primary)]" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      ) : null}

      <div className="relative z-10 mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <PetalnodesLogo size="lg" />
          <span className="font-display text-lg font-semibold tracking-tight text-[var(--calagopus-text)]">
            {brandName}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] p-6 sm:p-7 shadow-[var(--calagopus-shadow-card)]">
          <div className="mb-5">
            <h1 className="font-display text-xl font-semibold tracking-[-0.015em] text-[var(--calagopus-text)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-[13px] text-[var(--calagopus-text-secondary)] leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? (
          <div className="mt-4 text-center text-[13px] text-[var(--calagopus-text-secondary)]">
            {footer}
          </div>
        ) : null}
      </div>

      <footer className="relative z-10 mt-8 flex flex-col items-center gap-2 text-center text-[12px] text-[var(--calagopus-text-secondary)]">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {PETALNODES_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="blush-focus-ring rounded px-1 py-0.5 text-[var(--calagopus-primary-text)] hover:underline"
            >
              {link.label}
            </a>
          ))}
        </div>
        <span>&copy; 2026 {brandName} · Plant a seed. Grow a world.</span>
      </footer>
    </div>
  );
}
