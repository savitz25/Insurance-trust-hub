/** A head count with the time it was actually read, or an explicit miss. */
export type HeadCount =
  | { value: number; asOf: number; stale: boolean; estimated?: boolean }
  | { unavailable: true };

export const COUNT_FRESH_MS = 60 * 60 * 1000;
export const COUNT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isReadyCount(
  count: HeadCount
): count is { value: number; asOf: number; stale: boolean; estimated?: boolean } {
  return 'value' in count;
}

export function unavailableCount(): HeadCount {
  return { unavailable: true };
}

/** Sum independent counts. Any miss drops the sum; the oldest timestamp wins. */
export function combineHeadCounts(parts: readonly HeadCount[], now = Date.now()): HeadCount {
  if (parts.length === 0) return { value: 0, asOf: now, stale: false };
  if (parts.some((part) => !isReadyCount(part))) return unavailableCount();
  const ready = parts.filter(isReadyCount);
  const asOf = Math.min(...ready.map((part) => part.asOf));
  const age = now - asOf;
  if (age >= COUNT_MAX_AGE_MS) return unavailableCount();
  const estimated = ready.some((part) => part.estimated);
  return {
    value: ready.reduce((sum, part) => sum + part.value, 0),
    asOf,
    stale: ready.some((part) => part.stale) || age >= COUNT_FRESH_MS,
    ...(estimated ? { estimated: true as const } : {}),
  };
}

/**
 * Page window for a hub inventory read.
 * An unavailable count does not become 0 and does not clamp the reader back to page 1.
 * Pagination then follows the rows that were actually listed.
 */
export function settleHubPage(input: {
  count: HeadCount;
  pageSize: number;
  page: number;
  rowCount: number;
  /** True when the over-fetch returned a row past this page. */
  hasMore?: boolean;
}): { total: number | null; totalPages: number; count: HeadCount } {
  const page = Math.max(1, input.page);
  if (!isReadyCount(input.count)) {
    const fromRows =
      input.rowCount > 0 ? Math.max(page, Math.ceil(input.rowCount / input.pageSize)) : 0;
    const totalPages = input.hasMore ? Math.max(fromRows, page + 1) : fromRows;
    return { total: null, totalPages, count: unavailableCount() };
  }
  const from = (page - 1) * input.pageSize;
  const safeTotal = Math.max(input.count.value, from + input.rowCount);
  const pagesFromCount = input.count.value > 0 ? Math.ceil(input.count.value / input.pageSize) : 0;
  const pagesFromRows = safeTotal > 0 ? Math.ceil(safeTotal / input.pageSize) : 0;
  return {
    total: safeTotal,
    totalPages: Math.max(pagesFromCount, pagesFromRows),
    count: {
      value: safeTotal,
      asOf: input.count.asOf,
      stale: input.count.stale,
      ...(input.count.estimated ? { estimated: true as const } : {}),
    },
  };
}

/** Range for the row query. A missing count still reads the requested page. */
export function planHubRange(count: HeadCount, pageSize: number, requestedPage: number) {
  const overFetch = Math.min(pageSize + 40, 200);
  const requested = Math.max(1, requestedPage);
  const page = isReadyCount(count)
    ? count.value > 0
      ? Math.min(requested, Math.ceil(count.value / pageSize))
      : 1
    : requested;
  const from = (page - 1) * pageSize;
  return { page, from, to: from + overFetch - 1 };
}

/**
 * Unavailable counts stay indexable and are not described as an empty market.
 * A genuine zero with no listed rows is the only noindex case.
 */
export function hubSeoForCount(input: { count: HeadCount; listed: number }): {
  isEmpty: boolean;
  index: boolean;
} {
  if (!isReadyCount(input.count)) return { isEmpty: false, index: true };
  if (input.count.value <= 0 && input.listed <= 0) return { isEmpty: true, index: false };
  return { isEmpty: false, index: true };
}

export function countsAreFresh(counts: readonly HeadCount[]): boolean {
  return (
    counts.length > 0 &&
    counts.every((count) => isReadyCount(count) && !count.stale && !count.estimated)
  );
}

export function exactTotalsSentence(counts: readonly HeadCount[]): string | null {
  if (!countsAreFresh(counts)) return null;
  return 'Totals below are exact match counts for public research listings — empty markets stay empty.';
}

export function formatCountAsOf(asOf: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(asOf));
}

/**
 * Recompute freshness from the query timestamp. A cached `stale: false`
 * is not trusted. Anything 24h or older is unavailable.
 */
export function reinterpretHeadCount(count: HeadCount, now = Date.now()): HeadCount {
  if (!isReadyCount(count)) return unavailableCount();
  const age = now - count.asOf;
  if (age >= COUNT_MAX_AGE_MS) return unavailableCount();
  return {
    value: count.value,
    asOf: count.asOf,
    stale: age >= COUNT_FRESH_MS,
    ...(count.estimated ? { estimated: true as const } : {}),
  };
}

export function reinterpretLaunchCounts<T extends Record<string, HeadCount>>(
  counts: T,
  now = Date.now()
): T {
  const next = {} as T;
  for (const key of Object.keys(counts) as (keyof T)[]) {
    next[key] = reinterpretHeadCount(counts[key], now) as T[keyof T];
  }
  return next;
}

export function headCountDisclosure(count: HeadCount): string {
  if (!isReadyCount(count)) return 'count temporarily unavailable';
  if (count.estimated) return 'estimated';
  if (!count.stale) return '';
  return `as of ${formatCountAsOf(count.asOf)}`;
}
