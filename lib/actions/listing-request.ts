'use server';

import {
  listingRequestSchema,
  type ListingRequestValues,
} from '@/lib/validations/forms';
import { notifyOperator } from '@/lib/email/resend';
import { PUBLIC_CONTACT_EMAIL } from '@/lib/email/routing';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';

export type ListingRequestResult =
  | { success: true }
  | { success: false; error: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeWebsite(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

/**
 * Public claim form. Stores a request only — never creates a verified listing.
 */
export async function submitListingRequest(
  input: ListingRequestValues
): Promise<ListingRequestResult> {
  const parsed = listingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid form data',
    };
  }

  if (parsed.data.website) {
    return { success: true };
  }

  const d = parsed.data;
  const licenseState = d.licenseState.toUpperCase();
  const addressState = d.addressState.toUpperCase();
  const website = normalizeWebsite(d.agencyWebsite || '');

  let stored = false;

  if (isSupabaseAdminConfigured()) {
    try {
      const supabase = createAdminClient();
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('agency_listing_requests')
        .select('id', { count: 'exact', head: true })
        .eq('work_email', d.workEmail.toLowerCase())
        .gte('created_at', since);

      if ((count ?? 0) >= 3) {
        return {
          success: false,
          error: `Too many recent requests from this email. Email ${PUBLIC_CONTACT_EMAIL} if you need help.`,
        };
      }

      const { error } = await supabase.from('agency_listing_requests').insert({
        status: 'received',
        legal_name: d.legalName.trim(),
        dba_name: d.dbaName?.trim() || null,
        license_state: licenseState,
        license_number: d.licenseNumber.trim(),
        npn: d.npn?.trim() || null,
        street: d.street.trim(),
        city: d.city.trim(),
        address_state: addressState,
        zip: d.zip.trim(),
        phone: d.phone.trim(),
        work_email: d.workEmail.trim().toLowerCase(),
        website,
        lines_of_authority: d.linesOfAuthority ?? [],
        authorized: true,
        notes: d.notes?.trim() || null,
        source: 'claim_form',
        submitter_name: d.submitterName.trim(),
      });

      if (error) {
        console.error('[submitListingRequest] insert failed', error.message);
      } else {
        stored = true;
      }
    } catch (err) {
      console.error('[submitListingRequest] storage error', err);
    }
  }

  const text = [
    'Insurance Trust Hub — agency listing request',
    `Stored: ${stored ? 'yes' : 'no'}`,
    `Submitter: ${d.submitterName}`,
    `Legal name: ${d.legalName}`,
    `DBA: ${d.dbaName || '—'}`,
    `License state: ${licenseState}`,
    `License number: ${d.licenseNumber}`,
    `NPN: ${d.npn || '—'}`,
    `Address: ${d.street}, ${d.city}, ${addressState} ${d.zip}`,
    `Phone: ${d.phone}`,
    `Email: ${d.workEmail}`,
    `Website: ${website || '—'}`,
    `Lines: ${(d.linesOfAuthority ?? []).join(', ') || '—'}`,
    '',
    d.notes || '(no notes)',
    '',
    'Do not publish from this email. Verify the license on the official state source first.',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#0A2540;line-height:1.5">
      <p><strong>Insurance Trust Hub — agency listing request</strong></p>
      <p>This is a claim, not a listing. Verify the license on the official state source before any public profile.</p>
      <ul>
        <li><strong>Stored:</strong> ${stored ? 'yes' : 'no'}</li>
        <li><strong>Submitter:</strong> ${escapeHtml(d.submitterName)}</li>
        <li><strong>Legal name:</strong> ${escapeHtml(d.legalName)}</li>
        <li><strong>DBA:</strong> ${escapeHtml(d.dbaName || '—')}</li>
        <li><strong>License:</strong> ${escapeHtml(licenseState)} ${escapeHtml(d.licenseNumber)}</li>
        <li><strong>NPN:</strong> ${escapeHtml(d.npn || '—')}</li>
        <li><strong>Address:</strong> ${escapeHtml(`${d.street}, ${d.city}, ${addressState} ${d.zip}`)}</li>
        <li><strong>Phone:</strong> ${escapeHtml(d.phone)}</li>
        <li><strong>Email:</strong> ${escapeHtml(d.workEmail)}</li>
        <li><strong>Website:</strong> ${escapeHtml(website || '—')}</li>
      </ul>
      <p style="white-space:pre-wrap">${escapeHtml(d.notes || '(no notes)')}</p>
    </div>
  `;

  const sent = await notifyOperator({
    subject: `[ITH Listing request] ${licenseState} — ${d.legalName}`,
    html,
    text,
    replyTo: d.workEmail,
  });

  if (!sent.ok && !stored) {
    if (sent.skipped) {
      return {
        success: false,
        error: `We could not store your request right now. Email ${PUBLIC_CONTACT_EMAIL} with your license number.`,
      };
    }
    return {
      success: false,
      error: `Unable to send your request right now. Please email ${PUBLIC_CONTACT_EMAIL}.`,
    };
  }

  if (stored && sent.ok === false && !sent.skipped) {
    console.error('[submitListingRequest] operator notify failed', sent.error);
  }

  return { success: true };
}
