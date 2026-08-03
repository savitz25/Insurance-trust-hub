import { SITE_EMAIL, SITE_NAME, SITE_URL } from '@/lib/constants';
import type { Provider } from '@/types/provider';
import { brandAsset, BRAND_LOGO } from '@/lib/brand';

export const organizationSchema = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}${brandAsset(BRAND_LOGO.full)}`,
  email: SITE_EMAIL,
  contactPoint: {
    '@type': 'ContactPoint',
    email: SITE_EMAIL,
    contactType: 'customer service',
    areaServed: 'US',
    availableLanguage: 'English',
  },
  description:
    'Independent research directory of licensed insurance agencies and brokers in the United States. Compare listings and specialties; re-check DOI / NAIC records. We do not sell policies.',
};

export const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en-US',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/directory?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export const homepageServiceSchema = {
  '@type': 'Service',
  '@id': `${SITE_URL}/#insurance-research-directory`,
  name: 'Insurance Agency Research Directory',
  serviceType: 'Independent insurance agency research directory',
  provider: { '@id': `${SITE_URL}/#organization` },
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
  description:
    'Research licensed insurance agencies by state and specialty. Educational tools for ACA and Medicare. No paid placements. Not a policy marketplace.',
  url: SITE_URL,
};

export function buildInsuranceAgencySchema(provider: Provider) {
  return {
    '@type': 'InsuranceAgency',
    '@id': `${SITE_URL}/providers/${provider.slug}/#agency`,
    name: provider.name,
    url: provider.website ?? `${SITE_URL}/providers/${provider.slug}`,
    description: provider.short_description ?? provider.description,
    telephone: provider.phone ?? undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: provider.city,
      addressRegion: provider.state,
      postalCode: provider.zip ?? undefined,
      addressCountry: 'US',
    },
    aggregateRating: provider.review_count > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: provider.rating,
          reviewCount: provider.review_count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    areaServed: {
      '@type': 'State',
      name: provider.state,
    },
  };
}

export function buildLocalBusinessSchema(provider: Provider) {
  return {
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/providers/${provider.slug}/#localbusiness`,
    name: provider.name,
    image: provider.logo ?? `${SITE_URL}${brandAsset(BRAND_LOGO.icon192)}`,
    url: provider.website ?? `${SITE_URL}/providers/${provider.slug}`,
    telephone: provider.phone ?? undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: provider.city,
      addressRegion: provider.state,
      postalCode: provider.zip ?? undefined,
      addressCountry: 'US',
    },
    priceRange: '$$',
  };
}

export function buildHomepageGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationSchema, websiteSchema, homepageServiceSchema],
  };
}