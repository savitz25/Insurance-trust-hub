import type { Metadata } from 'next';
import { ColoradoInsurancePage } from '@/components/colorado/co-state-page';
import { loadColoradoInsuranceView } from '@/lib/colorado-intelligence/load';
import { buildColoradoInsuranceJsonLd } from '@/lib/colorado-intelligence/jsonld';
import { COLORADO_INTELLIGENCE_GATE } from '@/lib/colorado-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: COLORADO_INTELLIGENCE_GATE.title,
  description: COLORADO_INTELLIGENCE_GATE.description,
  path: COLORADO_INTELLIGENCE_GATE.path,
  noIndex: !COLORADO_INTELLIGENCE_GATE.robotsIndex,
});

export default function ColoradoIntelligencePage() {
  const snapshot = loadColoradoInsuranceView();
  return (
    <>
      <JsonLd data={buildColoradoInsuranceJsonLd(snapshot)} />
      <ColoradoInsurancePage snapshot={snapshot} />
      <StateHubLinks stateSlug="colorado" />
    </>
  );
}
