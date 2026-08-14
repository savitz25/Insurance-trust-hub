/**
 * Read-only FL non-resident audit.
 *   npm run dfs:audit-nonresident-fl
 *
 * Does not write. Uses service role only to read staging + public providers.
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { FL_LAUNCH_COUNTIES } from '../../lib/dfs/launch-counties';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

function launchCountyKeys(): string[] {
  const keys = new Set<string>();
  for (const c of FL_LAUNCH_COUNTIES) {
    for (const a of c.aliases) {
      keys.add(
        a
          .toUpperCase()
          .replace(/COUNTY$/i, '')
          .replace(/\s+/g, ' ')
          .trim()
      );
    }
  }
  return [...keys];
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const keys = launchCountyKeys();

  const countExact = async (
    table: string,
    apply: (q: any) => any
  ): Promise<number> => {
    let q = supabase.from(table).select('id', { count: 'exact', head: true });
    q = apply(q);
    const { count, error } = await q;
    if (error) {
      console.error(table, error.message);
      return -1;
    }
    return count ?? 0;
  };

  const stagedBusiness = await countExact('dfs_producers', (q) =>
    q.eq('entity_type', 'business')
  );
  const stagedIndividual = await countExact('dfs_producers', (q) =>
    q.eq('entity_type', 'individual')
  );
  const stagedBusinessLaunch = await countExact('dfs_producers', (q) =>
    q.eq('entity_type', 'business').in('county_normalized', keys)
  );
  const stagedBusinessNonLaunch = await countExact('dfs_producers', (q) =>
    q.eq('entity_type', 'business').not('county_normalized', 'in', `(${keys.join(',')})`)
  );
  const stagedBusinessNullCounty = await countExact('dfs_producers', (q) =>
    q.eq('entity_type', 'business').is('county_normalized', null)
  );
  const stagedResidentTrue = await countExact('dfs_producers', (q) =>
    q.eq('entity_type', 'business').eq('resident_flag', true)
  );
  const stagedResidentFalse = await countExact('dfs_producers', (q) =>
    q.eq('entity_type', 'business').eq('resident_flag', false)
  );
  const stagedResidentNull = await countExact('dfs_producers', (q) =>
    q.eq('entity_type', 'business').is('resident_flag', null)
  );
  const stagedStateNotFl = await countExact('dfs_producers', (q) =>
    q.eq('entity_type', 'business').neq('state', 'FL')
  );
  const promotedBridge = await countExact('dfs_provider_promotions', (q) => q);
  const promotedFlProviders = await countExact('providers', (q) =>
    q.eq('verified', true).contains('states_licensed', ['FL'])
  );

  const { data: promotedSample, error: pErr } = await supabase
    .from('providers')
    .select('slug, name, cities, contact, states_licensed, license_info')
    .eq('verified', true)
    .contains('states_licensed', ['FL'])
    .limit(400);

  if (pErr) console.error('promoted sample', pErr.message);

  let flAddress = 0;
  let nonFlAddress = 0;
  let missingAddressState = 0;
  const promotedNonFl: Array<Record<string, string>> = [];
  const promotedFl: Array<Record<string, string>> = [];
  for (const row of promotedSample ?? []) {
    const st = (row.contact?.address?.state || '').toUpperCase().slice(0, 2);
    const city = row.contact?.address?.city || row.cities?.[0] || '';
    const lic = row.license_info?.licenses?.[0]?.license_number || '';
    if (!st) missingAddressState++;
    else if (st === 'FL') {
      flAddress++;
      if (promotedFl.length < 10) {
        promotedFl.push({ license: lic, name: row.name, city, state: st, slug: row.slug });
      }
    } else {
      nonFlAddress++;
      if (promotedNonFl.length < 10) {
        promotedNonFl.push({ license: lic, name: row.name, city, state: st, slug: row.slug });
      }
    }
  }

  const { data: stagedLaunch, error: sErr } = await supabase
    .from('dfs_producers')
    .select('license_number, display_name, city, county, state, resident_flag')
    .eq('entity_type', 'business')
    .in('county_normalized', keys)
    .eq('resident_flag', false)
    .order('license_number')
    .limit(15);
  if (sErr) console.error('staged launch sample', sErr.message);

  const { data: stagedOutside, error: oErr } = await supabase
    .from('dfs_producers')
    .select('license_number, display_name, city, county, state, resident_flag')
    .eq('entity_type', 'business')
    .or(`county_normalized.is.null,county_normalized.eq.OUT OF STATE`)
    .limit(15);
  if (oErr) console.error('staged outside sample', oErr.message);

  const { count: importBatches } = await supabase
    .from('dfs_import_batches')
    .select('id, notes, row_count, source_file', { count: 'exact' })
    .eq('entity_type', 'business');

  const { data: batches } = await supabase
    .from('dfs_import_batches')
    .select('id, notes, row_count, source_file, imported_at')
    .eq('entity_type', 'business')
    .order('imported_at', { ascending: false })
    .limit(8);

  console.log(
    JSON.stringify(
      {
        readOnly: true,
        staged: {
          business: stagedBusiness,
          individual: stagedIndividual,
          businessInLaunchCounty: stagedBusinessLaunch,
          businessOutsideLaunchFilter: stagedBusinessNonLaunch,
          businessNullCounty: stagedBusinessNullCounty,
          residentFlagTrue: stagedResidentTrue,
          residentFlagFalse: stagedResidentFalse,
          residentFlagNull: stagedResidentNull,
          stateNotFl: stagedStateNotFl,
        },
        promoted: {
          dfsProviderPromotions: promotedBridge,
          verifiedProvidersStatesLicensedFl: promotedFlProviders,
          addressStateInSampleOf400: {
            sampleSize: (promotedSample ?? []).length,
            fl: flAddress,
            nonFl: nonFlAddress,
            missing: missingAddressState,
          },
        },
        importBatches: {
          businessBatchCount: importBatches ?? null,
          recent: batches ?? [],
        },
        samples: {
          promotedFlAddress: promotedFl,
          promotedNonFlAddress: promotedNonFl,
          stagedLaunchCountyResidentFlagFalse: stagedLaunch ?? [],
          stagedNullOrOutOfStateCounty: stagedOutside ?? [],
        },
        verdictHint:
          'Promote queries dfs_producers.state=FL AND county_normalized IN launch aliases. normalizeDfsRow hardcodes state=FL and never stores Business State. --launch-counties-only drops rows without a launch county.',
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
