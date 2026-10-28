import { isFlLaunchHub } from '@/lib/dfs/launch-counties';
import { isMaLaunchHub } from '@/lib/ma/launch-markets';
import { isMsLaunchHub } from '@/lib/ms/launch-markets';
import { isNcLaunchHub } from '@/lib/nc/launch-markets';
import { isNjLaunchHub } from '@/lib/nj/launch-regions';
import { isNvLaunchHub } from '@/lib/nv/launch-markets';
import { isOhLaunchHub } from '@/lib/odi/launch-markets';
import { isTxLaunchHub } from '@/lib/tdi/launch-markets';
import { isVtLaunchHub } from '@/lib/vt/launch-markets';

/**
 * Same slug gate as getHubInventory. A slug outside every launch list returns
 * an empty market without a database read, and the hub page then sets
 * noindex. The sitemap must not list those URLs.
 *
 * A launch slug stays eligible even when its live count is currently zero.
 * Dropping it here would also drop it after inventory is published. This
 * function does not query Supabase.
 */
export function hubSlugCanCarryVerifiedInventory(hubSlug: string): boolean {
  return (
    isTxLaunchHub(hubSlug) ||
    isNjLaunchHub(hubSlug) ||
    isOhLaunchHub(hubSlug) ||
    isNcLaunchHub(hubSlug) ||
    isNvLaunchHub(hubSlug) ||
    isVtLaunchHub(hubSlug) ||
    isMaLaunchHub(hubSlug) ||
    isMsLaunchHub(hubSlug) ||
    isFlLaunchHub(hubSlug)
  );
}
