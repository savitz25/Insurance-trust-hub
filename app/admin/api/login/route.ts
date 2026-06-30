import { NextResponse } from 'next/server';
import { getAdminSecret } from '@/lib/supabase/config';
import { ADMIN_COOKIE } from '@/lib/supabase/middleware';
import { adminLoginSchema } from '@/lib/validations/admin';

export async function POST(request: Request) {
  const secret = getAdminSecret();
  if (!secret) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success || parsed.data.password !== secret) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}