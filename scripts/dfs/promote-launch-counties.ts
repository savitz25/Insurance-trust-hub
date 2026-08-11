/**
 * Phase 4 — promote dfs_producers in launch counties → public providers (Phase 1 gates).
 *
 *   npm run dfs:promote -- --dry-run
 *   npm run dfs:promote -- --limit 50
 *   npm run dfs:promote -- --county duval
 *
 * Loads .env / .env.local / .env.dfs.local — see docs/LOCAL-ENV.md
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  FL_LAUNCH_COUNTIES,
  type FlLaunchCountyId,
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
  const limit = Number(arg('limit') || '0') || 500;
  const countyFilter = arg('county') as FlLaunchCountyId | undefined;

  const counties = countyFilter
    ? FL_LAUNCH_COUNTIES.filter((c) => c.id === countyFilter)
    : FL_LAUNCH_COUNTIES;
  if (!counties.length) {
    console.error('Unknown --county', countyFilter);
    process.exit(1);
  }

  loadLocalEnv(resolve(process.cwd()));

  if (dryRun && !(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          note: 'No Supabase credentials in env/.env.local — structural dry-run only. Copy .env.example → .env.local for live promote.',
          targetCounties: counties.map((c) => c.displayName),
          promotionGates: [
            'active FL license',
            're-checkable license number',
            'Florida DFS regulator provenance',
            'identityMatchAccepted',
            'Phase 1 resolveProviderTrustState === verified',
            'never seed ids',
          ],
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stats = {
    scanned: 0,
    eligible: 0,
    promoted: 0,
    skipped: {} as Record<string, number>,
    byCounty: {} as Record<string, number>,
  };

  for (const county of counties) {
    const aliases = county.aliases;
    // Pull producers whose county_normalized matches any alias token
    const { data: producers, error } = await supabase
      .from('dfs_producers')
      .select('*')
      .eq('state', 'FL')
      .limit(5000);

    if (error) {
      console.error(county.id, error.message);
      continue;
    }

    const inCounty = (producers || []).filter((p) => {
      const cn = (p.county_normalized || p.county || '').toUpperCase();
      return aliases.some((a) => {
        const an = a.replace(/\s+COUNTY$/i, '').trim();
        return cn === an || cn.includes(an) || an.includes(cn);
      });
    });

    for (const p of inCounty) {
      if (stats.promoted >= limit) break;
      stats.scanned++;
      const row = p as DfsProducerRow;
      try {
        assertNotSeedPromotion(row.id);
      } catch {
        stats.skipped['seed_id'] = (stats.skipped['seed_id'] ?? 0) + 1;
        continue;
      }

      const evalResult = evaluatePromotionEligibility(row);
      if (!evalResult.ok) {
        stats.skipped[evalResult.reason] = (stats.skipped[evalResult.reason] ?? 0) + 1;
        continue;
      }
      stats.eligible++;

      if (dryRun) {
        stats.promoted++;
        stats.byCounty[county.id] = (stats.byCounty[county.id] ?? 0) + 1;
        continue;
      }

      // Upsert provider by slug
      const insert = evalResult.providerInsert;
      // Tag county in short_description for hub filtering
      insert.short_description = [
        insert.short_description,
        `(${county.displayName} County)`,
      ]
        .filter(Boolean)
        .join(' ');

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
          stats.skipped['update_failed'] = (stats.skipped['update_failed'] ?? 0) + 1;
          continue;
        }
        providerId = updated.id;
        // Belt-and-suspenders: re-check trust after write shape
        const mapped = mapRowToProvider(updated as DbProvider);
        if (!canShowAsVerified(resolveProviderTrustState(mapped))) {
          await supabase.from('providers').update({ verified: false }).eq('id', providerId);
          stats.skipped['post_write_trust_fail'] =
            (stats.skipped['post_write_trust_fail'] ?? 0) + 1;
          continue;
        }
      } else {
        const { data: created, error: cerr } = await supabase
          .from('providers')
          .insert(insert)
          .select('id, *')
          .single();
        if (cerr || !created) {
          stats.skipped['insert_failed'] = (stats.skipped['insert_failed'] ?? 0) + 1;
          if (cerr) console.error('insert', cerr.message);
          continue;
        }
        providerId = created.id;
        const mapped = mapRowToProvider(created as DbProvider);
        if (!canShowAsVerified(resolveProviderTrustState(mapped))) {
          await supabase.from('providers').update({ verified: false }).eq('id', providerId);
          stats.skipped['post_write_trust_fail'] =
            (stats.skipped['post_write_trust_fail'] ?? 0) + 1;
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
          },
        },
        { onConflict: 'producer_id' }
      );

      stats.promoted++;
      stats.byCounty[county.id] = (stats.byCounty[county.id] ?? 0) + 1;
    }
  }

  console.log(JSON.stringify({ dryRun, limit, ...stats }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
