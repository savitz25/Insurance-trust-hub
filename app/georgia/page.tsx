import type { Metadata } from 'next';
import { GeorgiaInsurancePage } from '@/components/georgia/ga-state-page';
import { loadGeorgiaInsuranceView } from '@/lib/georgia-intelligence/load';
import { buildGeorgiaInsuranceJsonLd } from '@/lib/georgia-intelligence/jsonld';
import { GEORGIA_INTELLIGENCE_GATE } from '@/lib/georgia-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: GEORGIA_INTELLIGENCE_GATE.title,
  description: GEORGIA_INTELLIGENCE_GATE.description,
  path: GEORGIA_INTELLIGENCE_GATE.path,
  noIndex: !GEORGIA_INTELLIGENCE_GATE.robotsIndex,
});

export default function GeorgiaIntelligencePage() {
  const snapshot = loadGeorgiaInsuranceView();
  return (
    <>
      <JsonLd data={buildGeorgiaInsuranceJsonLd(snapshot)} />
      <GeorgiaInsurancePage snapshot={snapshot} />
    </>
  );
}
