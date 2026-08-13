import type { Metadata } from 'next';
import Link from 'next/link';
import { HubPageView } from '@/components/hub-page-view';
import { getSouthFloridaHub } from '@/lib/hubs/specialty-topics';
import { buildHubMetadata } from '@/lib/hubs/hub-seo';
import { getHubInventory } from '@/lib/dfs/providers-by-county';
import {
  parseHubLoaFilter,
  specialtyMatchesLoaFilter,
} from '@/components/hub-specialty-filter';

const hub = getSouthFloridaHub();

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function parsePage(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export async function generateMetadata(): Promise<Metadata> {
  const inventory = await getHubInventory(hub.slug, { page: 1 });
  return buildHubMetadata(hub, '/hubs/south-florida', {
    total: inventory.total,
  });
}

export default async function SouthFloridaHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const loaFilter = parseHubLoaFilter(sp.loa);
  const inventory = await getHubInventory(hub.slug, { page });
  const filtered =
    loaFilter === 'all'
      ? inventory.providers
      : inventory.providers.filter((p) =>
          specialtyMatchesLoaFilter(p.specialties, loaFilter)
        );

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
        verifiedProviders={filtered}
        verifiedTotal={inventory.total}
        inventoryShowing={filtered.length}
        inventoryPageSize={inventory.pageSize}
        inventoryPage={inventory.page}
        inventoryTotalPages={inventory.totalPages}
        loaFilter={loaFilter}
      />
    </>
  );
}
