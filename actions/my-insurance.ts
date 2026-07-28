'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  getAuthenticatedUser,
  requireAuthenticatedUser,
} from '@/lib/my-insurance/auth';
import { ensureUserProfile } from '@/lib/my-insurance/ensure-profile';
import type { GuestSavedProvider, MyInsuranceDashboardData, SavedProviderRow } from '@/lib/my-insurance/types';
import { MY_INSURANCE_PATH } from '@/lib/my-insurance/constants';
import { sendSavedProviderEmail, sendWelcomeEmail } from '@/lib/my-insurance/emails';

export async function ensureUserProfileAction(): Promise<{ ok: boolean }> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  await ensureUserProfile(supabase, user);
  return { ok: true };
}

export async function saveProviderAction(input: {
  providerSlug: string;
  providerName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await createClient();
    await ensureUserProfile(supabase, user);

    const { error } = await supabase.from('saved_providers').upsert(
      {
        user_id: user.id,
        provider_slug: input.providerSlug,
        provider_name: input.providerName,
      },
      { onConflict: 'user_id,provider_slug' }
    );

    if (error) {
      console.error('[my-insurance] saveProvider', error.message);
      return { ok: false, error: 'Could not save provider' };
    }

    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(`/providers/${input.providerSlug}`);

    // Fire-and-forget confirmation email
    if (user.email) {
      void sendSavedProviderEmail({
        to: user.email,
        providerName: input.providerName,
        providerSlug: input.providerSlug,
      }).catch((err) => console.error('[my-insurance] save email', err));
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function removeProviderAction(
  providerSlug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from('saved_providers')
      .delete()
      .eq('user_id', user.id)
      .eq('provider_slug', providerSlug);

    if (error) return { ok: false, error: 'Could not remove' };
    revalidatePath(MY_INSURANCE_PATH);
    revalidatePath(`/providers/${providerSlug}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function mergeGuestProvidersAction(
  guests: GuestSavedProvider[]
): Promise<{ ok: true; merged: number } | { ok: false; error: string }> {
  try {
    const user = await requireAuthenticatedUser();
    if (!guests.length) return { ok: true, merged: 0 };
    const supabase = await createClient();
    await ensureUserProfile(supabase, user);

    let merged = 0;
    for (const g of guests) {
      const { error } = await supabase.from('saved_providers').upsert(
        {
          user_id: user.id,
          provider_slug: g.providerSlug,
          provider_name: g.providerName,
        },
        { onConflict: 'user_id,provider_slug' }
      );
      if (!error) merged += 1;
    }

    revalidatePath(MY_INSURANCE_PATH);
    return { ok: true, merged };
  } catch {
    return { ok: false, error: 'Sign in required' };
  }
}

export async function getMyInsuranceDashboardData(): Promise<MyInsuranceDashboardData | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const supabase = await createClient();
  await ensureUserProfile(supabase, user);

  const { data, error } = await supabase
    .from('saved_providers')
    .select('id,user_id,provider_slug,provider_name,notes,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[my-insurance] dashboard', error.message);
    return { savedProviders: [], email: user.email ?? null };
  }

  return {
    savedProviders: (data ?? []) as SavedProviderRow[],
    email: user.email ?? null,
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath(MY_INSURANCE_PATH);
}

export async function sendWelcomeIfNeededAction(): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user?.email) return;
  // Soft welcome — best effort
  void sendWelcomeEmail({ to: user.email }).catch(() => undefined);
}

export async function listSavedProviderSlugsAction(): Promise<string[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('saved_providers')
    .select('provider_slug')
    .eq('user_id', user.id);
  return (data ?? []).map((r) => r.provider_slug as string);
}
