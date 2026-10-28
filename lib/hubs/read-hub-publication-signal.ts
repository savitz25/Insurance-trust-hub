import { countVerifiedProvidersForHub } from '@/lib/dfs/providers-by-county';
import { hubSlugCanCarryVerifiedInventory } from '@/lib/hubs/sitemap-eligibility';
import type { HubPublicationSignal } from '@/lib/hubs/published-hub';

/** Server-only read. A thrown count becomes lookupSucceeded false and is not cached here. */
export async function readHubPublicationSignal(
  hubSlug: string
): Promise<HubPublicationSignal> {
  if (!hubSlugCanCarryVerifiedInventory(hubSlug)) {
    return { hubSlug, lookupSucceeded: true, verifiedTotal: 0 };
  }
  try {
    const verifiedTotal = await countVerifiedProvidersForHub(hubSlug, {
      requireSuccessfulLookup: true,
    });
    return { hubSlug, lookupSucceeded: true, verifiedTotal };
  } catch {
    return { hubSlug, lookupSucceeded: false, verifiedTotal: 0 };
  }
}
