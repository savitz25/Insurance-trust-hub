import type { FlLaunchCounty } from '@/lib/dfs/launch-counties';

/**
 * Providers API county predicate.
 * One `launch_county_id` equality. The wide county text OR, paired with an exact count,
 * is the statement that hits SQLSTATE 57014.
 */
export function providerApiCountyFilter(county: Pick<FlLaunchCounty, 'id'>): string {
  return `contact->>launch_county_id.eq.${county.id}`;
}
