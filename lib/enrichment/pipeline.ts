/**
 * Phase 6B2 pipeline:
 * indexable_research → match → Google snapshot → BBB snapshot → write → public secondary
 */

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { assertAdminSession } from '@/lib/admin/auth';
import { mapRowToProvider } from '@/lib/providers/map-db-provider';
import { isEligibleForSecondaryEnrichment } from '@/lib/enrichment/eligibility';
import {
  fetchGooglePlacesSnapshot,
  isGooglePlacesConfigured,
} from '@/lib/enrichment/google-places';
import {
  buildBbbSnapshotFromManual,
  type BbbManualInput,
} from '@/lib/enrichment/bbb';
import type { ProviderEnrichment, PublicSecondarySignals } from '@/lib/enrichment/types';
import { SECONDARY_SIGNALS_DISCLAIMER as DISCLAIMER } from '@/lib/enrichment/types';
import type { Provider } from '@/types/provider';
import type { Provider as DbProvider, ContactInfo } from '@/types/supabase';
import { isPlaceholderPhone } from '@/lib/provenance/phone';

export type EnrichmentRunResult = {
  providerId: string;
  slug: string;
  eligible: boolean;
  google: 'ok' | 'skipped' | 'failed';
  bbb: 'ok' | 'skipped' | 'failed';
  reasons: string[];
};

function readEnrichment(contact: ContactInfo | null | undefined): ProviderEnrichment {
  const raw = (contact as ContactInfo & { enrichment?: ProviderEnrichment })?.enrichment;
  return raw && typeof raw === 'object' ? { ...raw } : {};
}

export function getProviderEnrichment(provider: Provider): ProviderEnrichment {
  return provider.enrichment ?? {};
}

export function toPublicSecondarySignals(
  provider: Provider
): PublicSecondarySignals | null {
  const elig = isEligibleForSecondaryEnrichment(provider);
  if (!elig.eligible) return null;

  const enr = getProviderEnrichment(provider);
  const g = enr.google;
  const b = enr.bbb;

  const google =
    g && g.matchConfidence === 'high'
      ? {
          rating: g.rating ?? null,
          reviewCount: g.reviewCount ?? null,
          mapsUrl: g.mapsUrl ?? null,
          checkedAtLabel: formatDate(g.checkedAt),
          businessStatus: g.businessStatus ?? null,
        }
      : null;

  const bbb =
    b && (b.matchConfidence === 'high' || b.matchConfidence === 'medium')
      ? {
          rating: b.rating ?? null,
          accredited: b.accredited ?? null,
          profileUrl: b.profileUrl ?? null,
          checkedAtLabel: formatDate(b.checkedAt),
        }
      : null;

  if (!google && !bbb) return null;

  // Sanitize phone leakage: never expose placeholder via enrichment path
  if (google && g?.formattedPhone && isPlaceholderPhone(g.formattedPhone)) {
    // phone not in public secondary object — ok
  }

  return {
    google,
    bbb,
    disclaimer: DISCLAIMER,
  };
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export async function listEnrichmentEligible(limit = 50): Promise<Provider[]> {
  await assertAdminSession();
  if (!isSupabaseAdminConfigured()) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('verified', true)
    .order('updated_at', { ascending: false })
    .limit(Math.min(limit, 200));

  if (error || !data) return [];

  return (data as DbProvider[])
    .map(mapRowToProvider)
    .filter((p) => isEligibleForSecondaryEnrichment(p).eligible);
}

async function writeEnrichment(
  providerId: string,
  enrichment: ProviderEnrichment
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const { data: row, error: loadErr } = await supabase
    .from('providers')
    .select('contact')
    .eq('id', providerId)
    .maybeSingle();

  if (loadErr || !row) {
    return { ok: false, error: loadErr?.message ?? 'Provider not found' };
  }

  const contact = { ...((row as { contact?: ContactInfo }).contact ?? {}) } as ContactInfo & {
    enrichment?: ProviderEnrichment;
  };
  contact.enrichment = enrichment;

  const { error } = await supabase
    .from('providers')
    .update({
      contact,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Run Google Places (if configured) + optional BBB manual input for one profile.
 */
export async function runSecondaryEnrichment(params: {
  providerId: string;
  runGoogle?: boolean;
  bbb?: BbbManualInput | null;
  operatorNotes?: string;
}): Promise<EnrichmentRunResult> {
  await assertAdminSession();

  const reasons: string[] = [];
  if (!isSupabaseAdminConfigured()) {
    return {
      providerId: params.providerId,
      slug: '',
      eligible: false,
      google: 'skipped',
      bbb: 'skipped',
      reasons: ['Supabase admin not configured'],
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', params.providerId)
    .maybeSingle();

  if (error || !data) {
    return {
      providerId: params.providerId,
      slug: '',
      eligible: false,
      google: 'skipped',
      bbb: 'skipped',
      reasons: [error?.message ?? 'Provider not found'],
    };
  }

  const row = data as DbProvider;
  const provider = mapRowToProvider(row);
  // Attach existing enrichment for merge
  const existing = readEnrichment(row.contact);
  provider.enrichment = existing;

  const elig = isEligibleForSecondaryEnrichment(provider);
  if (!elig.eligible) {
    return {
      providerId: provider.id,
      slug: provider.slug,
      eligible: false,
      google: 'skipped',
      bbb: 'skipped',
      reasons: elig.reasons,
    };
  }

  const next: ProviderEnrichment = {
    ...existing,
    lastRunAt: new Date().toISOString(),
    operatorNotes: params.operatorNotes ?? existing.operatorNotes,
    skipReasons: [],
  };

  let googleStatus: EnrichmentRunResult['google'] = 'skipped';
  let bbbStatus: EnrichmentRunResult['bbb'] = 'skipped';

  if (params.runGoogle !== false) {
    if (!isGooglePlacesConfigured()) {
      reasons.push('Google Places skipped — GOOGLE_PLACES_API_KEY not set');
      next.skipReasons = [...(next.skipReasons ?? []), 'google_no_api_key'];
    } else {
      const g = await fetchGooglePlacesSnapshot(provider);
      if (g.ok) {
        next.google = g.snapshot;
        googleStatus = 'ok';
        reasons.push('Google Places snapshot stored');
      } else {
        googleStatus = 'failed';
        reasons.push(`Google: ${g.reason}`);
        next.skipReasons = [...(next.skipReasons ?? []), g.reason];
      }
    }
  }

  if (params.bbb) {
    const b = buildBbbSnapshotFromManual(provider, params.bbb);
    if (b.ok) {
      next.bbb = b.snapshot;
      bbbStatus = 'ok';
      reasons.push('BBB snapshot stored');
    } else {
      bbbStatus = 'failed';
      reasons.push(`BBB: ${b.reason}`);
      next.skipReasons = [...(next.skipReasons ?? []), b.reason];
    }
  }

  const written = await writeEnrichment(provider.id, next);
  if (!written.ok) {
    reasons.push(written.error);
  }

  return {
    providerId: provider.id,
    slug: provider.slug,
    eligible: true,
    google: googleStatus,
    bbb: bbbStatus,
    reasons,
  };
}

// re-export for consumers that import DISCLAIMER name wrong
export { DISCLAIMER as SECONDARY_SIGNALS_DISCLAIMER_TEXT };
