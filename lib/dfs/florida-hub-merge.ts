/**
 * Single-county Florida hub pages use one SQL `ORDER BY name, id`.
 * The last page may be short. An earlier short page is a failed read.
 * A real zero inventory is a completed page of no rows.
 * Tampa, Orlando, and Miami-Fort Lauderdale keep the current wide match
 * and do not use this check.
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
