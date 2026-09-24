import type { Metadata } from 'next';
import { MassachusettsInsurancePage } from '@/components/massachusetts/ma-state-page';
import { loadMassachusettsInsuranceView } from '@/lib/massachusetts-intelligence/load';
import { buildMassachusettsInsuranceJsonLd } from '@/lib/massachusetts-intelligence/jsonld';
import { MASSACHUSETTS_INTELLIGENCE_GATE } from '@/lib/massachusetts-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: MASSACHUSETTS_INTELLIGENCE_GATE.title,
  description: MASSACHUSETTS_INTELLIGENCE_GATE.description,
  path: MASSACHUSETTS_INTELLIGENCE_GATE.path,
  noIndex: !MASSACHUSETTS_INTELLIGENCE_GATE.robotsIndex,
});

export default function MassachusettsIntelligencePage() {
  const snapshot = loadMassachusettsInsuranceView();
  return (
    <>
      <JsonLd data={buildMassachusettsInsuranceJsonLd(snapshot)} />
      <MassachusettsInsurancePage snapshot={snapshot} />
    </>
  );
}
