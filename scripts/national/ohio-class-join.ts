/**
 * Join official ODI per-type mailing lists onto existing odi_producers by NPN.
 * Does not infer class from name. Does not copy FL/TX class onto Ohio.
 *
 *   npx tsx scripts/national/ohio-class-join.ts
 *   npx tsx scripts/national/ohio-class-join.ts --write-staging
 *
 * --write-staging updates odi_producers.license_types only (not providers, not graph).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { classifyCredential } from '../../lib/national/classification';

const OVERLAY =
  process.env.INS_NAT_005_ODI_CLASSES ||
  'C:/Users/Michael.Savitsky/agent-tools/odi-mailing-npn-classes.json';
const OUT =
  process.env.INS_NAT_005_OHIO_RECOVERED ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-005-ohio-recovered.json';

const writeStaging = process.argv.includes('--write-staging');

type Mailing = Record<string, { names: string[]; classes: string[]; reports: string[] }>;

async function fetchProducers(
  url: string,
  key: string
): Promise<Array<{ id: string; npn: string | null; license_number: string; legal_name: string; license_types: string[] }>> {
  const rows: Array<{
    id: string;
    npn: string | null;
    license_number: string;
    legal_name: string;
    license_types: string[];
  }> = [];
  let start = 0;
  const page = 1000;
  while (true) {
    const resp = await fetch(
      `${url}/rest/v1/odi_producers?select=id,npn,license_number,legal_name,license_types&order=legal_name.asc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${start}-${start + page - 1}`,
          Prefer: 'count=exact',
        },
      }
    );
    const batch = (await resp.json()) as typeof rows;
    rows.push(...batch);
    if (batch.length < page) break;
    start += page;
  }
  return rows;
}

async function main() {
  if (!existsSync(OVERLAY)) {
    console.error('Missing mailing-list class map:', OVERLAY);
    process.exit(1);
  }
  const mailing = JSON.parse(readFileSync(OVERLAY, 'utf8')) as Mailing;

  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const producers = await fetchProducers(url, serviceRoleKey);

  const recovered = [];
  let confirmed = 0;
  let unresolved = 0;
  const classCounts: Record<string, number> = {};
  for (const p of producers) {
    const npn = String(p.npn || p.license_number || '').trim();
    const hit = mailing[npn];
    const classes = hit ? [...hit.classes].sort() : [];
    const classified = classifyCredential({
      sourceDataset: 'ohio_odi',
      sourceRecordId: p.id,
      jurisdiction: 'OH',
      entityKind: 'agency',
      licenseNumber: p.license_number,
      legalName: p.legal_name,
      npn,
      licenseClass: classes[0] ?? null,
      licenseTypes: classes,
    });
    if (classes.length) confirmed += 1;
    else unresolved += 1;
    const key = classes.join(' + ') || '(unresolved)';
    classCounts[key] = (classCounts[key] ?? 0) + 1;
    recovered.push({
      id: p.id,
      npn,
      legalName: p.legal_name,
      officialClasses: classes,
      confidence: classes.length ? 'CONFIRMED' : 'UNRESOLVED',
      matchMethod: classes.length ? 'odi_mailing_list_npn_join' : 'no_mailing_list_hit',
      coreAgencyEligible: classified.coreAgencyEligible,
      primaryProductClass: classified.primaryProductClass,
      classificationUnknown: classified.classificationUnknown,
    });
  }

  const summary = {
    producers: producers.length,
    mailingNpns: Object.keys(mailing).length,
    confirmedNpnJoin: confirmed,
    unresolved: unresolved,
    coreEligible: recovered.filter((r) => r.coreAgencyEligible).length,
    classCounts,
    writeStaging,
    note: 'Class comes from which official ODI mailing-list report the NPN appeared in. CSV itself has no license-type column.',
  };
  writeFileSync(OUT, JSON.stringify({ summary, recovered }, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  console.log('wrote', OUT);

  if (!writeStaging) return;

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let updated = 0;
  const hits = recovered.filter((r) => r.officialClasses.length);
  for (let i = 0; i < hits.length; i += 50) {
    const slice = hits.slice(i, i + 50);
    for (const r of slice) {
      const { error } = await supabase
        .from('odi_producers')
        .update({ license_types: r.officialClasses, updated_at: new Date().toISOString() })
        .eq('id', r.id);
      if (error) {
        console.error('update error', r.id, error.message);
      } else {
        updated += 1;
      }
    }
  }
  console.log(JSON.stringify({ stagingUpdated: updated, skippedUnresolved: unresolved }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
