/**
 * Shared Supabase environment configuration.
 * Never import service-role keys in client components.
 */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

/** True when public (anon) credentials are present — safe for browser + RSC reads. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/** True when privileged server key is present — admin dashboards, seeds, migrations. */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET?.trim();
}