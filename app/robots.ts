import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

/**
 * Coverage Intelligence SEO: allow research hubs; block ops, APIs, auth, wallet.
 * Seed agency noindex is enforced at page level (Phase 6A), not only robots.
 */
export default function robots(): MetadataRoute.Robots {
  const site = SITE_URL.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/auth/',
          '/my-insurance/',
          '/my-insurance',
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
