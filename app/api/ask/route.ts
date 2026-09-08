import { NextResponse } from 'next/server';
import { INSURANCE_ASK_CAPABILITY, INSURANCE_ASK_CONTRACT } from '@/lib/insurance-ask/contract';
import { executeInsuranceAsk, publicAskPayload } from '@/lib/insurance-ask/execute';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 180);
  const page = Math.max(1, Math.min(200, Number(url.searchParams.get('page') ?? '1') || 1));
  if (!q) {
    return NextResponse.json(
      { contract: INSURANCE_ASK_CONTRACT, capability: INSURANCE_ASK_CAPABILITY, error: 'Missing q' },
      { status: 400, headers: { 'X-Robots-Tag': 'noindex, follow' } },
    );
  }
  try {
    const result = await executeInsuranceAsk(q, page);
    return NextResponse.json(publicAskPayload(result), { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', 'X-Robots-Tag': 'noindex, follow' } });
  } catch {
    return NextResponse.json({ contract: INSURANCE_ASK_CONTRACT, capability: INSURANCE_ASK_CAPABILITY, coverageState: 'UNKNOWN', error: 'Regulatory research is temporarily unavailable. No zero-count conclusion was inferred.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow' } });
  }
}
