/**
 * Phase 6B1 — license backfill write helpers (ops).
 * Never invent licenses. Validates promotion gates before write.
 */

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { assertAdminSession } from '@/lib/admin/auth';
import { getLicenseDepartment } from '@/lib/tools/license-verification';
import {
  evaluatePromotionGates,
  isSeedProviderId,
  validateBackfillPayload,
  type LicenseBackfillPayload,
} from '@/lib/provenance/promotion';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import type {
  LicenseEntry,
  LicenseInfo,
  Provider as DbProvider,
} from '@/types/supabase';
import type { PublicListingClass } from '@/lib/provenance/types';

export type BackfillCandidate = {
  id: string;
  slug: string;
  name: string;
  state: string;
  city: string;
  listingClass: PublicListingClass;
  licenseNumber: string | null;
  source: string | null;
  checkedAt: string | null;
  website: string | null;
  phone: string | null;
  priority: number;
  reason: string;
};

export async function listBackfillCandidates(limit = 100): Promise<BackfillCandidate[]> {
  await assertAdminSession();

  if (!isSupabaseAdminConfigured()) {
    // Offline / demo queue: no real Supabase rows
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .order('updated_at', { ascending: true })
    .limit(Math.min(limit, 500));

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to load providers');
  }

  const candidates: BackfillCandidate[] = [];
  for (const row of data as DbProvider[]) {
    if (isSeedProviderId(row.id)) continue;
    const provider = mapRowToProvider(row);
    const gate = evaluatePromotionGates({
      id: provider.id,
      licenseNumber: provider.license_number,
      licenseState: provider.license_state ?? provider.state,
      source: provider.license_source,
      sourceUrl: provider.license_source_url,
      checkedAt: provider.license_checked_at,
      isVerified: provider.is_verified,
      identityMatchAccepted: provider.license_identity_match_accepted,
      phone: provider.phone,
    });

    if (gate.listingClass === 'indexable_research') continue;

    let priority = 50;
    if (provider.website) priority -= 10;
    if (provider.phone) priority -= 5;
    if (['FL', 'TX', 'CA', 'NY'].includes(provider.state?.toUpperCase() ?? '')) priority -= 8;
    if (gate.listingClass === 'pending_verification') priority -= 5;

    candidates.push({
      id: provider.id,
      slug: provider.slug,
      name: provider.name,
      state: provider.state,
      city: provider.city,
      listingClass: gate.listingClass,
      licenseNumber: provider.license_number ?? null,
      source: provider.license_source ?? null,
      checkedAt: provider.license_checked_at ?? null,
      website: provider.website ?? null,
      phone: provider.phone ?? null,
      priority,
      reason: gate.reasons.join('; ') || 'Needs license provenance',
    });
  }

  return candidates.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export type ApplyBackfillResult =
  | { ok: true; listingClass: PublicListingClass; verified: boolean }
  | { ok: false; errors: string[] };

/**
 * Apply license backfill to a real providers row.
 * promote_indexable only when all gates pass; never invents license numbers.
 */
export async function applyLicenseBackfill(
  providerId: string,
  payload: LicenseBackfillPayload
): Promise<ApplyBackfillResult> {
  await assertAdminSession();

  const validation = validateBackfillPayload(payload, providerId);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      errors: ['Supabase admin not configured — cannot write production rows'],
    };
  }

  const supabase = createAdminClient();
  const { data: existing, error: loadErr } = await supabase
    .from('providers')
    .select('*')
    .eq('id', providerId)
    .maybeSingle();

  if (loadErr || !existing) {
    return { ok: false, errors: [loadErr?.message ?? 'Provider not found'] };
  }

  const row = existing as DbProvider;
  if (isSeedProviderId(row.id)) {
    return { ok: false, errors: ['Cannot backfill seed/generated entity ids'] };
  }

  const state = payload.licenseState.toUpperCase();
  const dept = getLicenseDepartment(state);
  const sourceUrl =
    payload.sourceUrl?.trim() || dept?.lookupUrl || 'https://content.naic.org/consumer.htm';

  const promote =
    payload.intent === 'promote_indexable' &&
    payload.identityMatchAccepted &&
    Boolean(payload.source?.trim()) &&
    Boolean(payload.checkedAt);

  const gate = evaluatePromotionGates({
    id: row.id,
    licenseNumber: payload.licenseNumber,
    licenseState: state,
    source: payload.source,
    sourceUrl,
    checkedAt: payload.checkedAt,
    isVerified: promote,
    identityMatchAccepted: payload.identityMatchAccepted,
  });

  if (payload.intent === 'promote_indexable' && !gate.ok) {
    return {
      ok: false,
      errors: [
        'Promotion gates failed — save as pending instead or complete missing fields',
        ...gate.reasons,
      ],
    };
  }

  if (payload.intent === 'keep_suppressed') {
    // Clear verified flag; leave existing license if any but mark suppressed
    const prev = (row.license_info ?? { licenses: [] }) as LicenseInfo;
    const license_info: LicenseInfo = {
      licenses: prev.licenses,
      audit: [
        ...(prev.audit ?? []),
        {
          at: new Date().toISOString(),
          method: payload.method,
          action: 'keep_suppressed',
          notes: payload.notes,
        },
      ],
    };
    const { error } = await supabase
      .from('providers')
      .update({ verified: false, license_info, updated_at: new Date().toISOString() })
      .eq('id', providerId);
    if (error) return { ok: false, errors: [error.message] };
    return { ok: true, listingClass: 'seed', verified: false };
  }

  const entry: LicenseEntry = {
    state,
    license_number: payload.licenseNumber.trim(),
    type: 'agent',
    verification_url: sourceUrl,
    source: payload.source.trim(),
    checkedAt: payload.checkedAt,
    method: payload.method,
    notes: payload.notes,
    status: promote ? 'verified' : 'pending',
    identityMatchAccepted: payload.identityMatchAccepted,
  };

  const prevInfo = (row.license_info ?? { licenses: [] }) as LicenseInfo;
  const license_info: LicenseInfo = {
    licenses: [entry],
    audit: [
      ...(prevInfo.audit ?? []),
      {
        at: new Date().toISOString(),
        method: payload.method,
        action: payload.intent,
        notes: payload.notes,
        license_number: entry.license_number,
      },
    ],
  };

  const states = Array.from(
    new Set([...(row.states_licensed ?? []), state].filter(Boolean))
  );

  const { error: writeErr } = await supabase
    .from('providers')
    .update({
      license_info,
      verified: promote,
      states_licensed: states,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId);

  if (writeErr) return { ok: false, errors: [writeErr.message] };

  return {
    ok: true,
    listingClass: promote ? 'indexable_research' : 'pending_verification',
    verified: promote,
  };
}
