/**
 * Phase 6C — Google Places enrichment pilot (South Florida only).
 *
 *   npm run dfs:enrich-places-sfl -- --dry-run --limit 25
 *   npm run dfs:enrich-places-sfl -- --limit 50 --confirm
 *   npm run dfs:enrich-places-sfl -- --county broward --limit 100 --confirm
 *
 * Requires GOOGLE_PLACES_API_KEY + SUPABASE_SERVICE_ROLE_KEY.
 * Fail-closed: only high-confidence matches write website/rating snapshots.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { mapRowToProvider } from '../../lib/providers/map-db-provider';
import type { Provider as DbProvider, ContactInfo } from '../../types/supabase';
import { isEligibleForSecondaryEnrichment } from '../../lib/enrichment/eligibility';
import {
  fetchGooglePlacesSnapshot,
  isGooglePlacesConfigured,
} from '../../lib/enrichment/google-places';
import {
  SFL_LAUNCH_COUNTY_IDS,
  applyPlacesMatchToContact,
  recordPlacesAttempt,
  providerNeedsPlacesEnrichment,
  type PlacesMatchStatus,
  type SflCountyId,
} from '../../lib/enrichment/places-pilot';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) {
    const v = process.argv[i + 1];
    if (v && !v.startsWith('--')) return v;
    return 'true';
  }
  // support --limit=500
  const pref = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (pref) return pref.split('=').slice(1).join('=');
  return undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dryRun = hasFlag('dry-run') || !hasFlag('confirm');
  const confirm = hasFlag('confirm');
  const limit = Math.min(Number(arg('limit') || '25') || 25, 1000);
  const offset = Math.max(Number(arg('offset') || '0') || 0, 0);
  const countyRaw = (arg('county') || 'all').toLowerCase() as SflCountyId;
  const onlyMissing = arg('only-missing') !== 'false' && !hasFlag('include-enriched');
  const delayMs = Math.max(Number(arg('delay-ms') || '250') || 250, 0);

  if (!['all', 'miami_dade', 'broward', 'palm_beach'].includes(countyRaw)) {
    console.error('--county must be miami_dade | broward | palm_beach | all');
    process.exit(1);
  }

  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const placesReady = isGooglePlacesConfigured();
  if (!placesReady && !dryRun && confirm) {
    console.error('GOOGLE_PLACES_API_KEY required for live --confirm runs');
    process.exit(1);
  }

  const countyIds =
    countyRaw === 'all' ? [...SFL_LAUNCH_COUNTY_IDS] : [countyRaw];

  // Load verified FL providers with SFL launch_county_id
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
      // fallback: short_description county tags if launch_county_id sparse
      console.warn('launch_county_id filter failed, using description tags:', error.message);
      break;
    }
    if (!data?.length) break;
    candidates.push(...(data as DbProvider[]));
    if (data.length < page) break;
    from += page;
    if (candidates.length >= offset + limit * 3) break;
  }

  if (!candidates.length) {
    // Fallback text tags for SFL
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
        .limit(800);
      if (data?.length) candidates.push(...(data as DbProvider[]));
    }
    // de-dupe by id
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
    })
    .slice(offset, offset + limit);

  console.log(
    JSON.stringify(
      {
        dryRun: dryRun || !confirm,
        confirm,
        placesConfigured: placesReady,
        county: countyRaw,
        onlyMissing,
        limit,
        offset,
        poolSize: candidates.length,
        selected: filtered.length,
      },
      null,
      2
    )
  );

  const stats = {
    processed: 0,
    matched: 0,
    no_match: 0,
    ambiguous: 0,
    skipped: 0,
    errors: 0,
    written: 0,
  };
  const accepted: Array<{ name: string; slug: string; website: string | null; scoreNote: string }> =
    [];
  const rejected: Array<{ name: string; slug: string; status: string; reason: string }> =
    [];

  for (const provider of filtered) {
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

    // Load fresh contact for write
    const { data: row } = await supabase
      .from('providers')
      .select('id, contact')
      .eq('id', provider.id)
      .maybeSingle();
    const contact = (row?.contact ?? {}) as ContactInfo;

    if (result.ok) {
      stats.matched++;
      accepted.push({
        name: provider.name,
        slug: provider.slug,
        website: result.snapshot.website ?? null,
        scoreNote: result.snapshot.matchNotes ?? 'high',
      });

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
          console.error('write failed', provider.slug, error.message);
        } else {
          stats.written++;
        }
      }
    } else {
      const status = result.status as PlacesMatchStatus;
      if (status === 'ambiguous') stats.ambiguous++;
      else if (status === 'error') stats.errors++;
      else if (status === 'skipped') stats.skipped++;
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

    if (stats.processed % 25 === 0) {
      console.log(`  processed ${stats.processed}/${filtered.length} matched=${stats.matched}`);
    }

    // Extra spacing beyond per-request delay
    if (delayMs < 150) await sleep(150 - delayMs);
  }

  const outDir = resolve(process.cwd(), 'scripts/output');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(outDir, `places-sfl-pilot-${stamp}.json`);
  const report = {
    at: new Date().toISOString(),
    dryRun: dryRun || !confirm,
    confirm,
    placesConfigured: placesReady,
    county: countyRaw,
    onlyMissing,
    limit,
    offset,
    stats,
    acceptedSample: accepted.slice(0, 15),
    rejectedSample: rejected.slice(0, 20),
  };
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({ ...report, logFile: outPath }, null, 2));

  if (!confirm) {
    console.log(
      '\nNo writes (default dry-run). Pass --confirm for live writes when GOOGLE_PLACES_API_KEY is set.'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
