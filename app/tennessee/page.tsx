import type { Metadata } from 'next';
import { TennesseeInsurancePage } from '@/components/tennessee/tn-state-page';
import { loadTennesseeInsuranceView } from '@/lib/tennessee-intelligence/load';
import { buildTennesseeInsuranceJsonLd } from '@/lib/tennessee-intelligence/jsonld';
import { TENNESSEE_INTELLIGENCE_GATE } from '@/lib/tennessee-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: TENNESSEE_INTELLIGENCE_GATE.title,
  description: TENNESSEE_INTELLIGENCE_GATE.description,
  path: TENNESSEE_INTELLIGENCE_GATE.path,
  noIndex: !TENNESSEE_INTELLIGENCE_GATE.robotsIndex,
});

export default function TennesseeIntelligencePage() {
  const snapshot = loadTennesseeInsuranceView();
  return (
    <>
      <JsonLd data={buildTennesseeInsuranceJsonLd(snapshot)} />
      <TennesseeInsurancePage snapshot={snapshot} />
    </>
  );
}
