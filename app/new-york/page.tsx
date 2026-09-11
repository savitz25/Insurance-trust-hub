import type { Metadata } from 'next';
import { NewYorkInsurancePage } from '@/components/new-york/ny-state-page';
import { loadNewYorkInsuranceView } from '@/lib/new-york-intelligence/load';
import { buildNewYorkInsuranceJsonLd } from '@/lib/new-york-intelligence/jsonld';
import { NEW_YORK_INTELLIGENCE_GATE } from '@/lib/new-york-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: NEW_YORK_INTELLIGENCE_GATE.title,
  description: NEW_YORK_INTELLIGENCE_GATE.description,
  path: NEW_YORK_INTELLIGENCE_GATE.path,
  noIndex: !NEW_YORK_INTELLIGENCE_GATE.robotsIndex,
});

export default function NewYorkIntelligencePage() {
  const snapshot = loadNewYorkInsuranceView();
  return (
    <>
      <JsonLd data={buildNewYorkInsuranceJsonLd(snapshot)} />
      <NewYorkInsurancePage snapshot={snapshot} />
    </>
  );
}
