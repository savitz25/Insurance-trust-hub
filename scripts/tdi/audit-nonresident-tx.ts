/**
 * Read-only TX non-resident audit.
 *   npm run tdi:audit-nonresident-tx
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const countExact = async (table: string, apply: (q: any) => any) => {
    let q = supabase.from(table).select('id', { count: 'exact', head: true });
    q = apply(q);
    const { count, error } = await q;
    if (error) {
      console.error(table, error.message);
      return -1;
    }
    return count ?? 0;
  };

  const staged = await countExact('tdi_producers', (q) =>
    q.eq('entity_type', 'business')
  );
  const stagedTx = await countExact('tdi_producers', (q) =>
    q.eq('entity_type', 'business').eq('state', 'TX')
  );
  const stagedNonTx = await countExact('tdi_producers', (q) =>
    q.eq('entity_type', 'business').neq('state', 'TX')
  );
  const stagedNoMarket = await countExact('tdi_producers', (q) =>
    q.eq('entity_type', 'business').is('launch_market_id', null)
  );
  const promotedBridge = await countExact('tdi_provider_promotions', (q) => q);
  const promotedTx = await countExact('providers', (q) =>
    q.eq('verified', true).contains('states_licensed', ['TX'])
  );

  const { data: batches } = await supabase
    .from('tdi_import_batches')
    .select('id, notes, row_count, source_file, imported_at')
    .order('imported_at', { ascending: false })
    .limit(8);

  const { data: promotedSample } = await supabase
    .from('providers')
    .select('slug, name, cities, contact, license_info, states_licensed')
    .eq('verified', true)
    .contains('states_licensed', ['TX'])
    .limit(400);

  let txAddr = 0;
  let nonTxAddr = 0;
  const promotedTxHq: Array<Record<string, string>> = [];
  const promotedNonTxHq: Array<Record<string, string>> = [];
  for (const row of promotedSample ?? []) {
    const st = (row.contact?.address?.state || '').toUpperCase().slice(0, 2);
    const city = row.contact?.address?.city || row.cities?.[0] || '';
    const lic = row.license_info?.licenses?.[0]?.license_number || '';
    if (st === 'TX') {
      txAddr++;
      if (promotedTxHq.length < 10) {
        promotedTxHq.push({ license: lic, name: row.name, city, state: st, slug: row.slug });
      }
    } else if (st) {
      nonTxAddr++;
      if (promotedNonTxHq.length < 10) {
        promotedNonTxHq.push({ license: lic, name: row.name, city, state: st, slug: row.slug });
      }
    }
  }

  const { data: stagedNonTxRows } = await supabase
    .from('tdi_producers')
    .select('license_number, display_name, city, state, launch_market_id')
    .eq('entity_type', 'business')
    .neq('state', 'TX')
    .limit(15);

  const { data: stagedTxNoMarket } = await supabase
    .from('tdi_producers')
    .select('license_number, display_name, city, state, launch_market_id')
    .eq('entity_type', 'business')
    .eq('state', 'TX')
    .is('launch_market_id', null)
    .limit(10);

  console.log(
    JSON.stringify(
      {
        readOnly: true,
        staged: {
          business: staged,
          stateTx: stagedTx,
          stateNotTx: stagedNonTx,
          noLaunchMarket: stagedNoMarket,
        },
        promoted: {
          tdiProviderPromotions: promotedBridge,
          verifiedProvidersStatesLicensedTx: promotedTx,
          addressStateInSampleOf400: {
            sampleSize: (promotedSample ?? []).length,
            tx: txAddr,
            nonTx: nonTxAddr,
          },
        },
        importBatches: batches ?? [],
        samples: {
          promotedTxAddress: promotedTxHq,
          promotedNonTxAddress: promotedNonTxHq,
          stagedNonTxHq: stagedNonTxRows ?? [],
          stagedTxNoLaunchMarket: stagedTxNoMarket ?? [],
        },
        verdictHint:
          'Import skips state !== TX (not_texas). Promote queries state=TX AND launch_market_id. evaluateTdiPromotionEligibility rejects not_texas. Public address.state is hardcoded TX.',
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
