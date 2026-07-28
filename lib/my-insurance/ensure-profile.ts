import 'server-only';

import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  const email = user.email ?? '';
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null;

  const { error } = await supabase.from('insurance_user_profiles').upsert(
    {
      id: user.id,
      email,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[my-insurance] ensureUserProfile failed', error.message);
  }
}
