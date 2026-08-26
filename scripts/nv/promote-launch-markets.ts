/**
 * Phase 14 / NV-1 — promote nv_producers → public NV-licensed firms.
 *
 *   npm run nv:promote -- --dry-run --metro las-vegas
 *   npm run nv:promote -- --metro all --confirm
 *   npm run nv:promote -- --metro remainder --confirm
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  NV_LAUNCH_MARKETS,
  marketById,
  type NvLaunchMarketId,
} from '../../lib/nv/launch-markets';
import {
  assertNotSeedPromotion,
  evaluateNvPromotionEligibility,
  type NvProducerRow,
} from '../../lib/nv/promote';
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
  const marketArg = (arg('metro') || arg('market') || 'all').toLowerCase();
  const skipExisting = hasFlag('skip-existing') || !hasFlag('re-promote');
  const includeRemainder = marketArg === 'all' || marketArg === 'remainder';

  if (!dryRun && !confirm) {
    console.error('Refusing to write without --dry-run or --confirm');
    process.exit(1);
  }

  let markets = NV_LAUNCH_MARKETS;
  if (marketArg !== 'all' && marketArg !== 'remainder') {
    const m = marketById(marketArg as NvLaunchMarketId);
    if (!m) {
      console.error('--metro must be las-vegas|reno|carson-city|remainder|all');
      process.exit(1);
    }
    markets = [m];
  }
  if (marketArg === 'remainder') {
    markets = [];
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
    samples: [] as Array<{ name: string; slug: string; market: string; type: string }>,
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
        .from('nv_producers')
        .select('*')
        .eq('entity_type', 'business')
        .eq('nv_address', true)
        .eq('launch_market_id', market.id)
        .order('license_number', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        if (/schema cache|does not exist|nv_producers/i.test(error.message || '')) {
          console.log(
            JSON.stringify(
              {
                dryRun,
                note: 'nv_producers not in this database yet — apply 20260816120000_nevada_doi_inventory.sql, then import.',
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

      for (const row of data as NvProducerRow[]) {
        if (globalLimit > 0 && stats.promoted >= globalLimit) break;
        if (marketPromoted >= market.promoteCap) break;
        stats.scanned++;

        if (skipExisting) {
          const { data: existing } = await supabase
            .from('nv_provider_promotions')
            .select('id')
            .eq('producer_id', row.id)
            .maybeSingle();
          if (existing) {
            bump('already_promoted');
            continue;
          }
        }

        const result = evaluateNvPromotionEligibility(row, {
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
              type: row.firm_license_type,
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

        const { error: bridgeErr } = await supabase
          .from('nv_provider_promotions')
          .upsert(
            {
              producer_id: row.id,
              provider_id: providerId,
              launch_market: market.id,
              promoted_by: 'phase14_nvdoi_pipeline',
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
            type: row.firm_license_type,
          });
        }
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  const STATEWIDE_CAP = 20_000;
  if (includeRemainder && (globalLimit === 0 || stats.promoted < globalLimit)) {
    const pageSize = 500;
    let from = 0;
    let remainderPromoted = 0;
    for (;;) {
      if (globalLimit > 0 && stats.promoted >= globalLimit) break;
      if (remainderPromoted >= STATEWIDE_CAP) break;
      const { data, error } = await supabase
        .from('nv_producers')
        .select('*')
        .eq('entity_type', 'business')
        .is('launch_market_id', null)
        .order('license_number', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error('statewide', error.message);
        break;
      }
      if (!data?.length) break;
      for (const row of data as NvProducerRow[]) {
        if (globalLimit > 0 && stats.promoted >= globalLimit) break;
        if (remainderPromoted >= STATEWIDE_CAP) break;
        stats.scanned++;
        if (skipExisting) {
          const { data: existing } = await supabase
            .from('nv_provider_promotions')
            .select('id')
            .eq('producer_id', row.id)
            .maybeSingle();
          if (existing) {
            bump('already_promoted');
            continue;
          }
        }
        const result = evaluateNvPromotionEligibility(row, {
          identityMatchAccepted: true,
          requireLaunchMarket: false,
        });
        if (!result.ok) {
          bump(result.reason);
          continue;
        }
        stats.eligible++;
        if (dryRun) {
          stats.promoted++;
          remainderPromoted++;
          stats.byMarket.statewide = (stats.byMarket.statewide ?? 0) + 1;
          if (stats.samples.length < 12) {
            stats.samples.push({
              name: result.providerInsert.name,
              slug: result.providerInsert.slug,
              market: 'statewide',
              type: row.firm_license_type,
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
        const { error: bridgeErr } = await supabase.from('nv_provider_promotions').upsert(
          {
            producer_id: row.id,
            provider_id: providerId,
            launch_market: 'statewide',
            promoted_by: 'phase_nv1_doi_pipeline',
            trust_snapshot: {
              trustState: 'verified',
              market: 'statewide',
              residency: result.providerInsert.contact.residency ?? null,
              home_address_state: result.providerInsert.contact.home_address_state ?? null,
            },
          },
          { onConflict: 'producer_id' }
        );
        if (bridgeErr) {
          bump(`bridge_error:${bridgeErr.message.slice(0, 40)}`);
          continue;
        }
        stats.promoted++;
        remainderPromoted++;
        stats.byMarket.statewide = (stats.byMarket.statewide ?? 0) + 1;
        if (stats.samples.length < 12) {
          stats.samples.push({
            name: insert.name,
            slug: writePlan.slug,
            market: 'statewide',
            type: row.firm_license_type,
          });
        }
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  console.log(JSON.stringify({ dryRun, skipExisting, includeRemainder, ...stats }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
