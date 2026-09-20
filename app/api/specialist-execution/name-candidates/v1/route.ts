import { NextResponse } from 'next/server';
import { executeInsuranceNameCandidatesV1, insuranceNameCandidatesCapability, INSURANCE_NAME_CANDIDATES_CONTRACT, type NameCandidatesRequest } from '@/lib/specialist-execution/name-candidates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow' };

/** Capability document only. Searching is POST, so a name never has to be squeezed through a URL. */
export async function GET(request: Request) {
  if ([...new URL(request.url).searchParams.keys()].length) return NextResponse.json({ contract: INSURANCE_NAME_CANDIDATES_CONTRACT, resultState: 'INVALID_REQUEST', error: { code: 'use_post', message: 'Send name_candidates requests as POST JSON. No parameters were read.' } }, { status: 400, headers });
  return NextResponse.json(insuranceNameCandidatesCapability(), { headers });
}

export async function POST(request: Request) {
  let body: NameCandidatesRequest;
  try { body = await request.json() as NameCandidatesRequest; }
  catch { return NextResponse.json({ contract: INSURANCE_NAME_CANDIDATES_CONTRACT, resultState: 'INVALID_REQUEST', error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } }, { status: 400, headers }); }
  const result = await executeInsuranceNameCandidatesV1(body);
  return NextResponse.json(result.body, { status: result.status, headers });
}
