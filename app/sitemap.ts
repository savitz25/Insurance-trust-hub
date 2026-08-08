import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { DESTINATION_STATES } from '@/lib/destinations/data';
import { ARTICLES } from '@/lib/resources/articles';
import { FALLBACK_PROVIDERS } from '@/lib/providers/fallback-data';
import { INSURANCE_HUBS, getAllStateSlugs } from '@/lib/hubs/registry';
import { SPECIALTY_TOPICS } from '@/lib/hubs/specialty-topics';
import {
  classifyProviderListing,
  isIndexableListing,
} from '@/lib/provenance/public-listing';
import {
  CURATED_ACA_MARKETS,
  marketPath,
} from '@/lib/marketplace/curated-markets';

/**
 * Standalone InsuranceTrustHub sitemap — insurancetrusthub.com URLs only.
 * Never emit movetrusthub.com or /insurance/* prefixes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const site = SITE_URL.replace(/\/$/, '');

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/directory',
    '/methodology',
    '/about',
    '/destinations',
    '/resources',
    '/tools',
    '/providers',
    '/hubs',
    '/hubs/browse',
    '/hubs/health-insurance',
    '/hubs/medicare',
    '/hubs/aca',
    '/calculators',
    '/calculators/premium-estimator',
    '/calculators/medicare-gap',
    '/calculators/aca-subsidy',
    '/tools/cost-estimator',
    '/tools/needs-assessment',
    '/tools/license-verification',
    '/tools/medicare-plan-finder',
    '/tools/medicare-provider-lookup',
    '/tools/aca-plan-explorer',
    '/marketplace',
    '/data/plan-complaint-index',
    '/data/counties',
    '/data/counties/miami-dade-fl',
    '/data/counties/broward-fl',
    '/data/counties/palm-beach-fl',
    '/my-insurance',
    '/my-insurance/plans',
    '/my-insurance/setup',
    '/my-insurance/report',
    '/my-insurance/compare',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ].map((path) => ({
    url: path === '' ? site : `${site}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/tools' ? ('daily' as const) : ('weekly' as const),
    priority:
      path === ''
        ? 1
        : path.startsWith('/data') ||
            path.startsWith('/tools/cost') ||
            path.startsWith('/calculators/aca') ||
            path.includes('provider-lookup') ||
            path.includes('complaint')
          ? 0.95
          : 0.8,
  }));

  const browseStates = getAllStateSlugs().map((state) => ({
    url: `${site}/hubs/browse/${state}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const specialtyTopics = SPECIALTY_TOPICS.map((topic) => ({
    url: `${site}${topic.path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const destinationStates = DESTINATION_STATES.map((state) => ({
    url: `${site}/destinations/${state.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const destinationCities = DESTINATION_STATES.flatMap((state) =>
    state.cities.map((city) => ({
      url: `${site}/destinations/${state.slug}/${city.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  const articles = ARTICLES.map((article) => ({
    url: `${site}/resources/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Phase 6A/6B1: only indexable_research (license + source + checkedAt + verified)
  // FALLBACK seed catalog never qualifies — empty until Supabase promotions land.
  const providers: MetadataRoute.Sitemap = FALLBACK_PROVIDERS.filter((p) =>
    isIndexableListing(classifyProviderListing(p))
  ).map((provider) => ({
    url: `${site}/providers/${provider.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const hubStates = getAllStateSlugs().map((state) => ({
    url: `${site}/hubs/${state}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const hubPages = INSURANCE_HUBS.map((hub) => ({
    url: `${site}/hubs/${hub.stateSlug}/${hub.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: hub.priority <= 15 ? 0.85 : hub.priority >= 55 ? 0.88 : 0.7,
  }));

  // Phase 10: curated county ACA pages only (quality list — not all US counties).
  // Thin markets stay noindex at page level; FL federal markets prioritized in sitemap.
  const marketplaceCounties: MetadataRoute.Sitemap = CURATED_ACA_MARKETS.filter(
    (m) => m.stateCode === 'FL' || m.stateCode === 'TX' || m.stateCode === 'AZ'
  ).map((m) => ({
    url: `${site}${marketPath(m)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.82,
  }));

  // Plan X-Ray URLs are dynamic by plan id — not mass-emitted (quality over volume).

  const all = [
    ...staticRoutes,
    ...specialtyTopics,
    ...browseStates,
    ...hubStates,
    ...hubPages,
    ...marketplaceCounties,
    ...destinationStates,
    ...destinationCities,
    ...articles,
    ...providers,
  ];

  // Safety: never emit Move or monorepo-prefixed URLs
  return all.filter((entry) => {
    if (entry.url.includes('movetrusthub.com')) return false;
    if (entry.url.includes('/insurance/')) return false;
    return entry.url.startsWith(site);
  });
}
