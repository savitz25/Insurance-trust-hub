import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { isPrioritySitemapPath, SEO_CLUSTERS } from '@/lib/seo/seo-clusters';
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
import { allCanonicalMedicareCountyPaths } from '@/lib/insurance/cms/medicare-routes';
import { listIndexableContractIds } from '@/lib/insurance/cms/contract-intelligence';
import { listMedicareEvidencedCarrierSlugs } from '@/lib/carriers/rollup';
import { carrierPath } from '@/lib/carriers/registry';
import { publishedProfileSitemapPaths } from '@/lib/national/legal-insurer-pilot';

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
    '/california',
    '/florida',
    '/new-jersey',
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
    '/tools/coverage-compass',
    '/tools/needs-assessment',
    '/tools/license-verification',
    '/tools/medicare-plan-finder',
    '/tools/medicare-provider-lookup',
    '/tools/aca-plan-explorer',
    '/tools/marketplace-plan-research',
    '/guides',
    '/guides/florida-aca-marketplace',
    '/guides/miami-dade-aca-marketplace',
    '/guides/broward-aca-marketplace',
    '/guides/palm-beach-aca-marketplace',
    '/guides/texas-aca-marketplace',
    '/guides/houston-aca-marketplace',
    '/guides/dallas-aca-marketplace',
    '/guides/georgia-aca-marketplace',
    '/guides/atlanta-aca-marketplace',
    '/guides/north-carolina-aca-marketplace',
    '/guides/charlotte-aca-marketplace',
    '/guides/research-triangle-aca-marketplace',
    '/guides/pennsylvania-aca-marketplace',
    '/guides/philadelphia-aca-marketplace',
    '/guides/pittsburgh-aca-marketplace',
    '/guides/new-jersey-aca-marketplace',
    '/guides/south-jersey-aca-marketplace',
    '/guides/central-jersey-aca-marketplace',
    '/guides/north-jersey-aca-marketplace',
    '/guides/new-york-aca-marketplace',
    '/guides/nyc-aca-marketplace',
    '/guides/long-island-aca-marketplace',
    '/guides/westchester-aca-marketplace',
    '/guides/connecticut-aca-marketplace',
    '/guides/fairfield-county-aca-marketplace',
    '/guides/hartford-aca-marketplace',
    '/marketplace',
    '/medicare',
    '/carriers',
    '/insurers',
    '/data/plan-complaint-index',
    '/data/counties',
    '/data/counties/miami-dade-fl',
    '/data/counties/broward-fl',
    '/data/counties/palm-beach-fl',
    // My Insurance wallet is noindex (personal workspace) — not in sitemap
    '/about',
    '/contact',
    '/claim-listing',
    '/privacy',
    '/terms',
  ].map((path) => ({
    url: path === '' ? site : `${site}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/tools' ? ('daily' as const) : ('weekly' as const),
    priority:
      path === ''
        ? 1
        : isPrioritySitemapPath(path)
          ? 0.95
          : path === '/tools' ||
              path === '/medicare' ||
              path === '/marketplace' ||
              path === '/methodology'
            ? 0.9
            : 0.75,
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

  // Stage 0: never sitemap seed/fallback catalog — only live promoted inventory would qualify
  const providers: MetadataRoute.Sitemap = [];
  void FALLBACK_PROVIDERS;
  void isIndexableListing;
  void classifyProviderListing;

  const hubStates = getAllStateSlugs().map((state) => ({
    url: `${site}/hubs/${state}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const hubPages = INSURANCE_HUBS.map((hub) => {
    const path = `/hubs/${hub.stateSlug}/${hub.slug}`;
    return {
      url: `${site}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: isPrioritySitemapPath(path) ? 0.92 : 0.55,
    };
  });

  const clusterCanonicals = SEO_CLUSTERS.filter(
    (c) => !INSURANCE_HUBS.some((h) => `/hubs/${h.stateSlug}/${h.slug}` === c.hubPath)
  ).map((c) => ({
    url: `${site}${c.hubPath}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.94,
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

  // Phase 12: quality-gated Medicare county + contract intelligence URLs only
  const medicareCounties: MetadataRoute.Sitemap = allCanonicalMedicareCountyPaths().map(
    (p) => ({
      url: `${site}/medicare/${p.state}/${p.county}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.88,
    })
  );

  const medicareContracts: MetadataRoute.Sitemap = listIndexableContractIds(60).map(
    (contractId) => ({
      url: `${site}/medicare/contracts/${contractId}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })
  );

  // Phase 13: carriers with Medicare extract evidence (ACA live evidence not required for sitemap)
  const carrierPages: MetadataRoute.Sitemap = listMedicareEvidencedCarrierSlugs().map(
    (slug) => ({
      url: `${site}${carrierPath(slug)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })
  );

  // INS-INSURER-006: exactly 26 legal-insurer profile URLs. Landing is in staticRoutes.
  const legalInsurerProfiles: MetadataRoute.Sitemap = publishedProfileSitemapPaths().map((path) => ({
    url: `${site}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const all = [
    ...staticRoutes,
    ...specialtyTopics,
    ...browseStates,
    ...hubStates,
    ...hubPages,
    ...clusterCanonicals,
    ...marketplaceCounties,
    ...medicareCounties,
    ...medicareContracts,
    ...carrierPages,
    ...legalInsurerProfiles,
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
