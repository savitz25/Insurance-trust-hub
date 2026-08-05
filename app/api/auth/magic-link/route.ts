import { NextResponse } from 'next/server';
import { requestMagicLink } from '@/lib/my-insurance/request-magic-link';

export async function POST(request: Request) {
  let body: { email?: string; next?: string };
  try {
    body = (await request.json()) as { email?: string; next?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const result = await requestMagicLink(body.email ?? '', body.next, request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    ok: true,
    delivery: result.delivery,
    emailRedirectTo: result.emailRedirectTo,
  });
}
