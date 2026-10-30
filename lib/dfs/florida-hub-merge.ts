/** One county stream page. Stays under the PostgREST row cap. */
export const FLORIDA_HUB_CHUNK = 100;

export type FloridaHubOrderKey = {
  id: string;
  name: string;
};

/**
 * Raw `ORDER BY name, id`. Deliberate negative control only.
 * PostgreSQL ranks the combining acute before the precomposed form. Node's
 * raw collator does not use that order. Production pages must not call this.
 * PostgREST cannot order by the SQL expression `normalize(name, NFC)`.
 */
const floridaHubCollator = new Intl.Collator('en-US', {
  usage: 'sort',
  sensitivity: 'variant',
});

/** PostgREST order field for `public.provider_name_nfc(providers)`. */
export const FLORIDA_HUB_ORDER_COLUMN = 'provider_name_nfc';

type HubOrderQuery<T> = {
  order(column: string, options: { ascending: boolean }): T;
};

/**
 * Per-county order: computed NFC key, then id.
 * The argument is a column identifier. It is not an SQL expression.
 */
export function applyFloridaHubOrder<T extends HubOrderQuery<T>>(query: T): T {
  return query
    .order(FLORIDA_HUB_ORDER_COLUMN, { ascending: true })
    .order('id', { ascending: true });
}

export function compareFloridaHubOrder(
  left: FloridaHubOrderKey,
  right: FloridaHubOrderKey
): number {
  const byName = floridaHubCollator.compare(left.name, right.name);
  if (byName !== 0) return byName;
  return floridaHubCollator.compare(left.id, right.id);
}

/**
 * Production contract: NFC, then the same en-US collation, then id.
 * Comparison only. Stored and displayed names stay on `name`.
 * `mergeFloridaHubPage` uses this by default, and `applyFloridaHubOrder`
 * orders each county stream by the same key.
 */
export function compareFloridaHubOrderByNfc(
  left: FloridaHubOrderKey,
  right: FloridaHubOrderKey
): number {
  const byName = floridaHubCollator.compare(
    left.name.normalize('NFC'),
    right.name.normalize('NFC')
  );
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
 * The first `from + pageSize` merged rows are contained in the first
 * `from + pageSize` rows of every stream. Callers load that prefix, one
 * county at a time, and slice the page here.
 */
export function mergeFloridaHubPage<T extends FloridaHubOrderKey>(
  streams: readonly (readonly T[])[],
  from: number,
  pageSize: number,
  compare: (left: T, right: T) => number = compareFloridaHubOrderByNfc
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
        compare(row, streams[bestStream][indexes[bestStream]]) < 0
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
