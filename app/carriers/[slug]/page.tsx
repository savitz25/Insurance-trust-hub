import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { CarrierIntelligenceView } from '@/components/carriers/carrier-intelligence-view';
import { buildMetadata } from '@/lib/seo/metadata';
import { shareRouteOgImage } from '@/lib/seo/share-hub';
import { getCarrierBySlug, CARRIER_REGISTRY, carrierPath } from '@/lib/carriers/registry';
import { loadCarrierIntelligence } from '@/lib/carriers/rollup';
import { JsonLd } from '@/lib/seo/json-ld';
import { metaCarrier, buildResearchPageGraph } from '@/lib/seo/research-seo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return CARRIER_REGISTRY.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getCarrierBySlug(slug);
  if (!entry) {
    return buildMetadata({
      title: 'Carrier research',
      description: 'Public-data carrier intelligence',
      noIndex: true,
    });
  }
  const data = await loadCarrierIntelligence(slug);
  const path = carrierPath(slug);
  const m = metaCarrier({
    displayName: entry.displayName,
    indexable: Boolean(data?.indexable),
  });
  const og = shareRouteOgImage(path, `${entry.displayName} — insurance research on InsuranceTrustHub`);
  return buildMetadata({
    title: m.title,
    description: m.description,
    path,
    noIndex: !data?.indexable,
    imageUrl: og.url,
    imageAlt: og.alt,
  });
}

export default async function CarrierPage({ params }: Props) {
  const { slug } = await params;
  if (!getCarrierBySlug(slug)) notFound();

  const data = await loadCarrierIntelligence(slug);
  if (!data) notFound();

  const m = metaCarrier({
    displayName: data.displayName,
    indexable: data.indexable,
  });
  const path = carrierPath(slug);
  const jsonLd = buildResearchPageGraph({
    path,
    name: m.h1,
    description: m.description,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Carrier research', path: '/carriers' },
      { name: data.displayName, path },
    ],
    dateModified: data.retrievedAt,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <ContextNav
            pathname={path}
            currentLabel={data.displayName}
            className="mb-2"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
            Carrier intelligence · Public data rollup
          </p>
        </div>
      </div>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <CarrierIntelligenceView data={data} />
      </div>
      <DisclaimerBanner />
    </>
  );
}
