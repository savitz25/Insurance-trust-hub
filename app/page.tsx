import { InsuranceHomeIntelligence } from '@/components/home/insurance-home-intelligence';
import { loadInsuranceNetworkMetrics } from '@/lib/metrics/load-network-metrics';
import { projectHomeIntelFromNetworkMetrics } from '@/lib/metrics/project-home-intel';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildHomepageGraph } from '@/lib/seo/schemas';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Insurance Agency, License, Carrier & Regulatory Research',
  description:
    'Research insurance agencies, licensing, lines of authority, appointments, insurers, complaints, examinations, rate filings, and state regulatory evidence. No paid rankings or Trust Score.',
  path: '/',
});

export default function HomePage() {
  const metrics = loadInsuranceNetworkMetrics();
  const intel = projectHomeIntelFromNetworkMetrics(metrics);
  return (
    <>
      <JsonLd data={buildHomepageGraph()} />
      <InsuranceHomeIntelligence intel={intel} metrics={metrics} />
    </>
  );
}
