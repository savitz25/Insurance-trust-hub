/**
 * Shared Places enrichment batch core (single-batch + auto-loop).
 */

import { createClient } from '@supabase/supabase-js';
import { mapRowToProvider } from '../../../lib/providers/map-db-provider';
import type { Provider } from '../../../types/provider';
import type { Provider as DbProvider, ContactInfo } from '../../../types/supabase';
import { isEligibleForSecondaryEnrichment } from '../../../lib/enrichment/eligibility';
import {
  fetchGooglePlacesSnapshot,
  isGooglePlacesConfigured,
} from '../../../lib/enrichment/google-places';
import {
  SFL_LAUNCH_COUNTY_IDS,
  applyPlacesMatchToContact,
  recordPlacesAttempt,
  providerNeedsPlacesEnrichment,
  type PlacesMatchStatus,
  type SflCountyId,
} from '../../../lib/enrichment/places-pilot';

export type PlacesBatchStats = {
  processed: number;
  matched: number;
  no_match: number;
  ambiguous: number;
  skipped: number;
  errors: number;
  written: number;
  authFailures: number;
};

export type PlacesBatchResult = {
  offset: number;
  limit: number;
  selected: number;
  poolEligible: number;
  stats: PlacesBatchStats;
  matchRate: number;
  errorRate: number;
  ambiguousRate: number;
  acceptedSample: Array<{
    name: string;
    slug: string;
    website: string | null;
    scoreNote: string;
    softWarning?: string;
  }>;
  rejectedSample: Array<{
    name: string;
    slug: string;
    status: string;
    reason: string;
  }>;
  softWarningMatched: Array<{ name: string; slug: string; website: string | null }>;
};

export function isAuthFailureReason(reason: string): boolean {
  return /401|403|INVALID_ARGUMENT|API.?key|PERMISSION_DENIED|UNAUTHENTICATED|API_KEY/i.test(
    reason
  );
}

/** Soft QA list: legal name lacks insurance-ish keywords (not auto-excluded). */
export function lacksInsuranceNameKeywords(name: string): boolean {
  return !/\b(insurance|ins\.|title|agency|broker|surety|adjust|underwrit|financial|life|health|benefits)\b/i.test(
    name
  );
}

export type SupabaseOps = ReturnType<typeof createClient>;

export async function loadSflEligibleProviders(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  countyRaw: SflCountyId,
  onlyMissing: boolean
): Promise<Provider[]> {
  const countyIds =
    countyRaw === 'all' ? [...SFL_LAUNCH_COUNTY_IDS] : [countyRaw];

  const candidates: DbProvider[] = [];
  let from = 0;
  const page = 500;
  for (;;) {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .in('contact->>launch_county_id', countyIds)
      .order('name', { ascending: true })
      .range(from, from + page - 1);

    if (error) {
      console.warn(
        'launch_county_id filter failed, using description tags:',
        error.message
      );
      break;
    }
    if (!data?.length) break;
    candidates.push(...(data as DbProvider[]));
    if (data.length < page) break;
    from += page;
  }

  if (!candidates.length) {
    const tags = [
      'Miami-Dade County',
      'Dade County',
      'Broward County',
      'Palm Beach County',
    ];
    for (const tag of tags) {
      const { data } = await supabase
        .from('providers')
        .select('*')
        .eq('verified', true)
        .contains('states_licensed', ['FL'])
        .ilike('short_description', `%${tag}%`)
        .order('name', { ascending: true })
        .limit(2000);
      if (data?.length) candidates.push(...(data as DbProvider[]));
    }
    const seen = new Set<string>();
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (seen.has(candidates[i]!.id)) candidates.splice(i, 1);
      else seen.add(candidates[i]!.id);
    }
  }

  const filtered = candidates
    .map(mapRowToProvider)
    .filter((p) => {
      const elig = isEligibleForSecondaryEnrichment(p);
      if (!elig.eligible) return false;
      if (!p.name?.trim() || !p.city?.trim()) return false;
      return providerNeedsPlacesEnrichment(p, onlyMissing);
    });

  // Prefer never-attempted Places rows first so loop quality gates are not
  // immediately tripped by re-processing prior hard no_match failures.
  const placesAttempted = (p: Provider) =>
    p.enrichment?.skipReasons?.some((r) => r.startsWith('places_')) ||
    p.enrichment?.google?.matchConfidence === 'high'
      ? 1
      : 0;

  return filtered.sort(
    (a, b) =>
      placesAttempted(a) - placesAttempted(b) ||
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
}

