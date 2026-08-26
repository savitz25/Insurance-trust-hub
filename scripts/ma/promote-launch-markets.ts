/**
 * Phase 23 — promote ma_producers in Wave-1 launch markets → public providers.
 *
 *   npm run ma:promote -- --dry-run
 *   npm run ma:promote -- --market boston --skip-existing --confirm
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  MA_LAUNCH_MARKETS,
  marketById,
  type MaLaunchMarketId,
} from '../../lib/ma/launch-markets';
import {
  assertNotSeedPromotion,
  evaluateMaPromotionEligibility,
  type MaProducerRow,
} from '../../lib/ma/promote';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  licenseIdentityFromPromoteInsert,
  resolveLegacyProviderWrite,
} from '../../lib/providers/safe-provider-write';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) {
    const v = process.argv[i + 1];
    if (v && !v.startsWith('--')) return v;
    return 'true';
  }
  return undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const confirm = hasFlag('confirm');
  const globalLimit = Number(arg('limit') || '0') || 0;
  const marketArg = (arg('market') || 'all').toLowerCase();
  const skipExisting = hasFlag('skip-existing') || !hasFlag('re-promote');

  if (!dryRun && !confirm) {
    console.error('Refusing to write without --dry-run or --confirm');
    process.exit(1);
  }

  let markets = MA_LAUNCH_MARKETS;
  if (marketArg !== 'all') {
    const m = marketById(marketArg as MaLaunchMarketId);
    if (!m) {
      console.error('--market must be boston|worcester|springfield|all');
      process.exit(1);
    }
    markets = [m];
  }

  loadLocalEnv(resolve(process.cwd()));

  if (dryRun && !(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          note: 'No Supabase credentials — structural dry-run only. Agency rows must be imported before promote; licensed-company dumps never promote.',
          markets: markets.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            promoteCap: m.promoteCap,
            hubs: m.hubSlugs,
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
    byMarket: {} as Record<string, number>,
    samples: [] as Array<{ name: string; slug: string; market: string }>,
  };
  const bump = (k: string) => {
    stats.skipped[k] = (stats.skipped[k] ?? 0) + 1;
  };

  for (const market of markets) {
    if (globalLimit > 0 && stats.promoted >= globalLimit) break;
    let marketPromoted = 0;
    const pageSize = 500;
    let from = 0;

    for (;;) {
      if (globalLimit > 0 && stats.promoted >= globalLimit) break;
      if (marketPromoted >= market.promoteCap) break;

      const { data, error } = await supabase
        .from('ma_producers')
        .select('*')
        .eq('entity_type', 'business')
        .eq('ma_address', true)
        .eq('launch_market_id', market.id)
        .order('license_number', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        if (/schema cache|does not exist|ma_producers/i.test(error.message || '')) {
          console.log(
            JSON.stringify(
              {
                dryRun,
                note: 'ma_producers not in this database yet — apply 20260819120000_massachusetts_doi_inventory.sql, then import the agency lists (not the licensed-companies dump).',
                markets: markets.map((m) => ({
                  id: m.id,
                  displayName: m.displayName,
                  promoteCap: m.promoteCap,
                  hubs: m.hubSlugs,
                })),
              },
              null,
              2
            )
          );
          process.exit(0);
        }
        console.error(market.id, error.message);
        break;
      }
      if (!data?.length) break;

      for (const row of data as MaProducerRow[]) {
        if (globalLimit > 0 && stats.promoted >= globalLimit) break;
        if (marketPromoted >= market.promoteCap) break;
        stats.scanned++;

        if (skipExisting) {
          const { data: existing } = await supabase
            .from('ma_provider_promotions')
            .select('id')
            .eq('producer_id', row.id)
            .maybeSingle();
          if (existing) {
            bump('already_promoted');
            continue;
          }
        }

        const result = evaluateMaPromotionEligibility(row, { requireLaunchMarket: true });
        if (!result.ok) {
          bump(result.reason);
          continue;
        }
        stats.eligible++;

        if (dryRun) {
          stats.promoted++;
          marketPromoted++;
          stats.byMarket[market.id] = (stats.byMarket[market.id] ?? 0) + 1;
          if (stats.samples.length < 12) {
            stats.samples.push({
              name: result.providerInsert.name,
              slug: result.providerInsert.slug,
              market: market.id,
            });
          }
          continue;
        }

        try {
          assertNotSeedPromotion(row.id);
        } catch {
          bump('seed_guard');
          continue;
        }

        const insert = result.providerInsert;
        const ident = licenseIdentityFromPromoteInsert(insert);
        const { data: existingSlug } = await supabase
          .from('providers')
          .select('id, slug, license_info')
          .eq('slug', insert.slug)
          .maybeSingle();
        const writePlan = resolveLegacyProviderWrite({
          candidateSlug: insert.slug,
          licenseState: ident.licenseState,
          licenseNumber: ident.licenseNumber,
          existingBySlug: existingSlug ?? null,
        });

        let providerId: string;
        if (writePlan.action === 'update') {
          const { error: upErr } = await supabase
            .from('providers')
            .update({
              name: insert.name,
              categories: insert.categories,
              states_licensed: insert.states_licensed,
              cities: insert.cities,
              license_info: insert.license_info,
              specialties: insert.specialties,
              verified: true,
              description: insert.description,
              short_description: insert.short_description,
              contact: insert.contact,
              updated_at: new Date().toISOString(),
            })
            .eq('id', writePlan.id);
          if (upErr) {
            bump(`update_error:${upErr.message.slice(0, 40)}`);
            continue;
          }
          providerId = writePlan.id;
        } else {
          const { data: created, error: insErr } = await supabase
            .from('providers')
            .insert({
              slug: writePlan.slug,
              name: insert.name,
              provider_type: insert.provider_type,
              categories: insert.categories,
              states_licensed: insert.states_licensed,
              cities: insert.cities,
              license_info: insert.license_info,
              specialties: insert.specialties,
              rating: 0,
              review_count: 0,
              verified: true,
              description: insert.description,
              short_description: insert.short_description,
              contact: insert.contact,
            })
            .select('id')
            .single();
          if (insErr || !created) {
            bump(`insert_error:${insErr?.message?.slice(0, 40) ?? 'unknown'}`);
            continue;
          }
          providerId = created.id;
        }

        const { error: bridgeErr } = await supabase.from('ma_provider_promotions').upsert(
          {
            producer_id: row.id,
            provider_id: providerId,
            launch_market: market.id,
            promoted_by: 'phase23_madoi_pipeline',
            trust_snapshot: { trustState: 'verified', market: market.id },
          },
          { onConflict: 'producer_id' }
        );
        if (bridgeErr) {
          bump(`bridge_error:${bridgeErr.message.slice(0, 40)}`);
          continue;
        }

        stats.promoted++;
        marketPromoted++;
        stats.byMarket[market.id] = (stats.byMarket[market.id] ?? 0) + 1;
        if (stats.samples.length < 12) {
          stats.samples.push({
            name: insert.name,
            slug: writePlan.slug,
            market: market.id,
          });
        }
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  console.log(JSON.stringify({ dryRun, skipExisting, ...stats }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
