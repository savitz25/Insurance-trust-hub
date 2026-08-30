import { NextResponse } from 'next/server';
import { INSURANCE_ASK_CAPABILITY, INSURANCE_ASK_CONTRACT } from '@/lib/insurance-ask/contract';
import { executeInsuranceAsk, publicAskPayload } from '@/lib/insurance-ask/execute';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 400);
  const page = Number(url.searchParams.get('page') ?? '1') || 1;
  if (!q) {
    return NextResponse.json(
      { contract: INSURANCE_ASK_CONTRACT, capability: INSURANCE_ASK_CAPABILITY, error: 'Missing q' },
      { status: 400, headers: { 'X-Robots-Tag': 'noindex, follow' } },
    );
  }
  const result = await executeInsuranceAsk(q, page);
  return NextResponse.json(publicAskPayload(result), {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'X-Robots-Tag': 'noindex, follow',
    },
  });
}
