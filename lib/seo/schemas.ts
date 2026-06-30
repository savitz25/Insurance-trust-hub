import { SITE_EMAIL, SITE_NAME, SITE_URL } from '@/lib/constants';
import type { Provider } from '@/types/provider';

export const organizationSchema = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/insurance-trust-hub-logo.png`,
  email: SITE_EMAIL,
  contactPoint: {
    '@type': 'ContactPoint',
    email: SITE_EMAIL,
    contactType: 'customer service',
    areaServed: 'US',
    availableLanguage: 'English',
  },
  description:
    'Independent directory of licensed insurance agencies and brokers in the United States. Compare reviews, specialties, and request quotes for personal and commercial coverage.',
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
  '@id': `${SITE_URL}/#insurance-quote-service`,
  name: 'Insurance Agency Matching',
  serviceType: 'Insurance agency comparison and quote referral',
  provider: { '@id': `${SITE_URL}/#organization` },
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
  description:
    'Compare licensed insurance agencies by state, specialty, and customer reviews. Request free quotes for auto, home, life, and business insurance.',
  url: SITE_URL,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free quote referral to licensed insurance agencies',
  },
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
    image: provider.logo ?? `${SITE_URL}/brand/insurance-trust-hub-logo.png`,
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