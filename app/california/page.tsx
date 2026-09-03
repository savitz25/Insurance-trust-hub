import type { Metadata } from 'next';
import { CaliforniaInsurancePage } from '@/components/california/ca-state-page';
import { loadCaliforniaInsuranceView } from '@/lib/california-intelligence/load';
import { buildCaliforniaInsuranceJsonLd } from '@/lib/california-intelligence/jsonld';
import { CALIFORNIA_INTELLIGENCE_GATE } from '@/lib/california-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: CALIFORNIA_INTELLIGENCE_GATE.title,
  description: CALIFORNIA_INTELLIGENCE_GATE.description,
  path: CALIFORNIA_INTELLIGENCE_GATE.path,
  noIndex: !CALIFORNIA_INTELLIGENCE_GATE.robotsIndex,
});

export default function CaliforniaIntelligencePage() {
  const snapshot = loadCaliforniaInsuranceView();
  return (
    <>
      <JsonLd data={buildCaliforniaInsuranceJsonLd(snapshot)} />
      <CaliforniaInsurancePage snapshot={snapshot} />
    </>
  );
}
