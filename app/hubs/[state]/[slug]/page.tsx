import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getHubBySlug, getAllHubParams } from '@/lib/hubs/registry';
import { HubPageView } from '@/components/hub-page-view';
import { buildHubMetadata } from '@/lib/hubs/hub-seo';
import { getHubInventory } from '@/lib/dfs/providers-by-county';
import {
  parseHubLoaFilter,
  specialtyMatchesLoaFilter,
} from '@/components/hub-specialty-filter';

/** Phase 4/17 — always read live verified inventory (avoid stale empty static shells) */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export function generateStaticParams() {
  return getAllHubParams();
}

function parsePage(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; slug: string }>;
}): Promise<Metadata> {
  const { state, slug } = await params;
  const hub = getHubBySlug(state, slug);
  if (!hub) return { title: 'Insurance Hub | Insurance Trust Hub' };

  const inventory = await getHubInventory(hub.slug, { page: 1 });

  return buildHubMetadata(hub, `/hubs/${state}/${slug}`, {
    total: inventory.total,
  });
}

export default async function HubPage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { state, slug } = await params;
  const sp = await searchParams;
  const hub = getHubBySlug(state, slug);
  if (!hub) notFound();

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
    <HubPageView
      hub={hub}
      verifiedProviders={filtered}
      verifiedTotal={inventory.total}
      inventoryShowing={filtered.length}
      inventoryPageSize={inventory.pageSize}
      inventoryPage={inventory.page}
      inventoryTotalPages={inventory.totalPages}
      loaFilter={loaFilter}
    />
  );
}
