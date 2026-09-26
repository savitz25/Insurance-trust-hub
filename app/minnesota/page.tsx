import type { Metadata } from 'next';
import { MinnesotaInsurancePage } from '@/components/minnesota/mn-state-page';
import { buildMinnesotaInsuranceJsonLd } from '@/lib/minnesota-intelligence/jsonld';
import { loadMinnesotaInsuranceView } from '@/lib/minnesota-intelligence/load';
import { MINNESOTA_INTELLIGENCE_GATE } from '@/lib/minnesota-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: MINNESOTA_INTELLIGENCE_GATE.title,
  description: MINNESOTA_INTELLIGENCE_GATE.description,
  path: MINNESOTA_INTELLIGENCE_GATE.path,
  noIndex: !MINNESOTA_INTELLIGENCE_GATE.robotsIndex,
});

export default function MinnesotaIntelligencePage() {
  const snapshot = loadMinnesotaInsuranceView();
  return (
    <>
      <JsonLd data={buildMinnesotaInsuranceJsonLd(snapshot)} />
      <MinnesotaInsurancePage snapshot={snapshot} />
    </>
  );
}
