import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProviderBySlug } from '@/lib/providers/queries';
import { resolveProviderStateView, stateViewMetadataOptions } from '@/lib/providers/state-view';
import { ProviderStateView } from '@/components/providers/provider-state-view';
import { buildMetadata } from '@/lib/seo/metadata';

interface ProviderStatePageProps {
  params: Promise<{ slug: string; state: string }>;
}

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata({ params }: ProviderStatePageProps): Promise<Metadata> {
  const { slug, state } = await params;
  try {
    const provider = await getProviderBySlug(slug);
    const options = provider ? stateViewMetadataOptions(provider, state) : null;
    if (!provider || !options) {
      return { title: 'Provider Not Found', robots: { index: false, follow: true } };
    }
    return buildMetadata(options);
  } catch {
    return { title: 'Provider Not Found', robots: { index: false, follow: true } };
  }
}

/** Read the existing providers row. 404 unless this state has a badge-eligible license. */
export default async function ProviderStatePage({ params }: ProviderStatePageProps) {
  const { slug, state } = await params;
  const provider = await getProviderBySlug(slug);
  if (!provider) notFound();
  const view = resolveProviderStateView(provider, state);
  if (!view) notFound();
  return <ProviderStateView provider={provider} stateCode={state} />;
}
