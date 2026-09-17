import type { Metadata } from 'next';
import { OregonInsurancePage } from '@/components/oregon/or-state-page';
import { loadOregonInsuranceView } from '@/lib/oregon-intelligence/load';
import { buildOregonInsuranceJsonLd } from '@/lib/oregon-intelligence/jsonld';
import { OREGON_INTELLIGENCE_GATE } from '@/lib/oregon-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: OREGON_INTELLIGENCE_GATE.title,
  description: OREGON_INTELLIGENCE_GATE.description,
  path: OREGON_INTELLIGENCE_GATE.path,
  noIndex: !OREGON_INTELLIGENCE_GATE.robotsIndex,
});

export default function OregonIntelligencePage() {
  const snapshot = loadOregonInsuranceView();
  return (
    <>
      <JsonLd data={buildOregonInsuranceJsonLd(snapshot)} />
      <OregonInsurancePage snapshot={snapshot} />
    </>
  );
}
