/**
 * Phase 5 — report staged vs promoted agency (business) inventory by launch county.
 *
 *   npm run dfs:status
 */
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { FL_LAUNCH_COUNTIES } from '../../lib/dfs/launch-counties';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

async function countProducers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  countyKeys: string[],
  entityType?: 'business' | 'individual'
): Promise<number> {
  let q = supabase
    .from('dfs_producers')
    .select('id', { count: 'exact', head: true })
    .eq('state', 'FL')
    .in('county_normalized', countyKeys);
  if (entityType) q = q.eq('entity_type', entityType);
  const { count, error } = await q;
  if (error) {
    console.error('producers count', error.message);
    return -1;
  }
  return count ?? 0;
}

async function countPromotions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  countyId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('dfs_provider_promotions')
    .select('id', { count: 'exact', head: true })
    .eq('launch_county', countyId);
  if (error) {
    console.error('promotions count', error.message);
    return -1;
  }
  return count ?? 0;
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows: Array<Record<string, unknown>> = [];
  let stagedBusiness = 0;
  let stagedIndividual = 0;
  let promoted = 0;

  for (const county of FL_LAUNCH_COUNTIES) {
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
    const business = await countProducers(supabase, countyKeys, 'business');
    const individual = await countProducers(supabase, countyKeys, 'individual');
    const promo = await countPromotions(supabase, county.id);
    stagedBusiness += Math.max(0, business);
    stagedIndividual += Math.max(0, individual);
    promoted += Math.max(0, promo);
    const remainingBusiness = business >= 0 && promo >= 0 ? Math.max(0, business - promo) : null;
    rows.push({
      county: county.displayName,
      id: county.id,
      wave: county.wave,
      promoteCap: county.promoteCap,
      stagedBusiness: business,
      stagedIndividual: individual,
      promoted: promo,
      remainingBusinessUnderCap:
        remainingBusiness != null
          ? Math.min(remainingBusiness, Math.max(0, county.promoteCap - promo))
          : null,
      atCap: promo >= county.promoteCap,
    });
  }

  console.log(
    JSON.stringify(
      {
        totals: { stagedBusiness, stagedIndividual, promoted },
        note: 'Phase 5 promotes agencies (business) only; individuals stay staged.',
        byCounty: rows,
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
