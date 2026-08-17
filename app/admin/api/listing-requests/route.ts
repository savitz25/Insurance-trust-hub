import { NextResponse } from 'next/server';
import { loadListingRequestsForAdmin } from '@/lib/admin/listing-requests';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await loadListingRequestsForAdmin();
    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          rows: [],
          openByEmail: {},
          diagnostic: result.diagnostic,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({
      rows: result.rows,
      openByEmail: result.openByEmail,
      diagnostic: result.diagnostic,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load requests';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { error: message, rows: [], openByEmail: {}, diagnostic: null },
      { status }
    );
  }
}
