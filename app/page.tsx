import { InsuranceHero } from '@/components/insurance-hero';
import { InsuranceLandingSections } from '@/components/insurance-landing-sections';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildHomepageGraph } from '@/lib/seo/schemas';
import {
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_TITLE,
  buildMetadata,
} from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: HOMEPAGE_TITLE,
  description: HOMEPAGE_DESCRIPTION,
  path: '/',
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildHomepageGraph()} />

      {/* Phase 2 — independent research product (three-question IA) */}
      <InsuranceHero />
      <InsuranceLandingSections />
    </>
  );
}
