import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getHubBySlug, getAllHubParams } from '@/lib/hubs/registry';
import { HubPageView } from '@/components/hub-page-view';
import { buildHubMetadata } from '@/lib/hubs/hub-seo';
import { getHubInventory } from '@/lib/dfs/providers-by-county';

/** Phase 4 — always read live verified inventory (avoid stale empty static shells) */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function generateStaticParams() {
  return getAllHubParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; slug: string }>;
}): Promise<Metadata> {
  const { state, slug } = await params;
  const hub = getHubBySlug(state, slug);
  if (!hub) return { title: 'Insurance Hub | Insurance Trust Hub' };

  const inventory = await getHubInventory(hub.slug);
  const health = inventory.providers.filter((p) =>
    p.insurance_types?.includes('health')
  ).length;

  return buildHubMetadata(hub, `/hubs/${state}/${slug}`, {
    total: inventory.total,
    health,
  });
}

export default async function HubPage({
  params,
}: {
  params: Promise<{ state: string; slug: string }>;
}) {
  const { state, slug } = await params;
  const hub = getHubBySlug(state, slug);
  if (!hub) notFound();

  const inventory = await getHubInventory(hub.slug);

  return (
    <HubPageView
      hub={hub}
      verifiedProviders={inventory.providers}
      verifiedTotal={inventory.total}
      inventoryShowing={inventory.showing}
      inventoryPageSize={inventory.pageSize}
    />
  );
}
