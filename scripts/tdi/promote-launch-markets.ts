/**
 * Phase 8 / TX-2 — promote tdi_producers → public providers.
 *
 *   npm run tdi:promote -- --scope launch-metros --dry-run
 *   npm run tdi:promote -- --scope directory-statewide --dry-run --limit 50
 *   npm run tdi:promote -- --scope directory-statewide --confirm
 *   npm run tdi:promote -- --market houston --dry-run --limit 25
 *
 * directory-statewide = any active TX-licensed agency (any HQ) → /directory?state=TX
 * launch-metros      = TX address + Wave-1 metro → hubs only
 * Writes require --dry-run or --confirm. Skip-existing is default.
 */

import { mkdirSync, writeFileSync } from 'fs';
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

type Stats = {
  scanned: number;
  eligible: number;
  promoted: number;
  skipped: Record<string, number>;
  byMarket: Record<string, number>;
  samples: Array<{
    name: string;
    slug: string;
    market: string;
    hqState: string;
    residency?: string;
  }>;
};

async function main() {
  const dryRun = hasFlag('dry-run');
  const confirm = hasFlag('confirm');
  const globalLimit = Number(arg('limit') || '0') || 0;
  const marketArg = (arg('market') || '').toLowerCase();
  const scope = (arg('scope') || (marketArg ? 'launch-metros' : 'launch-metros')).toLowerCase();
  const skipExisting = hasFlag('skip-existing') || !hasFlag('re-promote');

  if (!dryRun && !confirm) {
    console.error('Refusing to write without --dry-run or --confirm');
    process.exit(1);
  }

  const doLaunch = scope === 'launch-metros' || scope === 'all';
  const doStatewide = scope === 'directory-statewide' || scope === 'all';
  if (!doLaunch && !doStatewide) {
    console.error('--scope must be launch-metros | directory-statewide | all');
    process.exit(1);
  }

  let markets = TX_LAUNCH_MARKETS;
  if (doLaunch && marketArg && marketArg !== 'all') {
    const m = marketById(marketArg as TxLaunchMarketId);
    if (!m) {
      console.error(
        '--market must be houston|dallas|fort_worth|austin|san_antonio|all'
      );
      process.exit(1);
    }
    markets = [m];
  }
  if (!doLaunch) {
    markets = [];
  }

  loadLocalEnv(resolve(process.cwd()));

  if (dryRun && !(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()) {
    const structural = {
      dryRun: true,
      note: 'No Supabase credentials — structural dry-run only.',
      scope,
      markets: markets.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        promoteCap: m.promoteCap,
        hubs: m.hubSlugs,
      })),
    };
    console.log(JSON.stringify(structural, null, 2));
    process.exit(0);
  }

  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stats: Stats = {
    scanned: 0,
    eligible: 0,
    promoted: 0,
    skipped: {},
    byMarket: {},
    samples: [],
  };
  const bump = (k: string) => {
    stats.skipped[k] = (stats.skipped[k] ?? 0) + 1;
  };

  const writeOne = async (
    row: TdiProducerRow,
    requireLaunchMarket: boolean,
    fallbackMarket: string
  ): Promise<boolean> => {
    stats.scanned++;

    // Statewide never overwrites hub rows (would strip launch_market_id).
    if (skipExisting || !requireLaunchMarket) {
      const { data: existing } = await supabase
        .from('tdi_provider_promotions')
        .select('id')
        .eq('producer_id', row.id)
        .maybeSingle();
      if (existing) {
        bump('already_promoted');
        return false;
      }
    }

    const result = evaluateTdiPromotionEligibility(row, {
      identityMatchAccepted: true,
      requireLaunchMarket,
    });
    if (!result.ok) {
      bump(result.reason);
      return false;
    }
    stats.eligible++;

    const marketLabel = result.marketId || fallbackMarket;
    const hqState = (row.state || '').trim().toUpperCase().slice(0, 2) || 'blank';

    if (dryRun) {
      stats.promoted++;
      stats.byMarket[marketLabel] = (stats.byMarket[marketLabel] ?? 0) + 1;
      if (stats.samples.length < 16) {
        stats.samples.push({
          name: result.providerInsert.name,
          slug: result.providerInsert.slug,
          market: marketLabel,
          hqState,
          residency: result.providerInsert.contact.residency,
        });
      }
      return true;
    }

    try {
      assertNotSeedPromotion(row.id);
    } catch {
      bump('seed_guard');
      return false;
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
        return false;
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
        return false;
      }
      providerId = created.id;
    }

    const { error: bridgeErr } = await supabase
      .from('tdi_provider_promotions')
      .upsert(
        {
          producer_id: row.id,
          provider_id: providerId,
          launch_market: marketLabel,
          promoted_by: requireLaunchMarket
            ? 'phase8_tdi_pipeline'
            : 'phase_tx2_directory',
          trust_snapshot: {
            trustState: 'verified',
            market: marketLabel,
            residency: insert.contact.residency ?? null,
            home_address_state: insert.contact.home_address_state ?? null,
          },
        },
        { onConflict: 'producer_id' }
      );
    if (bridgeErr) {
      bump(`bridge_error:${bridgeErr.message.slice(0, 40)}`);
      return false;
    }

    stats.promoted++;
    stats.byMarket[marketLabel] = (stats.byMarket[marketLabel] ?? 0) + 1;
    if (stats.samples.length < 16) {
      stats.samples.push({
        name: insert.name,
        slug: insert.slug,
        market: marketLabel,
        hqState,
        residency: insert.contact.residency,
      });
    }
    return true;
  };

  if (doLaunch) {
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
          const wrote = await writeOne(row, true, market.id);
          if (wrote) marketPromoted++;
        }

        if (data.length < pageSize) break;
        from += pageSize;
      }
    }
  }

  if (doStatewide && (globalLimit === 0 || stats.promoted < globalLimit)) {
    const pageSize = 500;
    let from = 0;
    for (;;) {
      if (globalLimit > 0 && stats.promoted >= globalLimit) break;
      const { data, error } = await supabase
        .from('tdi_producers')
        .select('*')
        .eq('entity_type', 'business')
        .order('license_number', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error('statewide', error.message);
        break;
      }
      if (!data?.length) break;

      for (const row of data as TdiProducerRow[]) {
        if (globalLimit > 0 && stats.promoted >= globalLimit) break;
        await writeOne(row, false, 'statewide');
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  const summary = {
    dryRun,
    confirm,
    skipExisting,
    scope,
    ...stats,
  };

  const outDir = resolve(process.cwd(), 'scripts/output');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(
    resolve(outDir, `tdi-promote-${scope}-${dryRun ? 'dry-run' : 'confirm'}-${stamp}.json`),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
