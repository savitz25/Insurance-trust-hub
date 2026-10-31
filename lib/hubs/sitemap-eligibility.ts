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
 * Launch-slug gate shared with getHubInventory. A slug outside every launch
 * list returns an empty market without a database read. This function does
 * not query Supabase and does not decide publication.
 *
 * A launch slug may still be counted when the live total is zero. Sitemap
 * entries, StateHubLinks, and hub robots use isPublishedHub, which also
 * requires a successful lookup and a positive verified total.
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
