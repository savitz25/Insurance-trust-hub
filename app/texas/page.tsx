import type { Metadata } from 'next';
import { TexasInsurancePage } from '@/components/texas/tx-state-page';
import { loadTexasInsuranceView } from '@/lib/texas-intelligence/load';
import { buildTexasInsuranceJsonLd } from '@/lib/texas-intelligence/jsonld';
import { TEXAS_INTELLIGENCE_GATE } from '@/lib/texas-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: TEXAS_INTELLIGENCE_GATE.title,
  description: TEXAS_INTELLIGENCE_GATE.description,
  path: TEXAS_INTELLIGENCE_GATE.path,
  noIndex: !TEXAS_INTELLIGENCE_GATE.robotsIndex,
});

export default function TexasIntelligencePage() {
  const snapshot = loadTexasInsuranceView();
  return (
    <>
      <JsonLd data={buildTexasInsuranceJsonLd(snapshot)} />
      <TexasInsurancePage snapshot={snapshot} />
    </>
  );
}
