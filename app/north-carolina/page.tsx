import type { Metadata } from 'next';
import { NorthCarolinaInsurancePage } from '@/components/north-carolina/nc-state-page';
import { loadNorthCarolinaInsuranceView } from '@/lib/north-carolina-intelligence/load';
import { buildNorthCarolinaInsuranceJsonLd } from '@/lib/north-carolina-intelligence/jsonld';
import { NORTH_CAROLINA_INTELLIGENCE_GATE } from '@/lib/north-carolina-intelligence/publication';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: NORTH_CAROLINA_INTELLIGENCE_GATE.title,
  description: NORTH_CAROLINA_INTELLIGENCE_GATE.description,
  path: NORTH_CAROLINA_INTELLIGENCE_GATE.path,
  noIndex: !NORTH_CAROLINA_INTELLIGENCE_GATE.robotsIndex,
});

export default function NorthCarolinaIntelligencePage() {
  const snapshot = loadNorthCarolinaInsuranceView();
  return (
    <>
      <JsonLd data={buildNorthCarolinaInsuranceJsonLd(snapshot)} />
      <NorthCarolinaInsurancePage snapshot={snapshot} />
    </>
  );
}
