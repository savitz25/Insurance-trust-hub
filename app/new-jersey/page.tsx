import type { Metadata } from 'next';
import { NewJerseyInsurancePage } from '@/components/new-jersey/nj-state-page';
import { loadNewJerseyInsuranceView } from '@/lib/new-jersey-intelligence/load';
import { buildNewJerseyInsuranceJsonLd } from '@/lib/new-jersey-intelligence/jsonld';
import { NEW_JERSEY_INTELLIGENCE_GATE } from '@/lib/new-jersey-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: NEW_JERSEY_INTELLIGENCE_GATE.title,
  description: NEW_JERSEY_INTELLIGENCE_GATE.description,
  path: NEW_JERSEY_INTELLIGENCE_GATE.path,
  noIndex: !NEW_JERSEY_INTELLIGENCE_GATE.robotsIndex,
});

export default function NewJerseyIntelligencePage() {
  const snapshot = loadNewJerseyInsuranceView();
  return (
    <>
      <JsonLd data={buildNewJerseyInsuranceJsonLd(snapshot)} />
      <NewJerseyInsurancePage snapshot={snapshot} />
    </>
  );
}
