import type { Metadata } from 'next';
import { PennsylvaniaInsurancePage } from '@/components/pennsylvania/pa-state-page';
import { loadPennsylvaniaInsuranceView } from '@/lib/pennsylvania-intelligence/load';
import { buildPennsylvaniaInsuranceJsonLd } from '@/lib/pennsylvania-intelligence/jsonld';
import { PENNSYLVANIA_INTELLIGENCE_GATE } from '@/lib/pennsylvania-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: PENNSYLVANIA_INTELLIGENCE_GATE.title,
  description: PENNSYLVANIA_INTELLIGENCE_GATE.description,
  path: PENNSYLVANIA_INTELLIGENCE_GATE.path,
  noIndex: !PENNSYLVANIA_INTELLIGENCE_GATE.robotsIndex,
});

export default function PennsylvaniaIntelligencePage() {
  const snapshot = loadPennsylvaniaInsuranceView();
  return (
    <>
      <JsonLd data={buildPennsylvaniaInsuranceJsonLd(snapshot)} />
      <PennsylvaniaInsurancePage snapshot={snapshot} />
    </>
  );
}
