import { NextResponse } from 'next/server';
import { matchCoverageForPlans } from '@/lib/marketplace/coverage';
import type { SessionDoctor, SessionPrescription } from '@/lib/marketplace/types';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/coverage
 * Match session doctors (NPI) + prescriptions (RxCUI) to plan IDs via CMS.
 * Fail closed — never invent Covered / in-network.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        byPlan: {},
        errorCode: 'invalid_json',
        errorMessage: 'Invalid JSON',
        limitations: [],
      },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;
  const year = Number(b.year) || MARKETPLACE_PLAN_YEAR_DEFAULT;
  const planIds = Array.isArray(b.planIds)
    ? b.planIds.map((id) => String(id)).filter(Boolean)
    : [];

  const doctorsRaw = Array.isArray(b.doctors) ? b.doctors : [];
  const doctors: SessionDoctor[] = doctorsRaw
    .map((row, i) => {
      const d = row as Record<string, unknown>;
      const npi = String(d.npi ?? '').replace(/\D/g, '');
      const name = String(d.name ?? '').trim();
      if (npi.length !== 10 || !name) return null;
      return {
        sessionId: String(d.sessionId ?? `doc-${i}-${npi}`),
        npi,
        name,
        specialty: d.specialty != null ? String(d.specialty) : null,
        providerType:
          d.providerType === 'Individual' ||
          d.providerType === 'Facility' ||
          d.providerType === 'Group'
            ? d.providerType
            : null,
      } satisfies SessionDoctor;
    })
    .filter(Boolean) as SessionDoctor[];

  const rxRaw = Array.isArray(b.prescriptions) ? b.prescriptions : Array.isArray(b.drugs) ? b.drugs : [];
  const prescriptions: SessionPrescription[] = rxRaw
    .map((row, i) => {
      const d = row as Record<string, unknown>;
      const rxcui = String(d.rxcui ?? d.id ?? '').replace(/\D/g, '');
      const name = String(d.name ?? '').trim();
      if (!rxcui || !name) return null;
      return {
        sessionId: String(d.sessionId ?? `rx-${i}-${rxcui}`),
        rxcui,
        name,
        strength: d.strength != null ? String(d.strength) : null,
        route: d.route != null ? String(d.route) : null,
        fullName: d.fullName != null ? String(d.fullName) : null,
      } satisfies SessionPrescription;
    })
    .filter(Boolean) as SessionPrescription[];

  const result = await matchCoverageForPlans({
    year,
    planIds,
    doctors,
    prescriptions,
  });

  const status =
    result.ok || result.errorCode === 'missing_api_key' || result.errorCode === 'partial_failure'
      ? 200
      : 502;

  return NextResponse.json(result, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    tool: 'coverage-match',
    requires: ['MARKETPLACE_API_KEY'],
    note: 'POST planIds + doctors (NPI) + prescriptions (RxCUI). Research only — CMS-reported match states.',
  });
}
