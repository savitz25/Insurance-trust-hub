import 'server-only';

import { cookies } from 'next/headers';
import { getAdminSecret } from '@/lib/supabase/config';
import { ADMIN_COOKIE } from '@/lib/supabase/middleware';

export async function isAdminSession(): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === secret;
}

export async function assertAdminSession(): Promise<void> {
  if (!(await isAdminSession())) {
    throw new Error('Unauthorized');
  }
}