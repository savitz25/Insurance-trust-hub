import { hubSlugCanCarryVerifiedInventory } from '@/lib/hubs/sitemap-eligibility';

/**
 * One publication rule for sitemap entries, StateHubLinks, and hub robots.
 * A launch slug may be queried. It is indexable only after that query
 * succeeds and the verified total is positive. Zero and failed lookups stay
 * noindex and unpublished. This does not remove registry hubs.
 */
export type HubPublicationSignal = {
  hubSlug: string;
  lookupSucceeded: boolean;
  verifiedTotal: number;
};

export function isPublishedHub(signal: HubPublicationSignal): boolean {
  return (
    hubSlugCanCarryVerifiedInventory(signal.hubSlug) &&
    signal.lookupSucceeded === true &&
    Number.isFinite(signal.verifiedTotal) &&
    signal.verifiedTotal > 0
  );
}

export function filterPublishedHubs<T extends { slug: string }>(
  hubs: readonly T[],
  signals: readonly HubPublicationSignal[]
): T[] {
  const bySlug = new Map(signals.map((signal) => [signal.hubSlug, signal]));
  return hubs.filter((hub) => {
    const signal = bySlug.get(hub.slug);
    return signal ? isPublishedHub(signal) : false;
  });
}


