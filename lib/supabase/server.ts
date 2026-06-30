import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config';

/**
 * Server-side Supabase client for Server Components, Server Actions, and Route Handlers.
 * Uses cookie-based session handling per @supabase/ssr best practices.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl() ?? 'https://placeholder.supabase.co',
    getSupabaseAnonKey() ?? 'placeholder',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can fail in Server Components (read-only cookies).
            // Middleware handles session refresh for those cases.
          }
        },
      },
    }
  );
}