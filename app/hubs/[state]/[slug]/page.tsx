import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getHubBySlug, getAllHubParams } from '@/lib/hubs/registry';
import { HubPageView } from '@/components/hub-page-view';
import { buildHubMetadata } from '@/lib/hubs/hub-seo';

export const dynamic = 'force-static';

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

  return buildHubMetadata(hub, `/hubs/${state}/${slug}`);
}

export default async function HubPage({
  params,
}: {
  params: Promise<{ state: string; slug: string }>;
}) {
  const { state, slug } = await params;
  const hub = getHubBySlug(state, slug);
  if (!hub) notFound();

  return <HubPageView hub={hub} />;
}
