import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/lib/supabase/config';

/**
 * Cookie-free anon client for public inventory reads (hubs, directory, profiles).
 * Safe in static generation / ISR where cookie mutation is unavailable.
 */
export function createPublicClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null;
  return createClient<Database>(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
