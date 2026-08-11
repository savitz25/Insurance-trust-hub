import type { Metadata } from 'next';
import Link from 'next/link';
import { HubPageView } from '@/components/hub-page-view';
import { getSouthFloridaHub } from '@/lib/hubs/specialty-topics';
import { buildHubMetadata } from '@/lib/hubs/hub-seo';
import { getVerifiedProvidersForHub } from '@/lib/dfs/providers-by-county';

const hub = getSouthFloridaHub();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const verifiedProviders = await getVerifiedProvidersForHub(hub.slug);
  const health = verifiedProviders.filter((p) =>
    p.insurance_types?.includes('health')
  ).length;
  return buildHubMetadata(hub, '/hubs/south-florida', {
    total: verifiedProviders.length,
    health,
  });
}

export default async function SouthFloridaHubPage() {
  const verifiedProviders = await getVerifiedProvidersForHub(hub.slug);

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
      <HubPageView
        hub={hub}
        canonicalPath="/hubs/south-florida"
        verifiedProviders={verifiedProviders}
      />
    </>
  );
}
