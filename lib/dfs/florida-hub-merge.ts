/** One county stream page. Stays under the PostgREST row cap. */
export const FLORIDA_HUB_CHUNK = 100;

export type FloridaHubOrderKey = {
  id: string;
  name: string;
};

/**
 * Name, then id, using UTF-16 code unit order.
 * Multi-county pages merge per-id streams with this order.
 * Single-id pages use the same name, then id, columns in SQL.
 */
export function compareFloridaHubOrder(
  left: FloridaHubOrderKey,
  right: FloridaHubOrderKey
): number {
  if (left.name < right.name) return -1;
  if (left.name > right.name) return 1;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

/**
 * The first `from + pageSize` merged rows are contained in the first
 * `from + pageSize` rows of every stream. Callers load that prefix, one
 * county at a time, and slice the page here.
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
