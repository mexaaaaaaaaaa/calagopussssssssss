export interface PaginationRangeResult {
  pages: Array<number | 'ellipsis'>;
  startItem: number;
  endItem: number;
  totalPages: number;
}

export function computePaginationRange(
  currentPage: number,
  totalItems: number,
  pageSize: number,
): PaginationRangeResult {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const clampedPage = Math.min(Math.max(1, currentPage), totalPages);

  if (totalItems === 0) {
    return { pages: [1], startItem: 0, endItem: 0, totalPages: 1 };
  }

  const startItem = (clampedPage - 1) * safePageSize + 1;
  const endItem = Math.min(totalItems, clampedPage * safePageSize);

  if (totalPages <= 7) {
    return {
      pages: Array.from({ length: totalPages }, (_, idx) => idx + 1),
      startItem,
      endItem,
      totalPages,
    };
  }

  const pages: Array<number | 'ellipsis'> = [1];

  if (clampedPage > 3) {
    pages.push('ellipsis');
  }

  const rangeStart = Math.max(2, clampedPage - 1);
  const rangeEnd = Math.min(totalPages - 1, clampedPage + 1);

  for (let p = rangeStart; p <= rangeEnd; p += 1) {
    pages.push(p);
  }

  if (clampedPage < totalPages - 2) {
    pages.push('ellipsis');
  }

  pages.push(totalPages);

  return { pages, startItem, endItem, totalPages };
}

export type SortDirection = 'asc' | 'desc';

export function sortRowsByKey<T extends object>(
  rows: readonly T[],
  sortKey: keyof T | null,
  direction: SortDirection,
): T[] {
  if (!sortKey) {
    return [...rows];
  }

  return [...rows].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return direction === 'asc' ? valA - valB : valB - valA;
    }

    const strA = String(valA ?? '').toLowerCase();
    const strB = String(valB ?? '').toLowerCase();
    const cmp = strA.localeCompare(strB);
    return direction === 'asc' ? cmp : -cmp;
  });
}

function linearizeChannel(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);

  return (
    0.2126 * linearizeChannel(r) +
    0.7152 * linearizeChannel(g) +
    0.0722 * linearizeChannel(b)
  );
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
