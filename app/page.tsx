import { InsuranceHomeIntelligence } from '@/components/home/insurance-home-intelligence';
import { loadInsuranceHomeIntel } from '@/lib/national/load-home-intel';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildHomepageGraph } from '@/lib/seo/schemas';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Insurance Licensing & Regulatory Intelligence',
  description:
    'Independent national insurance research: agencies, producers, insurers, licenses, lines of authority, appointments, and public regulatory records. No paid rankings. No lead fees. We organize the evidence. You decide.',
  path: '/',
});

export default function HomePage() {
  const intel = loadInsuranceHomeIntel();
  return (
    <>
      <JsonLd data={buildHomepageGraph()} />
      <InsuranceHomeIntelligence intel={intel} />
    </>
  );
}
