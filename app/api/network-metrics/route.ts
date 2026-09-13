import { loadInsuranceNetworkMetrics } from '@/lib/metrics/load-network-metrics';

export const dynamic = 'force-static';

export function GET() {
  const metrics = loadInsuranceNetworkMetrics();
  return Response.json(metrics, { headers: {
    'Cache-Control': 'public, max-age=0, s-maxage=300',
    'X-TrustHub-Contract-Revision': metrics.contractRevision!,
  } });
}