export async function runPlacesBatch(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  providers: Provider[];
  offset: number;
  limit: number;
  confirm: boolean;
  dryRun: boolean;
  delayMs: number;
}): Promise<PlacesBatchResult> {
  const { supabase, providers, offset, limit, confirm, dryRun, delayMs } =
    params;
  const slice = providers.slice(offset, offset + limit);
  const placesReady = isGooglePlacesConfigured();

  const stats: PlacesBatchStats = {
    processed: 0,
    matched: 0,
    no_match: 0,
    ambiguous: 0,
    skipped: 0,
    errors: 0,
    written: 0,
    authFailures: 0,
  };

  const accepted: PlacesBatchResult['acceptedSample'] = [];
  const rejected: PlacesBatchResult['rejectedSample'] = [];
  const softWarningMatched: PlacesBatchResult['softWarningMatched'] = [];

  for (const provider of slice) {
    stats.processed++;

    if (!placesReady) {
      stats.skipped++;
      rejected.push({
        name: provider.name,
        slug: provider.slug,
        status: 'skipped',
        reason: 'GOOGLE_PLACES_API_KEY not configured',
      });
      continue;
    }

    const result = await fetchGooglePlacesSnapshot(provider, {
      requestDelayMs: delayMs,
    });

    const { data: row } = await supabase
      .from('providers')
      .select('id, contact')
      .eq('id', provider.id)
      .maybeSingle();
    const contact = (row?.contact ?? {}) as ContactInfo;

    if (result.ok) {
      stats.matched++;
      const soft =
        lacksInsuranceNameKeywords(provider.name) &&
        !result.snapshot.matchNotes?.includes('insurance/finance')
          ? 'legal name lacks insurance/title/agency keywords'
          : lacksInsuranceNameKeywords(provider.name)
            ? 'legal name lacks insurance/title/agency keywords (type still insurance-like)'
            : undefined;

      accepted.push({
        name: provider.name,
        slug: provider.slug,
        website: result.snapshot.website ?? null,
        scoreNote: result.snapshot.matchNotes ?? 'high',
        softWarning: soft,
      });
      if (soft) {
        softWarningMatched.push({
          name: provider.name,
          slug: provider.slug,
          website: result.snapshot.website ?? null,
        });
      }

      if (confirm && !dryRun) {
        const nextContact = applyPlacesMatchToContact(contact, result.snapshot);
        const { error } = await supabase
          .from('providers')
          .update({
            contact: nextContact,
            updated_at: new Date().toISOString(),
          })
          .eq('id', provider.id)
          .eq('verified', true);
        if (error) {
          stats.errors++;
        } else {
          stats.written++;
        }
      }
    } else {
      const status = result.status as PlacesMatchStatus;
      if (status === 'ambiguous') stats.ambiguous++;
      else if (status === 'error') {
        stats.errors++;
        if (isAuthFailureReason(result.reason)) stats.authFailures++;
      } else if (status === 'skipped') stats.skipped++;
      else stats.no_match++;

      rejected.push({
        name: provider.name,
        slug: provider.slug,
        status,
        reason: result.reason,
      });

      if (confirm && !dryRun && status !== 'error') {
        const nextContact = recordPlacesAttempt(contact, status, result.reason);
        await supabase
          .from('providers')
          .update({
            contact: nextContact,
            updated_at: new Date().toISOString(),
          })
          .eq('id', provider.id)
          .eq('verified', true);
      }
    }
  }

  const processed = stats.processed || 1;
  return {
    offset,
    limit,
    selected: slice.length,
    poolEligible: providers.length,
    stats,
    matchRate: stats.matched / processed,
    errorRate: stats.errors / processed,
    ambiguousRate: stats.ambiguous / processed,
    acceptedSample: accepted.slice(0, 12),
    rejectedSample: rejected.slice(0, 15),
    softWarningMatched: softWarningMatched.slice(0, 20),
  };
}
