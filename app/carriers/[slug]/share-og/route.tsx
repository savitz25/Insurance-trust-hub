import {
  insuranceFallbackPng,
  renderInsuranceCardOrFallback,
  resolveInsuranceCarrierCard,
  shareOgHead,
} from '@/lib/og/insurance-share-og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    return renderInsuranceCardOrFallback(resolveInsuranceCarrierCard(slug));
  } catch {
    return insuranceFallbackPng();
  }
}

export function HEAD() {
  return shareOgHead();
}
