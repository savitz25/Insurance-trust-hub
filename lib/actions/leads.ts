'use server';

import { leadFormSchema, type LeadFormValues } from '@/lib/validations/forms';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getProviderBySlug } from '@/lib/providers/queries';

export type LeadActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitLead(
  input: LeadFormValues
): Promise<LeadActionResult> {
  const parsed = leadFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid form data',
    };
  }

  if (parsed.data.website) {
    return { success: true };
  }

  const { name, email, phone, state, insuranceType, message, providerSlug } =
    parsed.data;

  let providerId: string | null = null;
  if (providerSlug) {
    const provider = await getProviderBySlug(providerSlug);
    providerId = provider?.id ?? null;
  }

  if (!isSupabaseConfigured()) {
    console.info('[submitLead] Supabase not configured — lead logged locally', {
      name,
      email,
      state,
      insuranceType,
      providerSlug,
    });
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('leads').insert({
      name,
      email,
      phone: phone || null,
      destination: state.toUpperCase(),
      insurance_types: [insuranceType],
      message: message || null,
      provider_id: providerId,
      source: providerSlug ? 'provider-profile' : 'website',
    });

    if (error) {
      console.error('[submitLead]', error.message);
      return { success: false, error: 'Unable to submit your request. Please try again.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[submitLead]', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}