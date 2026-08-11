/**
 * Backfill structured contact.county / launch_county_id on DFS-promoted providers
 * using short_description county tags (no inventing listings).
 *
 *   npm run dfs:backfill-county
 *   npm run dfs:backfill-county -- --dry-run
 *   npm run dfs:backfill-county -- --limit 500
 */

import { loadLocalEnv } from '../lib/load-local-env';
import { createClient } from '@supabase/supabase-js';
import {
  FL_LAUNCH_COUNTIES,
  countyMatchOrParts,
  structuredContactForCounty,
} from '../../lib/dfs/launch-counties';

loadLocalEnv();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const limit = Number(arg('limit') ?? '0') || 0;
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Untyped ops client
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let updated = 0;
  let scanned = 0;
  let skipped = 0;

  for (const county of FL_LAUNCH_COUNTIES) {
    const or = countyMatchOrParts(county).join(',');
    let from = 0;
    const pageSize = 200;
    let countyUpdated = 0;

    for (;;) {
      if (limit > 0 && updated >= limit) break;

      const { data, error } = await sb
        .from('providers')
        .select('id,contact,short_description')
        .eq('verified', true)
        .contains('states_licensed', ['FL'])
        .or(or)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(county.id, error.message);
        break;
      }
      if (!data?.length) break;

      for (const row of data) {
        scanned++;
        if (limit > 0 && updated >= limit) break;

        const contact = (row.contact ?? {}) as Record<string, unknown>;
        if (
          contact.launch_county_id === county.id &&
          contact.county === county.displayName
        ) {
          skipped++;
          continue;
        }

        const nextContact = {
          ...contact,
          ...structuredContactForCounty(county),
        };

        if (dryRun) {
          updated++;
          countyUpdated++;
          continue;
        }

        const { error: upErr } = await sb
          .from('providers')
          .update({ contact: nextContact })
          .eq('id', row.id);

        if (upErr) {
          console.error('update failed', row.id, upErr.message);
          continue;
        }
        updated++;
        countyUpdated++;
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    console.log(
      `${county.displayName}: updated=${countyUpdated} (running total ${updated})`
    );
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned,
        updated,
        skippedAlreadyStructured: skipped,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
