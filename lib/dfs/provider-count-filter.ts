/**
 * Predicate for an exact providers head count.
 *
 * One jsonb key, id equality only. The wide county-text OR
 * (`short_description ILIKE`, county text) and the two-key
 * `launch_market_id` OR `launch_county_id` head counts are the
 * `/rest/v1/providers` statements that return SQLSTATE 57014.
 * Promote writes both id keys to the same value, so one key is the
 * membership the exact count can finish.
 */
export type ProviderCountField = 'launch_county_id' | 'launch_market_id';

const SAFE_ID = /^[a-z0-9_-]+$/;

export function structuredIdCountFilter(
  ids: readonly string[],
  field: ProviderCountField
): string {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) throw new Error('structured id count needs an id');
  for (const id of unique) {
    if (!SAFE_ID.test(id)) throw new Error('structured id count rejected an unsafe id');
  }
  return unique.map((id) => `contact->>${field}.eq.${id}`).join(',');
}
