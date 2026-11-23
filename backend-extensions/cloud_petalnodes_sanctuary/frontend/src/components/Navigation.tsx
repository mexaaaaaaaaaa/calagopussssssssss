import React from 'react';
import { Tabs as MantineTabs } from '@mantine/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sanitizeHref } from '../api/calagopusCore';
import { computePaginationRange } from '../utils/themeHelpers';

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  content: React.ReactNode;
}

export interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onChange: (value: string) => void;
}

export function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <MantineTabs
      value={value}
      onChange={(next) => {
        if (next) onChange(next);
      }}
      variant="unstyled"
    >
      <MantineTabs.List className="flex flex-wrap items-center gap-1 border-b border-[var(--calagopus-border)]">
        {items.map((item) => {
          const isActive = item.value === value;
          return (
            <MantineTabs.Tab
              key={item.value}
              value={item.value}
              disabled={item.disabled}
              className={`blush-transition blush-focus-ring relative -mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? 'border-[var(--calagopus-primary)] text-[var(--calagopus-text)]'
                  : 'border-transparent text-[var(--calagopus-text-secondary)] hover:text-[var(--calagopus-text)]'
              }`}
            >
              {item.icon ? (
                <span className="inline-flex shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </MantineTabs.Tab>
          );
        })}
      </MantineTabs.List>

      {items.map((item) => (
        <MantineTabs.Panel key={item.value} value={item.value} className="pt-4">
          {item.content}
        </MantineTabs.Panel>
      ))}
    </MantineTabs>
  );
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--calagopus-text-secondary)]">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
              {idx > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 text-[var(--calagopus-border-strong)] shrink-0"
                  aria-hidden="true"
                />
              ) : null}
              {isLast ? (
                <span
                  className="font-medium text-[var(--calagopus-text)] whitespace-nowrap"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : sanitizeHref(item.href) ? (
                <a
                  href={sanitizeHref(item.href)}
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault();
                      item.onClick();
                    }
                  }}
                  className="blush-focus-ring rounded px-1 py-0.5 -mx-1 hover:text-[var(--calagopus-text)] whitespace-nowrap"
                >
                  {item.label}
                </a>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="blush-focus-ring rounded px-1 py-0.5 -mx-1 hover:text-[var(--calagopus-text)] whitespace-nowrap cursor-pointer"
                >
                  {item.label}
                </button>
              ) : (
                <span className="whitespace-nowrap">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const { pages, startItem, endItem, totalPages } = computePaginationRange(
    currentPage,
    totalItems,
    pageSize,
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-[var(--calagopus-text-secondary)] tabular-nums">
        Showing <span className="font-medium text-[var(--calagopus-text)]">{startItem}</span>–
        <span className="font-medium text-[var(--calagopus-text)]">{endItem}</span> of{' '}
        <span className="font-medium text-[var(--calagopus-text)]">{totalItems}</span>
      </p>

      <nav aria-label="Pagination" className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="blush-transition blush-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text)] hover:bg-[var(--calagopus-surface-elevated)] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {pages.map((entry, idx) =>
          entry === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="inline-flex h-9 w-7 items-center justify-center text-sm text-[var(--calagopus-text-secondary)]"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-label={`Page ${entry}`}
              aria-current={entry === currentPage ? 'page' : undefined}
              className={`blush-transition blush-focus-ring inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg border px-2.5 text-[13px] font-medium tabular-nums cursor-pointer ${
                entry === currentPage
                  ? 'border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)]'
                  : 'border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text)] hover:bg-[var(--calagopus-surface-elevated)]'
              }`}
            >
              {entry}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="blush-transition blush-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text)] hover:bg-[var(--calagopus-surface-elevated)] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
