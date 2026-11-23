import React from 'react';
import { Card, CardContent } from './ui/card';

export interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon: React.ReactNode;
  loading?: boolean;
  progressPercent?: number;
}

export function StatCard({
  label,
  value,
  helper,
  icon,
  loading = false,
  progressPercent,
}: StatCardProps) {
  return (
    <Card className="blush-transition hover:border-[var(--calagopus-primary-border)]">
      <CardContent className="p-5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--calagopus-text-secondary)] truncate">
              {label}
            </p>
            {loading ? (
              <div
                className="mt-2.5 h-7 w-24 animate-pulse rounded-md bg-[var(--calagopus-primary-soft)]"
                aria-hidden="true"
              />
            ) : (
              <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-[var(--calagopus-text)] tabular-nums">
                {value}
              </p>
            )}
          </div>
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]"
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>

        {loading ? (
          <div
            className="mt-3 h-3.5 w-32 animate-pulse rounded bg-[var(--calagopus-primary-subtle)]"
            aria-hidden="true"
          />
        ) : (
          <>
            {typeof progressPercent === 'number' ? (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--calagopus-primary-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--calagopus-primary)] blush-transition"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
            ) : null}
            {helper ? (
              <p className="mt-2.5 text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums truncate">
                {helper}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

