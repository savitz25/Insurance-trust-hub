import type { Metadata } from 'next';
import { IllinoisInsurancePage } from '@/components/illinois/il-state-page';
import { loadIllinoisInsuranceView } from '@/lib/illinois-intelligence/load';
import { buildIllinoisInsuranceJsonLd } from '@/lib/illinois-intelligence/jsonld';
import { ILLINOIS_INTELLIGENCE_GATE } from '@/lib/illinois-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: ILLINOIS_INTELLIGENCE_GATE.title,
  description: ILLINOIS_INTELLIGENCE_GATE.description,
  path: ILLINOIS_INTELLIGENCE_GATE.path,
  noIndex: !ILLINOIS_INTELLIGENCE_GATE.robotsIndex,
});

export default function IllinoisIntelligencePage() {
  const snapshot = loadIllinoisInsuranceView();
  return (
    <>
      <JsonLd data={buildIllinoisInsuranceJsonLd(snapshot)} />
      <IllinoisInsurancePage snapshot={snapshot} />
    </>
  );
}
