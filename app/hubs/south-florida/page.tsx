import type { Metadata } from 'next';
import { HubPageView } from '@/components/hub-page-view';
import { getSouthFloridaHub } from '@/lib/hubs/specialty-topics';
import { SITE_URL } from '@/lib/constants';

const hub = getSouthFloridaHub();

export const metadata: Metadata = {
  title: 'South Florida Insurance Agents (2026) | Miami-Dade, Broward & Palm Beach',
  description:
    'Compare 12 verified health insurance agents across South Florida tri-county. Medicare Advantage, ACA, supplement plans — FL DFS verified.',
  alternates: { canonical: `${SITE_URL}/hubs/south-florida` },
  openGraph: {
    title: 'South Florida Insurance Agents (2026)',
    description: hub.metaDescription,
    url: `${SITE_URL}/hubs/south-florida`,
  },
};

export default function SouthFloridaHubPage() {
  return <HubPageView hub={hub} canonicalPath="/hubs/south-florida" />;
}