import type { MetadataRoute } from 'next';
import type { HubPublicationSignal } from '@/lib/hubs/published-hub';
import { hubSlugCanCarryVerifiedInventory } from '@/lib/hubs/sitemap-eligibility';

/**
 * Authoritative sitemap publication.
 * Inventory readers stay on the current verified-state predicate.
 * Publication-column readers stay disabled until a separate database GO.
 * Writer synchronization and the anon/authenticated table revoke stay
 * outside this change.
 */
export const LOCAL_FIXTURE_ORIGIN = 'http://local-fixture.invalid';
const PRODUCTION_ORIGIN = 'https://www.insurancetrusthub.com';

export class SitemapPublicationIncomplete extends Error {
  readonly slugs: string[];

  constructor(slugs: readonly string[]) {
    super(`SitemapPublicationIncomplete:${slugs.join(',')}`);
    this.name = 'SitemapPublicationIncomplete';
    this.slugs = [...slugs];
  }
}

export class SitemapCredentialsAbsent extends Error {
  constructor() {
    super('SitemapCredentialsAbsent');
    this.name = 'SitemapCredentialsAbsent';
  }
}

export type SitemapMode = 'authoritative' | 'local-fixture' | 'credentials-absent';

export function selectSitemapMode(input: {
  configured: boolean;
  localFixture: boolean;
  vercelEnv?: string;
}): SitemapMode {
  const deploy = input.vercelEnv === 'production' || input.vercelEnv === 'preview';
  if (deploy || input.configured) return input.configured ? 'authoritative' : 'credentials-absent';
  if (input.localFixture) return 'local-fixture';
  return 'credentials-absent';
}

export function missingAuthoritativeHubs(
  hubs: readonly { slug: string }[],
  signals: ReadonlyMap<string, HubPublicationSignal>
): string[] {
  return hubs
    .filter((hub) => hubSlugCanCarryVerifiedInventory(hub.slug))
    .filter((hub) => signals.get(hub.slug)?.lookupSucceeded !== true)
    .map((hub) => hub.slug);
}

export function assertAuthoritativeSitemap(
  hubs: readonly { slug: string }[],
  signals: ReadonlyMap<string, HubPublicationSignal>
): void {
  const missing = missingAuthoritativeHubs(hubs, signals);
  if (missing.length > 0) throw new SitemapPublicationIncomplete(missing);
}

export function labelLocalFixtureEntries(
  entries: MetadataRoute.Sitemap
): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    ...entry,
    url: entry.url.replace(PRODUCTION_ORIGIN, LOCAL_FIXTURE_ORIGIN),
  }));
}
