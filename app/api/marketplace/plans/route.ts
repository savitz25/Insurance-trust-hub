import { NextResponse } from 'next/server';
import { searchMarketplacePlans } from '@/lib/marketplace/client';
import type { MarketplaceSearchInput } from '@/lib/marketplace/types';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/plans
 * Research-only Marketplace plan search. No lead capture. Fail closed.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: 'invalid_json', errorMessage: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;
  const zip = String(b.zip ?? '').replace(/\D/g, '').slice(0, 5);
  const year = Number(b.year) || MARKETPLACE_PLAN_YEAR_DEFAULT;
  const peopleRaw = Array.isArray(b.people) ? b.people : [];
  const people = peopleRaw
    .map((p) => {
      const row = p as Record<string, unknown>;
      return {
        age: Number(row.age),
        usesTobacco: Boolean(row.usesTobacco ?? row.tobacco),
      };
    })
    .filter((p) => Number.isFinite(p.age) && p.age >= 0 && p.age <= 120)
    .slice(0, 8);

  if (!people.length) {
    people.push({ age: 35, usesTobacco: false });
  }

  const incomeRaw = b.householdIncome ?? b.income;
  const householdIncome =
    incomeRaw == null || incomeRaw === ''
      ? null
      : Number(incomeRaw);

  const utilRaw = String(b.utilization ?? b.cmsUtilization ?? '').trim();
  const utilization =
    utilRaw === 'Low' || utilRaw === 'Medium' || utilRaw === 'High'
      ? utilRaw
      : null;

  const input: MarketplaceSearchInput = {
    zip,
    year,
    people,
    householdIncome: Number.isFinite(householdIncome as number)
      ? (householdIncome as number)
      : null,
    householdSize:
      b.householdSize != null ? Number(b.householdSize) : people.length,
    utilization,
  };

  const result = await searchMarketplacePlans(input);
  const status =
    result.ok || result.errorCode === 'empty_market' || result.errorCode === 'missing_api_key'
      ? 200
      : result.errorCode === 'invalid_zip'
        ? 400
        : 502;

  return NextResponse.json(result, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    tool: 'aca-plan-explorer',
    planYearDefault: MARKETPLACE_PLAN_YEAR_DEFAULT,
    requires: ['MARKETPLACE_API_KEY'],
    note: 'POST ZIP + household to search. Research only — not enrollment.',
  });
}
