'use server';

import { leadFormSchema, type LeadFormValues } from '@/lib/validations/forms';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getProviderBySlug } from '@/lib/providers/queries';
import { notifyOperator } from '@/lib/email/resend';

export type LeadActionResult =
  | { success: true }
  | { success: false; error: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function notifyLeadToOperator(params: {
  name: string;
  email: string;
  phone?: string;
  state: string;
  insuranceType: string;
  message?: string;
  providerSlug?: string;
  stored: boolean;
}): Promise<void> {
  const text = [
    'Insurance Trust Hub — match / inquiry form',
    `Name: ${params.name}`,
    `Email: ${params.email}`,
    `Phone: ${params.phone || '—'}`,
    `State: ${params.state}`,
    `Insurance type: ${params.insuranceType}`,
    `Provider: ${params.providerSlug || '—'}`,
    `Stored in DB: ${params.stored ? 'yes' : 'no'}`,
    '',
    params.message || '(no message)',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#0A2540;line-height:1.5">
      <p><strong>Insurance Trust Hub — inquiry</strong></p>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(params.name)}</li>
        <li><strong>Email:</strong> ${escapeHtml(params.email)}</li>
        <li><strong>Phone:</strong> ${escapeHtml(params.phone || '—')}</li>
        <li><strong>State:</strong> ${escapeHtml(params.state)}</li>
        <li><strong>Type:</strong> ${escapeHtml(params.insuranceType)}</li>
        <li><strong>Provider:</strong> ${escapeHtml(params.providerSlug || '—')}</li>
        <li><strong>Stored:</strong> ${params.stored ? 'yes' : 'no'}</li>
      </ul>
      <p style="white-space:pre-wrap">${escapeHtml(params.message || '(no message)')}</p>
    </div>
  `;

  const sent = await notifyOperator({
    subject: `[ITH Inquiry] ${params.state} · ${params.insuranceType} — ${params.name}`,
    html,
    text,
    replyTo: params.email,
  });
  if (!sent.ok && !sent.skipped) {
    console.error('[submitLead] operator notify failed', sent.error);
  }
}

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

  let stored = false;

  if (!isSupabaseConfigured()) {
    console.info('[submitLead] Supabase not configured — lead logged locally', {
      name,
      email,
      state,
      insuranceType,
      providerSlug,
    });
  } else {
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
        return {
          success: false,
          error: 'Unable to submit your request. Please try again.',
        };
      }
      stored = true;
    } catch (err) {
      console.error('[submitLead]', err);
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  }

  // Always attempt operator email when Resend is configured (even if only logged locally).
  await notifyLeadToOperator({
    name,
    email,
    phone: phone || undefined,
    state: state.toUpperCase(),
    insuranceType,
    message: message || undefined,
    providerSlug: providerSlug || undefined,
    stored,
  });

  return { success: true };
}