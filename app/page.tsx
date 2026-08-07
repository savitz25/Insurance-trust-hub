import { InsuranceHero } from '@/components/insurance-hero';
import { InsuranceLandingSections } from '@/components/insurance-landing-sections';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildHomepageGraph } from '@/lib/seo/schemas';

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildHomepageGraph()} />

      {/* Phase 2 — primary hero (Protection & Coverage research layer) */}
      <InsuranceHero />

      {/* Phase 3 — tools, how it works, trust, pathways, network */}
      <InsuranceLandingSections />
    </>
  );
}
