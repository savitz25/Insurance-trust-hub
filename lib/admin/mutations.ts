import 'server-only';

import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdminSession } from '@/lib/admin/auth';
import {
  formToDbInsert,
  type AdminProviderFormData,
} from '@/lib/admin/provider-mapper';
import type { AgencyListingRequestStatus, ReviewStatus } from '@/types/supabase';
import { getLicenseDepartment } from '@/lib/tools/license-verification';
import { evaluatePromotionGates } from '@/lib/provenance/promotion';
import { resolveProviderTrustState } from '@/lib/insurance/trust/provider-trust-state';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import { slugify } from '@/lib/utils';
import { cleanLicenseNumber } from '@/lib/insurance/verification-levels';

export async function createProvider(data: AdminProviderFormData) {
  await assertAdminSession();

  if (!isSupabaseAdminConfigured()) {
    console.info('[admin] createProvider (no Supabase)', data.slug);
    return { id: `fallback-${Date.now()}`, slug: data.slug };
  }

  const supabase = createAdminClient();
  const insert = formToDbInsert(data);
  const { data: row, error } = await supabase.from('providers').insert(insert).select('id, slug').single();

  if (error) throw new Error(error.message);
  return row;
}

export async function updateProvider(id: string, data: AdminProviderFormData) {
  await assertAdminSession();

  if (!isSupabaseAdminConfigured()) {
    console.info('[admin] updateProvider (no Supabase)', id);
    return { id, slug: data.slug };
  }

  const supabase = createAdminClient();
  const insert = formToDbInsert(data);
  const { data: row, error } = await supabase
    .from('providers')
    .update(insert)
    .eq('id', id)
    .select('id, slug')
    .single();

  if (error) throw new Error(error.message);
  return row;
}

export async function deleteProvider(id: string) {
  await assertAdminSession();

  if (!isSupabaseAdminConfigured()) {
    console.info('[admin] deleteProvider (no Supabase)', id);
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('providers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function moderateReview(id: string, status: ReviewStatus) {
  await assertAdminSession();

  if (!isSupabaseAdminConfigured()) {
    console.info('[admin] moderateReview (no Supabase)', id, status);
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('reviews').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateListingRequestStatus(params: {
  id: string;
  status: AgencyListingRequestStatus;
  opsNotes?: string;
  rejectionReason?: string;
}): Promise<void> {
  await assertAdminSession();
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase admin is not configured');
  }
  if (params.status === 'approved') {
    throw new Error('Use approveListingRequest — approval requires a confirmed license');
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('agency_listing_requests')
    .update({
      status: params.status,
      ops_notes: params.opsNotes || undefined,
      rejection_reason: params.rejectionReason || null,
    })
    .eq('id', params.id);
  if (error) throw new Error(error.message);
}

export async function approveListingRequest(params: {
  id: string;
  verifiedLicenseNumber: string;
  verifiedLicenseState: string;
  identityMatchAccepted: boolean;
  opsNotes?: string;
}): Promise<{ providerId: string; slug: string }> {
  await assertAdminSession();
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase admin is not configured');
  }
  if (!params.identityMatchAccepted) {
    throw new Error('Identity match must be accepted against the official record');
  }

  const licenseNumber = cleanLicenseNumber(params.verifiedLicenseNumber);
  const licenseState = params.verifiedLicenseState.trim().toUpperCase();
  if (!licenseNumber || licenseState.length !== 2) {
    throw new Error('Confirmed license number and 2-letter state are required');
  }

  const supabase = createAdminClient();
  const { data: request, error: loadErr } = await supabase
    .from('agency_listing_requests')
    .select('*')
    .eq('id', params.id)
    .single();
  if (loadErr || !request) throw new Error(loadErr?.message || 'Request not found');
  if (request.status === 'approved' && request.provider_id) {
    throw new Error('This request is already approved');
  }

  const dept = getLicenseDepartment(licenseState);
  const source = dept?.department || `${licenseState} Department of Insurance`;
  const sourceUrl = dept?.lookupUrl || 'https://content.naic.org/consumer.htm';
  const checkedAt = new Date().toISOString();
  const slugBase = slugify(request.legal_name) || 'agency';
  const slug = `${slugBase}-${licenseNumber}`.slice(0, 80);

  const insert = formToDbInsert({
    slug,
    name: request.legal_name,
    providerType: 'brokerage',
    city: request.city || '',
    state: licenseState,
    zip: request.zip || '',
    phone: request.phone || '',
    website: request.website || '',
    licenseNumber,
    licenseSource: source,
    licenseSourceUrl: sourceUrl,
    licenseCheckedAt: checkedAt,
    licenseMethod: 'manual',
    licenseNotes: [
      'manual_claim',
      `regulator=${source}`,
      params.opsNotes || request.ops_notes || '',
    ]
      .filter(Boolean)
      .join(' · '),
    identityMatchAccepted: true,
    insuranceTypes: request.lines_of_authority?.length
      ? request.lines_of_authority
      : ['health'],
    specialties: ['Independent Agency'],
    yearsInBusiness: null,
    relocationExperience: false,
    verified: true,
    shortDescription: `${request.legal_name} — ${licenseState} licensed agency (manual verified claim).`,
    description:
      'Listed after an authorized claim and official state license confirmation. Not an endorsement. Re-check the regulator before you enroll.',
  });

  if (request.street && insert.contact) {
    insert.contact = {
      ...insert.contact,
      email: request.work_email,
      address: {
        street: request.street,
        city: request.city || '',
        state: request.address_state || licenseState,
        zip: request.zip || '',
      },
    };
  }

  const gate = evaluatePromotionGates({
    id: 'pending-uuid',
    licenseNumber,
    licenseState,
    source,
    sourceUrl,
    checkedAt,
    isVerified: true,
    identityMatchAccepted: true,
    phone: request.phone,
  });
  if (!gate.ok || !gate.canShowHardVerifiedBadge) {
    throw new Error(`Fail closed: ${gate.missing.join(', ') || gate.reasons.join(', ')}`);
  }

  const { data: row, error: insErr } = await supabase
    .from('providers')
    .insert(insert)
    .select('*')
    .single();
  if (insErr || !row) throw new Error(insErr?.message || 'Unable to create provider');

  const mapped = mapRowToProvider(row);
  const trust = resolveProviderTrustState(mapped);
  if (trust !== 'verified') {
    await supabase.from('providers').delete().eq('id', row.id);
    throw new Error(`Fail closed: created row resolved as ${trust}, not verified`);
  }

  const { error: updErr } = await supabase
    .from('agency_listing_requests')
    .update({
      status: 'approved',
      verified_license_number: licenseNumber,
      verified_license_state: licenseState,
      verified_at: checkedAt,
      provider_id: row.id,
      ops_notes: params.opsNotes || request.ops_notes,
    })
    .eq('id', params.id);
  if (updErr) throw new Error(updErr.message);

  return { providerId: row.id, slug: row.slug };
}