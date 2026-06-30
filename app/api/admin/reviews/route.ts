import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminSession } from '@/lib/admin/auth';
import { moderateReview } from '@/lib/admin/mutations';
import { getAdminReviews } from '@/lib/admin/queries';

const moderateSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  status: z.enum(['approved', 'rejected', 'pending']),
});

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
  const reviews = await getAdminReviews(status ?? undefined);
  return NextResponse.json({ reviews });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = moderateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await moderateReview(parsed.data.id, parsed.data.status);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Moderation failed' },
      { status: 500 }
    );
  }
}