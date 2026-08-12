/**
 * Phase 8 — promote tdi_producers in Wave-1 launch markets → public providers.
 *
 *   npm run tdi:promote -- --dry-run
 *   npm run tdi:promote -- --market houston --limit 50
 *   npm run tdi:promote -- --market all --skip-existing
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  TX_LAUNCH_MARKETS,
  marketById,
  type TxLaunchMarketId,
} from '../../lib/tdi/launch-markets';
import {
  assertNotSeedPromotion,
  evaluateTdiPromotionEligibility,
  type TdiProducerRow,
} from '../../lib/tdi/promote';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

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
  const globalLimit = Number(arg('limit') || '0') || 0;
  const marketArg = (arg('market') || 'all').toLowerCase();
  const skipExisting = hasFlag('skip-existing') || !hasFlag('re-promote');

  let markets = TX_LAUNCH_MARKETS;
  if (marketArg !== 'all') {
    const m = marketById(marketArg as TxLaunchMarketId);
    if (!m) {
      console.error(
        '--market must be houston|dallas|fort_worth|austin|san_antonio|all'
      );
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
          note: 'No Supabase credentials — structural dry-run only.',
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
        .from('tdi_producers')
        .select('*')
        .eq('state', 'TX')
        .eq('entity_type', 'business')
        .eq('launch_market_id', market.id)
        .order('license_number', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(market.id, error.message);
        break;
      }
      if (!data?.length) break;

      for (const row of data as TdiProducerRow[]) {
        if (globalLimit > 0 && stats.promoted >= globalLimit) break;
        if (marketPromoted >= market.promoteCap) break;
        stats.scanned++;

        if (skipExisting) {
          const { data: existing } = await supabase
            .from('tdi_provider_promotions')
            .select('id')
            .eq('producer_id', row.id)
            .maybeSingle();
          if (existing) {
            bump('already_promoted');
            continue;
          }
        }

        const result = evaluateTdiPromotionEligibility(row, {
          identityMatchAccepted: true,
          requireLaunchMarket: true,
        });
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
        const { data: existingSlug } = await supabase
          .from('providers')
          .select('id, slug')
          .eq('slug', insert.slug)
          .maybeSingle();

        let providerId: string;
        if (existingSlug?.id) {
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
            .eq('id', existingSlug.id);
          if (upErr) {
            bump(`update_error:${upErr.message.slice(0, 40)}`);
            continue;
          }
          providerId = existingSlug.id;
        } else {
          const { data: created, error: insErr } = await supabase
            .from('providers')
            .insert({
              slug: insert.slug,
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

        const { error: bridgeErr } = await supabase
          .from('tdi_provider_promotions')
          .upsert(
            {
              producer_id: row.id,
              provider_id: providerId,
              launch_market: market.id,
              promoted_by: 'phase8_tdi_pipeline',
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
            slug: insert.slug,
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
