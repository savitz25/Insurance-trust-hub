import { NextResponse } from 'next/server';
import {
  claimValidationError,
  validateInsuranceClaim,
} from '@/lib/customer-claim-validation/v1';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

function statusFor(state: string): number {
  if (state === 'INVALID_QUERY') return 400;
  if (
    state === 'PUBLICATION_RESTRICTED' ||
    state === 'ENTITY_CLASS_RESTRICTED' ||
    state === 'PUBLICATION_HOLD'
  ) {
    return 422;
  }
  if (state === 'BACKEND_UNAVAILABLE') return 503;
  return 200;
}

export async function POST(request: Request) {
  try {
    const payload = validateInsuranceClaim(await request.json());
    return NextResponse.json(payload, {
      status: statusFor(payload.resultState),
      headers: HEADERS,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      const payload = claimValidationError(
        'INVALID_QUERY',
        'invalid_json',
        'Request body must be valid JSON.',
      );
      return NextResponse.json(payload, { status: 400, headers: HEADERS });
    }
    const payload = claimValidationError(
      'BACKEND_UNAVAILABLE',
      'validation_backend_unavailable',
      'Insurance profile validation is temporarily unavailable.',
    );
    return NextResponse.json(payload, { status: 503, headers: HEADERS });
  }
}
