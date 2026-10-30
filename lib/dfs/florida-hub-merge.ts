/** One county stream page. Stays under the usual PostgREST row cap. */
export const FLORIDA_HUB_CHUNK = 100;

/** Per-hub statement cap. One county id per statement, not one OR of every county. */
export const FLORIDA_HUB_DB_CONCURRENCY = 3;

export type FloridaHubOrderKey = {
  id: string;
  name: string;
};

/**
 * Multi-county pages merge per-id streams in the app.
 * Single-county pages keep PostgreSQL `ORDER BY name, id` and do not use this
 * comparison. This collator is not `provider_name_nfc`. Names that PostgreSQL
 * and Intl.Collator order differently, including the synthetic Zoé pair, stay
 * on the held NFC work and are not certified here.
 */
const floridaHubCollator = new Intl.Collator('en-US', {
  usage: 'sort',
  sensitivity: 'variant',
});

export function compareFloridaHubOrder(
  left: FloridaHubOrderKey,
  right: FloridaHubOrderKey
): number {
  const byName = floridaHubCollator.compare(left.name, right.name);
  if (byName !== 0) return byName;
  return floridaHubCollator.compare(left.id, right.id);
}

/**
 * A positive inventory count must produce the rows that count promised.
 * The last page may be short. An empty or truncated earlier page is a failed
 * read, not a successful short page.
 */
export function assertCompleteFloridaHubPage(input: {
  total: number;
  from: number;
  pageSize: number;
  rowCount: number;
}): void {
  if (!Number.isFinite(input.total) || input.total < 0) {
    throw new Error('Florida hub inventory page incomplete');
  }
  const from = Math.max(0, input.from);
  if (from >= input.total) {
    if (input.rowCount !== 0) throw new Error('Florida hub inventory page incomplete');
    return;
  }
  const expected = Math.min(Math.max(0, input.pageSize), input.total - from);
  if (input.rowCount !== expected) {
    throw new Error('Florida hub inventory page incomplete');
  }
}

/**
 * Merges county streams that are already ordered by compareFloridaHubOrder.
 * Callers load the first `from + pageSize` rows of each stream, one county
 * id at a time. A stream sorted by a different comparison is not a safe input.
 */
export function mergeFloridaHubPage<T extends FloridaHubOrderKey>(
  streams: readonly (readonly T[])[],
  from: number,
  pageSize: number
): T[] {
  const indexes = streams.map(() => 0);
  const merged: T[] = [];
  const need = Math.max(0, from) + Math.max(0, pageSize);
  while (merged.length < need) {
    let bestStream = -1;
    for (let stream = 0; stream < streams.length; stream += 1) {
      const row = streams[stream][indexes[stream]];
      if (!row) continue;
      if (
        bestStream < 0 ||
        compareFloridaHubOrder(row, streams[bestStream][indexes[bestStream]]) < 0
      ) {
        bestStream = stream;
      }
    }
    if (bestStream < 0) break;
    merged.push(streams[bestStream][indexes[bestStream]]);
    indexes[bestStream] += 1;
  }
  return merged.slice(from, from + pageSize);
}
