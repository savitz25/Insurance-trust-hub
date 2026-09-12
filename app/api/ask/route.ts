import { NextResponse } from 'next/server';
import { INSURANCE_ASK_CAPABILITY, INSURANCE_ASK_CONTRACT } from '@/lib/insurance-ask/contract';
import { executeInsuranceRequest, publicAskPayload } from '@/lib/insurance-ask/execute';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  if (!q) {
    return NextResponse.json(
      { contract: INSURANCE_ASK_CONTRACT, capability: INSURANCE_ASK_CAPABILITY, error: 'Missing q' },
      { status: 400, headers: { 'X-Robots-Tag': 'noindex, follow' } },
    );
  }
  try {
    const result = await executeInsuranceRequest(url.searchParams);
    return NextResponse.json(publicAskPayload(result), { status: result.terminalState === 'INVALID_INPUT' ? 400 : 200, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow' } });
  } catch {
    return NextResponse.json({ contract: INSURANCE_ASK_CONTRACT, capability: INSURANCE_ASK_CAPABILITY, coverageState: 'UNKNOWN', error: 'Regulatory research is temporarily unavailable. No zero-count conclusion was inferred.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow' } });
  }
}
