import type { Metadata } from 'next';
import Link from 'next/link';
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
  return (
    <>
      <div className="border-b bg-[#E0F2FE]/80">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <p className="font-medium text-[#0A2540]">
            New: CMS county Medicare Intelligence for Miami-Dade, Broward &amp; Palm Beach
          </p>
          <div className="flex flex-wrap gap-3 font-medium text-[#0284C7]">
            <Link href="/guides/miami-dade-aca-marketplace" className="hover:underline">
              Miami-Dade ACA guide
            </Link>
            <Link href="/guides/broward-aca-marketplace" className="hover:underline">
              Broward ACA guide
            </Link>
            <Link href="/guides/palm-beach-aca-marketplace" className="hover:underline">
              Palm Beach ACA guide
            </Link>
            <Link href="/tools/marketplace-plan-research" className="hover:underline">
              Local plan landscape
            </Link>
            <Link href="/data/counties" className="hover:underline">
              Medicare dashboards
            </Link>
          </div>
        </div>
      </div>
      <HubPageView hub={hub} canonicalPath="/hubs/south-florida" />
    </>
  );
}