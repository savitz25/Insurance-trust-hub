import type { Metadata } from 'next';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContractIntelligenceView } from '@/components/insurance/cms/contract-intelligence-view';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  listIndexableContractIds,
  loadContractIntelligence,
} from '@/lib/insurance/cms/contract-intelligence';
import { contractIntelligencePath } from '@/lib/insurance/cms/medicare-routes';
import { JsonLd } from '@/lib/seo/json-ld';
import { metaMedicareContract, buildResearchPageGraph } from '@/lib/seo/research-seo';

export const dynamic = 'force-static';

type Props = {
  params: Promise<{ contractId: string }>;
};

export function generateStaticParams() {
  return listIndexableContractIds(100).map((contractId) => ({ contractId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { contractId } = await params;
  const data = loadContractIntelligence(contractId);
  const path = contractIntelligencePath(contractId);
  if (!data.ok) {
    return buildMetadata({
      title: 'Medicare contract research unavailable',
      description: 'CMS contract research — no invented ratings.',
      path,
      noIndex: true,
    });
  }
  const m = metaMedicareContract({
    contractId: data.contractId,
    carrierName: data.carrierName,
    indexable: data.indexable,
  });
  return buildMetadata({
    title: m.title,
    description: m.description,
    path,
    noIndex: !data.indexable,
  });
}

export default async function MedicareContractPage({ params }: Props) {
  const { contractId } = await params;
  const data = loadContractIntelligence(contractId);
  const path = contractIntelligencePath(contractId);
  const m = metaMedicareContract({
    contractId: data.contractId,
    carrierName: data.carrierName,
    indexable: data.indexable,
  });
  const jsonLd = data.ok
    ? buildResearchPageGraph({
        path,
        name: m.h1,
        description: m.description,
        breadcrumbs: [
          { name: 'Home', path: '/' },
          { name: 'Medicare research', path: '/medicare' },
          { name: data.contractId, path },
        ],
        dateModified: data.complaintSyncedAt,
      })
    : null;

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <ContextNav
            pathname={path}
            currentLabel="Contract intelligence"
            className="mb-2"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">
            Medicare · Contract research
          </p>
        </div>
      </div>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <ContractIntelligenceView data={data} />
      </div>
      <DisclaimerBanner />
    </>
  );
}
