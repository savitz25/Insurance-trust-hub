import { isFlLaunchHub, launchCountiesForHubSlug } from '@/lib/dfs/launch-counties';
import type { HubPublicationSignal } from '@/lib/hubs/published-hub';
import { hubSlugCanCarryVerifiedInventory } from '@/lib/hubs/sitemap-eligibility';

export type PublicationCountTask =
  | { kind: 'fl-county'; countyId: string }
  | { kind: 'hub'; hubSlug: string };

/**
 * Distinct Florida county ids, plus one count per non-Florida launch hub.
 * A multi-county hub reuses the ids already listed. Fort Lauderdale and any
 * other non-launch slug are omitted here and folded as a successful zero.
 */
export function publicationCountTasks(hubSlugs: readonly string[]): PublicationCountTask[] {
  const countyIds: string[] = [];
  const seen = new Set<string>();
  const hubs: string[] = [];
  for (const hubSlug of hubSlugs) {
    if (!hubSlugCanCarryVerifiedInventory(hubSlug)) continue;
    if (isFlLaunchHub(hubSlug)) {
      for (const county of launchCountiesForHubSlug(hubSlug)) {
        if (seen.has(county.id)) continue;
        seen.add(county.id);
        countyIds.push(county.id);
      }
      continue;
    }
    hubs.push(hubSlug);
  }
  return [
    ...countyIds.map((countyId) => ({ kind: 'fl-county' as const, countyId })),
    ...hubs.map((hubSlug) => ({ kind: 'hub' as const, hubSlug })),
  ];
}

export function foldPublicationSignals(
  hubSlugs: readonly string[],
  counts: ReadonlyMap<string, number | null>
): HubPublicationSignal[] {
  return hubSlugs.map((hubSlug) => {
    if (!hubSlugCanCarryVerifiedInventory(hubSlug)) {
      return { hubSlug, lookupSucceeded: true, verifiedTotal: 0 };
    }
    if (isFlLaunchHub(hubSlug)) {
      const values = launchCountiesForHubSlug(hubSlug).map((county) => {
        const value = counts.get(`fl:${county.id}`);
        return value == null || !Number.isFinite(value) ? null : value;
      });
      if (values.some((value) => value == null)) {
        return { hubSlug, lookupSucceeded: false, verifiedTotal: 0 };
      }
      return {
        hubSlug,
        lookupSucceeded: true,
        verifiedTotal: values.reduce<number>((sum, value) => sum + (value ?? 0), 0),
      };
    }
    const value = counts.get(`hub:${hubSlug}`);
    if (value == null || !Number.isFinite(value)) {
      return { hubSlug, lookupSucceeded: false, verifiedTotal: 0 };
    }
    return { hubSlug, lookupSucceeded: true, verifiedTotal: value };
  });
}
