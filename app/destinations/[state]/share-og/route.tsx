import {
  insuranceFallbackPng,
  renderInsuranceCardOrFallback,
  resolveInsuranceDestinationCard,
  shareOgHead,
} from '@/lib/og/insurance-share-og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ state: string }> },
) {
  try {
    const { state } = await context.params;
    return renderInsuranceCardOrFallback(resolveInsuranceDestinationCard(state));
  } catch {
    return insuranceFallbackPng();
  }
}

export function HEAD() {
  return shareOgHead();
}
