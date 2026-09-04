import type { Metadata } from 'next';
import { WashingtonInsurancePage } from '@/components/washington/wa-state-page';
import { loadWashingtonInsuranceView } from '@/lib/washington-intelligence/load';
import { buildWashingtonInsuranceJsonLd } from '@/lib/washington-intelligence/jsonld';
import { WASHINGTON_INTELLIGENCE_GATE } from '@/lib/washington-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: WASHINGTON_INTELLIGENCE_GATE.title,
  description: WASHINGTON_INTELLIGENCE_GATE.description,
  path: WASHINGTON_INTELLIGENCE_GATE.path,
  noIndex: !WASHINGTON_INTELLIGENCE_GATE.robotsIndex,
});

export default function WashingtonIntelligencePage() {
  const snapshot = loadWashingtonInsuranceView();
  return (
    <>
      <JsonLd data={buildWashingtonInsuranceJsonLd(snapshot)} />
      <WashingtonInsurancePage snapshot={snapshot} />
    </>
  );
}
