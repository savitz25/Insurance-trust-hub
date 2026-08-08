import { NextResponse } from 'next/server';
import { searchMarketplaceProviders } from '@/lib/marketplace/coverage';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/providers/search
 * CMS provider search — research only, no invented hits.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, hits: [], errorCode: 'invalid_json', errorMessage: 'Invalid JSON' },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;
  const result = await searchMarketplaceProviders({
    q: String(b.q ?? b.query ?? ''),
    zip: String(b.zip ?? ''),
    year: Number(b.year) || MARKETPLACE_PLAN_YEAR_DEFAULT,
    type:
      b.type === 'Facility' || b.type === 'Individual' || b.type === 'Group'
        ? b.type
        : 'Individual,Facility',
    specialty: b.specialty != null ? String(b.specialty) : null,
  });

  const status =
    result.ok || result.errorCode === 'missing_api_key' ? 200 : result.errorCode === 'invalid_zip' || result.errorCode === 'invalid_query' ? 400 : 502;

  return NextResponse.json(result, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
