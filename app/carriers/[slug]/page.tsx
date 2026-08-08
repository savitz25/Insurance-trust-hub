import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { CarrierIntelligenceView } from '@/components/carriers/carrier-intelligence-view';
import { buildMetadata } from '@/lib/seo/metadata';
import { getCarrierBySlug, CARRIER_REGISTRY, carrierPath } from '@/lib/carriers/registry';
import { loadCarrierIntelligence } from '@/lib/carriers/rollup';

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
  return buildMetadata({
    title: `${entry.displayName} — carrier research (CMS public data)`,
    description: `Research signals for ${entry.displayName} from CMS Marketplace and Medicare extracts. Educational only — not a sales ranking. Confirm on HealthCare.gov and Medicare.gov.`,
    path,
    noIndex: !data?.indexable,
  });
}

export default async function CarrierPage({ params }: Props) {
  const { slug } = await params;
  if (!getCarrierBySlug(slug)) notFound();

  const data = await loadCarrierIntelligence(slug);
  if (!data) notFound();

  return (
    <>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <ContextNav
            pathname={carrierPath(slug)}
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
