import type { Metadata } from 'next';
import { OhioInsurancePage } from '@/components/ohio/oh-state-page';
import { loadOhioInsuranceView } from '@/lib/ohio-intelligence/load';
import { buildOhioInsuranceJsonLd } from '@/lib/ohio-intelligence/jsonld';
import { OHIO_INTELLIGENCE_GATE } from '@/lib/ohio-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: OHIO_INTELLIGENCE_GATE.title,
  description: OHIO_INTELLIGENCE_GATE.description,
  path: OHIO_INTELLIGENCE_GATE.path,
  noIndex: !OHIO_INTELLIGENCE_GATE.robotsIndex,
});

export default function OhioIntelligencePage() {
  const snapshot = loadOhioInsuranceView();
  return (
    <>
      <JsonLd data={buildOhioInsuranceJsonLd(snapshot)} />
      <OhioInsurancePage snapshot={snapshot} />
    </>
  );
}
