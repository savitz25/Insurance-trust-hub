'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/lib/supabase/config';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser Supabase client — use only in Client Components.
 * Returns null when env vars are not configured (build / local without Supabase).
 */
export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      getSupabaseUrl()!,
      getSupabaseAnonKey()!
    );
  }
  return browserClient;
}

export { isSupabaseConfigured };