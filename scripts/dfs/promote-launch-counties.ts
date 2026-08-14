/**
 * Phase 4–5 — promote dfs_producers in launch counties → public providers (Phase 1 gates).
 *
 *   npm run dfs:promote -- --dry-run
 *   npm run dfs:promote -- --wave 2
 *   npm run dfs:promote -- --county orange --per-county-limit 2000
 *   npm run dfs:promote -- --wave 2 --skip-existing
 *   npm run dfs:promote -- --entity business   (default Phase 5)
 *   npm run dfs:promote -- --entity all        (legacy; includes individuals)
 *
 * Loads .env / .env.local / .env.dfs.local — see docs/LOCAL-ENV.md
 *
 * Default: agencies/business only, all waves, per-county caps from
 * FL_LAUNCH_COUNTIES.promoteCap, skip producers already in dfs_provider_promotions.
 * Do NOT bulk-import individuals in Phase 5.
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  FL_LAUNCH_COUNTIES,
  countiesForWave,
  type FlLaunchCountyId,
  type FlLaunchWave,
} from '../../lib/dfs/launch-counties';
import {
  assertNotSeedPromotion,
  evaluatePromotionEligibility,
  type DfsProducerRow,
} from '../../lib/dfs/promote';
import { canShowAsVerified, resolveProviderTrustState } from '../../lib/insurance/trust/provider-trust-state';
import { mapRowToProvider } from '../../lib/providers/map-db-provider';
import type { Provider as DbProvider } from '../../types/supabase';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  return undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const confirm = hasFlag('confirm');
  /** 0 = no global cap (use per-county caps only) */
  const globalLimit = Number(arg('limit') || '0') || 0;
  const perCountyOverride = Number(arg('per-county-limit') || '0') || 0;
  const countyFilter = arg('county') as FlLaunchCountyId | undefined;
  const waveArg = arg('wave');
  const scope = (arg('scope') || 'launch-counties').toLowerCase();
  const skipExisting = !hasFlag('re-promote'); // default skip already-promoted

  if (!dryRun && !confirm) {
    console.error('Refusing to write without --dry-run or --confirm');
    process.exit(1);
  }

  const doLaunch = scope === 'launch-counties' || scope === 'all';
  const doStatewide = scope === 'directory-statewide' || scope === 'all';
  if (!doLaunch && !doStatewide) {
    console.error('--scope must be launch-counties | directory-statewide | all');
    process.exit(1);
  }
  /** Phase 5 default: business/agencies only */
  const entityArg = (arg('entity') || 'business').toLowerCase();
  const entityFilter: 'business' | 'individual' | 'all' =
    entityArg === 'all' || entityArg === 'both'
      ? 'all'
      : entityArg === 'individual' || entityArg === 'individuals'
        ? 'individual'
        : 'business';

  let counties = FL_LAUNCH_COUNTIES;
  if (waveArg) {
    const w = Number(waveArg) as FlLaunchWave;
    if (w !== 1 && w !== 2) {
      console.error('--wave must be 1 or 2');
      process.exit(1);
    }
    counties = countiesForWave(w);
  }
  if (countyFilter) {
    counties = FL_LAUNCH_COUNTIES.filter((c) => c.id === countyFilter);
  }
  if (doLaunch && !counties.length) {
    console.error('No counties selected (check --county / --wave)', {
      countyFilter,
      waveArg,
    });
    process.exit(1);
  }

  loadLocalEnv(resolve(process.cwd()));

  if (dryRun && !(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          note: 'No Supabase credentials — structural dry-run only.',
          targetCounties: counties.map((c) => ({
            id: c.id,
            displayName: c.displayName,
            wave: c.wave,
            promoteCap: perCountyOverride || c.promoteCap,
          })),
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stats = {
    scanned: 0,
    eligible: 0,
    promoted: 0,
    skipped: {} as Record<string, number>,
    byCounty: {} as Record<string, number>,
    skipExisting,
    globalLimit: globalLimit || null,
  };

  const bumpSkip = (k: string) => {
    stats.skipped[k] = (stats.skipped[k] ?? 0) + 1;
  };

  if (doLaunch) for (const county of counties) {
    if (globalLimit > 0 && stats.promoted >= globalLimit) break;

    const countyCap = perCountyOverride || county.promoteCap;
    let countyPromoted = 0;

    const countyKeys = Array.from(
      new Set(
        county.aliases.map((a) =>
          a
            .toUpperCase()
            .replace(/COUNTY$/i, '')
            .replace(/\s+/g, ' ')
            .trim()
        )
      )
    );

    const pageSize = 1000;
    let from = 0;
    const inCounty: DfsProducerRow[] = [];
    for (;;) {
      let q = supabase
        .from('dfs_producers')
        .select('*')
        .eq('state', 'FL')
        .in('county_normalized', countyKeys);
      if (entityFilter !== 'all') {
        q = q.eq('entity_type', entityFilter);
      }
      const { data: page, error } = await q.range(from, from + pageSize - 1);

      if (error) {
        console.error(county.id, error.message);
        break;
      }
      if (!page?.length) break;
      inCounty.push(...(page as DfsProducerRow[]));
      if (page.length < pageSize) break;
      from += pageSize;
    }

    // Already promoted in this county (for remaining-under-cap math)
    const { count: alreadyInCounty } = await supabase
      .from('dfs_provider_promotions')
      .select('id', { count: 'exact', head: true })
      .eq('launch_county', county.id);
    const promotedBefore = alreadyInCounty ?? 0;
    // re-promote may refresh existing rows; new inserts still limited by remaining under cap
    const remainingCap = skipExisting
      ? Math.max(0, countyCap - promotedBefore)
      : countyCap;

    console.log(
      `County ${county.displayName} (wave ${county.wave}): ${inCounty.length} ${entityFilter === 'all' ? 'producers' : entityFilter} staged; promotedBefore=${promotedBefore}; remainingCap=${remainingCap}; cap=${countyCap}`
    );

    for (const p of inCounty) {
      if (globalLimit > 0 && stats.promoted >= globalLimit) break;
      if (countyPromoted >= remainingCap) break;

      stats.scanned++;
      const row = p as DfsProducerRow;

      // Phase 5 belt-and-suspenders: never promote individuals unless --entity all
      if (entityFilter === 'business' && row.entity_type === 'individual') {
        bumpSkip('individual_excluded_phase5');
        continue;
      }
      if (entityFilter === 'individual' && row.entity_type === 'business') {
        bumpSkip('business_excluded');
        continue;
      }

      try {
        assertNotSeedPromotion(row.id);
      } catch {
        bumpSkip('seed_id');
        continue;
      }

      if (skipExisting) {
        const { data: already } = await supabase
          .from('dfs_provider_promotions')
          .select('id')
          .eq('producer_id', row.id)
          .maybeSingle();
        if (already?.id) {
          bumpSkip('already_promoted');
          continue;
        }
      }

      const evalResult = evaluatePromotionEligibility(row);
      if (!evalResult.ok) {
        bumpSkip(evalResult.reason);
        continue;
      }
      stats.eligible++;

      if (dryRun) {
        stats.promoted++;
        countyPromoted++;
        stats.byCounty[county.id] = (stats.byCounty[county.id] ?? 0) + 1;
        continue;
      }

      const insert = evalResult.providerInsert;
      insert.short_description = [
        insert.short_description,
        `(${county.displayName} County)`,
      ]
        .filter(Boolean)
        .join(' ');

      // Ensure structured geo on write
      insert.contact = {
        ...(insert.contact ?? {}),
        county: county.displayName,
        county_normalized: county.id.replace(/_/g, '-').toUpperCase(),
        launch_county_id: county.id,
      };

      const { data: existing } = await supabase
        .from('providers')
        .select('id, slug')
        .eq('slug', insert.slug)
        .maybeSingle();

      let providerId: string;
      if (existing?.id) {
        const { data: updated, error: uerr } = await supabase
          .from('providers')
          .update({
            ...insert,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id, *')
          .single();
        if (uerr || !updated) {
          bumpSkip('update_failed');
          continue;
        }
        providerId = updated.id;
        const mapped = mapRowToProvider(updated as DbProvider);
        if (!canShowAsVerified(resolveProviderTrustState(mapped))) {
          await supabase.from('providers').update({ verified: false }).eq('id', providerId);
          bumpSkip('post_write_trust_fail');
          continue;
        }
      } else {
        const { data: created, error: cerr } = await supabase
          .from('providers')
          .insert(insert)
          .select('id, *')
          .single();
        if (cerr || !created) {
          bumpSkip('insert_failed');
          if (cerr) console.error('insert', cerr.message);
          continue;
        }
        providerId = created.id;
        const mapped = mapRowToProvider(created as DbProvider);
        if (!canShowAsVerified(resolveProviderTrustState(mapped))) {
          await supabase.from('providers').update({ verified: false }).eq('id', providerId);
          bumpSkip('post_write_trust_fail');
          continue;
        }
      }

      await supabase.from('dfs_provider_promotions').upsert(
        {
          producer_id: row.id,
          provider_id: providerId,
          launch_county: county.id,
          promoted_at: new Date().toISOString(),
          trust_snapshot: {
            trustState: 'verified',
            license: row.license_number,
            county: county.displayName,
            wave: county.wave,
          },
        },
        { onConflict: 'producer_id' }
      );

      stats.promoted++;
      countyPromoted++;
      stats.byCounty[county.id] = (stats.byCounty[county.id] ?? 0) + 1;
    }

    console.log(
      `  → promoted this run for ${county.id}: ${stats.byCounty[county.id] ?? 0}`
    );
  }

  if (doStatewide && (globalLimit === 0 || stats.promoted < globalLimit)) {
    const pageSize = 500;
    let from = 0;
    for (;;) {
      if (globalLimit > 0 && stats.promoted >= globalLimit) break;
      const { data, error } = await supabase
        .from('dfs_producers')
        .select('*')
        .eq('entity_type', 'business')
        .order('license_number', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error('statewide', error.message);
        break;
      }
      if (!data?.length) break;

      for (const row of data as DfsProducerRow[]) {
        if (globalLimit > 0 && stats.promoted >= globalLimit) break;
        stats.scanned++;
        if (entityFilter === 'business' && row.entity_type === 'individual') {
          bumpSkip('individual_excluded_phase5');
          continue;
        }
        try {
          assertNotSeedPromotion(row.id);
        } catch {
          bumpSkip('seed_id');
          continue;
        }
        if (skipExisting) {
          const { data: already } = await supabase
            .from('dfs_provider_promotions')
            .select('id')
            .eq('producer_id', row.id)
            .maybeSingle();
          if (already?.id) {
            bumpSkip('already_promoted');
            continue;
          }
        }
        const evalResult = evaluatePromotionEligibility(row);
        if (!evalResult.ok) {
          bumpSkip(evalResult.reason);
          continue;
        }
        stats.eligible++;
        if (dryRun) {
          stats.promoted++;
          stats.byCounty.statewide = (stats.byCounty.statewide ?? 0) + 1;
          continue;
        }
        const insert = evalResult.providerInsert;
        const { data: existing } = await supabase
          .from('providers')
          .select('id, slug')
          .eq('slug', insert.slug)
          .maybeSingle();
        let providerId: string;
        if (existing?.id) {
          const { data: updated, error: uerr } = await supabase
            .from('providers')
            .update({ ...insert, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select('id, *')
            .single();
          if (uerr || !updated) {
            bumpSkip('update_failed');
            continue;
          }
          providerId = updated.id;
        } else {
          const { data: created, error: cerr } = await supabase
            .from('providers')
            .insert(insert)
            .select('id')
            .single();
          if (cerr || !created) {
            bumpSkip('insert_failed');
            if (cerr) console.error('insert', cerr.message);
            continue;
          }
          providerId = created.id;
        }
        await supabase.from('dfs_provider_promotions').upsert(
          {
            producer_id: row.id,
            provider_id: providerId,
            launch_county: 'statewide',
            promoted_at: new Date().toISOString(),
            promoted_by: 'phase_fl2_directory',
            trust_snapshot: {
              trustState: 'verified',
              license: row.license_number,
              residency: insert.contact.residency ?? null,
              home_address_state: insert.contact.home_address_state ?? null,
            },
          },
          { onConflict: 'producer_id' }
        );
        stats.promoted++;
        stats.byCounty.statewide = (stats.byCounty.statewide ?? 0) + 1;
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  console.log(
    JSON.stringify({ dryRun, entityFilter, scope, ...stats }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
