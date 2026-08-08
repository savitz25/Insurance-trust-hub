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
  const name = data.carrierName || data.contractId;
  return buildMetadata({
    title: `${name} (${data.contractId}) — Medicare contract intelligence`,
    description: data.indexable
      ? `CMS complaint-measure and local enrollment context for contract ${data.contractId} (${name}). Educational only — confirm on Medicare.gov.`
      : `Limited CMS context for contract ${data.contractId}. Educational research only.`,
    path,
    noIndex: !data.indexable,
  });
}

export default async function MedicareContractPage({ params }: Props) {
  const { contractId } = await params;
  const data = loadContractIntelligence(contractId);

  return (
    <>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <ContextNav
            pathname={contractIntelligencePath(contractId)}
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
