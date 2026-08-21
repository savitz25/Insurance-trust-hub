import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { shareRouteOgImage } from '@/lib/seo/share-hub';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildResearchPageGraph } from '@/lib/seo/research-seo';
import {
  getAcaMarketplaceGuide,
  getAllAcaMarketplaceGuideSlugs,
} from '@/lib/guides/aca-marketplace-guides';
import { AcaMarketplaceGuideView } from '@/components/guides/aca-marketplace-guide-view';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllAcaMarketplaceGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getAcaMarketplaceGuide(slug);
  if (!guide) return { title: 'Guide not found' };
  const og = shareRouteOgImage(`/guides/${slug}`, guide.h1 || guide.title);
  return buildMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${slug}`,
    type: 'article',
    imageUrl: og.url,
    imageAlt: og.alt,
  });
}

export default async function AcaMarketplaceGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getAcaMarketplaceGuide(slug);
  if (!guide) notFound();

  const path = `/guides/${slug}`;
  const jsonLd = buildResearchPageGraph({
    path,
    name: guide.h1,
    description: guide.description,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Guides', path: '/guides' },
      { name: guide.locationLabel, path },
    ],
    faqs: guide.faqs.map((f) => ({ question: f.q, answer: f.a })),
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <AcaMarketplaceGuideView guide={guide} />
    </>
  );
}
