import type { Metadata } from 'next';
import { NevadaInsurancePage } from '@/components/nevada/nv-state-page';
import { loadNevadaInsuranceView } from '@/lib/nevada-intelligence/load';
import { buildNevadaInsuranceJsonLd } from '@/lib/nevada-intelligence/jsonld';
import { NEVADA_INTELLIGENCE_GATE } from '@/lib/nevada-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: NEVADA_INTELLIGENCE_GATE.title,
  description: NEVADA_INTELLIGENCE_GATE.description,
  path: NEVADA_INTELLIGENCE_GATE.path,
  noIndex: !NEVADA_INTELLIGENCE_GATE.robotsIndex,
});

export default function NevadaIntelligencePage() {
  const snapshot = loadNevadaInsuranceView();
  return (
    <>
      <JsonLd data={buildNevadaInsuranceJsonLd(snapshot)} />
      <NevadaInsurancePage snapshot={snapshot} />
    </>
  );
}
