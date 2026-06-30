import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { DESTINATION_STATES } from '@/lib/destinations/data';
import { ARTICLES } from '@/lib/resources/articles';
import { FALLBACK_PROVIDERS } from '@/lib/providers/fallback-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/directory',
    '/destinations',
    '/resources',
    '/tools',
    '/tools/cost-estimator',
    '/tools/needs-assessment',
    '/tools/license-verification',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }));

  const destinationStates = DESTINATION_STATES.map((state) => ({
    url: `${SITE_URL}/destinations/${state.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const destinationCities = DESTINATION_STATES.flatMap((state) =>
    state.cities.map((city) => ({
      url: `${SITE_URL}/destinations/${state.slug}/${city.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  const articles = ARTICLES.map((article) => ({
    url: `${SITE_URL}/resources/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const providers = FALLBACK_PROVIDERS.map((provider) => ({
    url: `${SITE_URL}/providers/${provider.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...destinationStates,
    ...destinationCities,
    ...articles,
    ...providers,
  ];
}