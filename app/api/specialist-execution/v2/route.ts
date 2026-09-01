import { NextResponse } from 'next/server';
import { executeSpecialistV2 } from '@/lib/specialist-execution/v2';
import type { SpecialistRequest } from '@/lib/specialist-execution/contract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const headers = { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', 'X-Robots-Tag': 'noindex, follow' };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await executeSpecialistV2({
    query: (url.searchParams.get('q') ?? '').trim().slice(0, 400),
    page: Number(url.searchParams.get('page') ?? '1'),
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
