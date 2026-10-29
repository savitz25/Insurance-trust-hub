/** One county stream page. Stays under the PostgREST row cap. */
export const FLORIDA_HUB_CHUNK = 100;

export type FloridaHubOrderKey = {
  id: string;
  name: string;
};

/**
 * PostgreSQL `ORDER BY name, id` on this database uses the en_US collation.
 * A read-only Tampa comparison (hillsborough + pinellas + pasco, first 1,000
 * rows) disagreed with UTF-16 code-unit order at 680 positions and agreed
 * with this collator at every position.
 *
 * This raw comparison is the current multi-county merge. It is also the
 * deliberate negative control for canonically equivalent names: Node ties
 * the precomposed and combining-acute forms, while PostgreSQL `ORDER BY name`
 * does not. Single-county pages keep PostgREST `order=name.asc,id.asc`.
 * Do not switch this comparator to NFC until that query orders by the same
 * key. PostgREST cannot order by the SQL expression `normalize(name, NFC)`.
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
 * Shared contract: NFC, then the same en-US collation, then id.
 * Comparison only. Stored and displayed names stay on `name`.
 * The hub read must not call this until `provider_name_nfc` is available
 * to PostgREST. Wiring it alone would make multi-county pages disagree
 * with single-county SQL pages.
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
  compare: (left: T, right: T) => number = compareFloridaHubOrder
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
