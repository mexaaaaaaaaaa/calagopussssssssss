import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { SortDirection } from '../utils/themeHelpers';

export interface TableColumn<T> {
  key: keyof T & string;
  header: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  numeric?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T extends { id: string }> {
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  sortKey?: (keyof T & string) | null;
  sortDirection?: SortDirection;
  onSort?: (key: keyof T & string) => void;
  renderActions?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  caption?: string;
  compact?: boolean;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  sortKey = null,
  sortDirection = 'asc',
  onSort,
  renderActions,
  emptyState,
  caption,
  compact = false,
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const headerPad = compact ? 'px-3.5 py-2' : 'px-4 py-3';
  const cellPad = compact ? 'px-3.5 py-2' : 'px-4 py-3';

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)]">
      <table className="w-full min-w-[600px] border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)]">
            {columns.map((col) => {
              const isSorted = sortKey === col.key;
              const alignClass = col.align === 'right' ? 'text-right' : 'text-left';

              return (
                <th
                  key={col.key}
                  scope="col"
                  className={`${headerPad} text-[12px] font-medium text-[var(--calagopus-text-secondary)] whitespace-nowrap ${alignClass}`}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={`blush-focus-ring inline-flex items-center gap-1.5 rounded px-1 py-0.5 -mx-1 cursor-pointer hover:text-[var(--calagopus-text)] ${
                        col.align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {isSorted ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)]" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)]" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-55" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
            {renderActions ? (
              <th
                scope="col"
                className={`${headerPad} text-right text-[12px] font-medium text-[var(--calagopus-text-secondary)] whitespace-nowrap`}
              >
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--calagopus-border)]">
          {rows.map((row) => (
            <tr
              key={row.id}
              className="blush-transition hover:bg-[var(--calagopus-primary-subtle)]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${cellPad} text-[var(--calagopus-text)] align-middle ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.numeric ? 'tabular-nums font-mono text-[13px]' : ''}`}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
              {renderActions ? (
                <td className={`${cellPad} text-right align-middle whitespace-nowrap`}>
                  <div className="inline-flex items-center justify-end gap-1.5">
                    {renderActions(row)}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
