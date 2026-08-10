import { NextResponse } from 'next/server';
import {
  getLocalMarketplaceLandscape,
  validateLandscapeInput,
} from '@/lib/marketplace/plans-search';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/landscape
 * Local plan landscape for cost / subsidy planners. Research only.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        errorCode: 'invalid_json',
        errorMessage: 'Invalid JSON body',
        usedLiveApi: false,
      },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;
  const ages = Array.isArray(b.ages)
    ? b.ages.map((a) => Number(a)).filter((n) => Number.isFinite(n))
    : undefined;
  const peopleRaw = Array.isArray(b.people) ? b.people : undefined;

  const validated = validateLandscapeInput({
    zip: String(b.zip ?? ''),
    year: b.year != null ? Number(b.year) : MARKETPLACE_PLAN_YEAR_DEFAULT,
    ages,
    people: peopleRaw?.map((p) => {
      const row = p as Record<string, unknown>;
      return {
        age: Number(row.age),
        usesTobacco: Boolean(row.usesTobacco ?? row.tobacco),
      };
    }),
    householdIncome:
      b.householdIncome != null
        ? Number(b.householdIncome)
        : b.income != null
          ? Number(b.income)
          : null,
    householdSize: b.householdSize != null ? Number(b.householdSize) : null,
    tobacco: Boolean(b.tobacco),
  });

  if (!validated.ok) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: 'invalid_input',
        errorMessage: validated.message,
        usedLiveApi: false,
      },
      { status: 400 }
    );
  }

  const landscape = await getLocalMarketplaceLandscape(validated.input);

  return NextResponse.json(landscape, {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    tool: 'marketplace-landscape',
    planYearDefault: MARKETPLACE_PLAN_YEAR_DEFAULT,
    requires: ['MARKETPLACE_API_KEY'],
    note: 'POST zip + ages (+ optional income) for local Bronze/Silver/Gold landscape. Educational only.',
  });
}
