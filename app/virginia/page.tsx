import type { Metadata } from 'next';
import { VirginiaInsurancePage } from '@/components/virginia/va-state-page';
import { loadVirginiaInsuranceView } from '@/lib/virginia-intelligence/load';
import { buildVirginiaInsuranceJsonLd } from '@/lib/virginia-intelligence/jsonld';
import { VIRGINIA_INTELLIGENCE_GATE } from '@/lib/virginia-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: VIRGINIA_INTELLIGENCE_GATE.title,
  description: VIRGINIA_INTELLIGENCE_GATE.description,
  path: VIRGINIA_INTELLIGENCE_GATE.path,
  noIndex: !VIRGINIA_INTELLIGENCE_GATE.robotsIndex,
});

export default function VirginiaIntelligencePage() {
  const snapshot = loadVirginiaInsuranceView();
  return (
    <>
      <JsonLd data={buildVirginiaInsuranceJsonLd(snapshot)} />
      <VirginiaInsurancePage snapshot={snapshot} />
    </>
  );
}
