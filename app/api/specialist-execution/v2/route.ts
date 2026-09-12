import { NextResponse } from 'next/server';
import { executeSpecialistV2 } from '@/lib/specialist-execution/v2';
import type { SpecialistRequest } from '@/lib/specialist-execution/contract';
import { readInsuranceRequest } from '@/lib/insurance-ask/request';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow' };

export async function GET(request: Request) {
  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some(key => !['q','page','limit'].includes(key) || url.searchParams.getAll(key).length !== 1)) return NextResponse.json({contract:'trusthub-specialist-execution-v2',resultState:'INVALID_QUERY',error:{code:'invalid_parameters',message:'Use one q, page and optional limit; no parameters were ignored.'}}, {status:400,headers});
  const sharedParams = new URLSearchParams(url.searchParams); sharedParams.delete('limit');
  const validated = readInsuranceRequest(sharedParams);
  if(validated.error)return NextResponse.json({contract:'trusthub-specialist-execution-v2',resultState:'INVALID_QUERY',error:{code:'invalid_query',message:validated.error}},{status:400,headers});
  const result = await executeSpecialistV2({
    query: validated.raw,
    page: validated.page,
    limit: Number(url.searchParams.get('limit') ?? '20'),
  });
  return NextResponse.json(result.body, { status: result.status, headers });
}

export async function POST(request: Request) {
  let body: SpecialistRequest;
  try { body = await request.json() as SpecialistRequest; }
  catch { return NextResponse.json({ contract: 'trusthub-specialist-execution-v2', resultState: 'INVALID_QUERY', error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } }, { status: 400, headers }); }
  const result = await executeSpecialistV2(body);
  return NextResponse.json(result.body, { status: result.status, headers });
}
