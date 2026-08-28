import type { Metadata } from 'next';
import { FloridaStatePage } from '@/components/florida/florida-state-page';
import { loadFloridaStateView } from '@/lib/national/load-fl-state-intel';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import {
  FLORIDA_INDEXABLE,
  FLORIDA_PAGE_DESCRIPTION,
  FLORIDA_PAGE_TITLE,
  FLORIDA_ROUTE,
} from '@/lib/national/fl-state-intel';

export const metadata: Metadata = buildMetadata({
  title: FLORIDA_PAGE_TITLE,
  description: FLORIDA_PAGE_DESCRIPTION,
  path: FLORIDA_ROUTE,
  noIndex: !FLORIDA_INDEXABLE,
});

export default function FloridaIntelligencePage() {
  const view = loadFloridaStateView();
  const origin = SITE_URL.replace(/\/$/, '');
  const url = `${origin}${FLORIDA_ROUTE}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: FLORIDA_PAGE_TITLE,
      description: FLORIDA_PAGE_DESCRIPTION,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
      about: 'Florida insurance licensing, market data, and regulatory research',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Florida insurance research', item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <FloridaStatePage view={view} />
    </>
  );
}
