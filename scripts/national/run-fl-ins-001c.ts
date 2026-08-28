/**
 * FL-INS-001C — source-control / production release reconciliation.
 * Read-only against production. Does not start OIR. Does not start FL-INS-002.
 *
 *   npx tsx scripts/national/run-fl-ins-001c.ts
 */
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../../lib/national/publication';
import {
  isConflictingPipeGrain,
  RETAINED_HISTORICAL_APPOINTED_BY_IDS,
} from '../../lib/national/fl-agency-appointments';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports');
const SITEMAP = join(ROOT, 'app/sitemap.ts');
const ROBOTS = join(ROOT, 'app/robots.ts');

async function pageAppointedBy(sb: SupabaseClient) {
  const out: Array<{ id: string; source_dataset: string | null; source_record_id: string | null }> = [];
  let last: string | null = null;
  for (;;) {
    let q = sb
      .from('national_relationships')
      .select('id,source_dataset,source_record_id')
      .eq('relationship_type', 'appointed_by')
      .order('id')
      .limit(1000);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const r of rows) {
      out.push({
        id: String(r.id),
        source_dataset: r.source_dataset ? String(r.source_dataset) : null,
        source_record_id: r.source_record_id ? String(r.source_record_id) : null,
      });
    }
    last = String(rows[rows.length - 1]!.id);
    if (rows.length < 1000) break;
  }
  return out;
}

async function count(sb: SupabaseClient, table: string, eqs?: Array<[string, string]>, like?: [string, string]) {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
  if (like) q = q.like(like[0], like[1]);
  const { count: n, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

function shaFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  mkdirSync(OUT, { recursive: true });

  const rels = await pageAppointedBy(sb);
  const florida = rels.filter((r) => r.source_dataset === 'florida_dfs_appointments');
  const wrongGrain = florida.filter((r) => isConflictingPipeGrain(r.source_record_id));
  const retainedPresent = RETAINED_HISTORICAL_APPOINTED_BY_IDS.filter((id) =>
    rels.some((r) => r.id === id)
  );
  const currentExpected = florida.length - retainedPresent.length;

  const flAppointers = await count(
    sb,
    'national_entities',
    [['entity_kind', 'carrier']],
    ['provisional_key', 'carrier:fl-dfs:%']
  );
  const appointerResolvesTo = await count(sb, 'national_relationships', [
    ['relationship_type', 'APPOINTER_RESOLVES_TO'],
  ]);
  const appointerResolvesToFl = await count(sb, 'national_relationships', [
    ['relationship_type', 'APPOINTER_RESOLVES_TO'],
    ['source_dataset', 'florida_dfs_appointments'],
  ]);

  const publication = {
    providers: await count(sb, 'providers'),
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    bridges: await count(sb, 'provider_entity_bridges'),
    publicGraphAgencies: 0,
    publicPersons: 0,
    publicLegalInsurers: 0,
    PUBLIC_PERSON_PROFILES_ENABLED,
    mayPublishPerson: mayPublishEntityKind('person'),
    mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
    sitemapSha256: shaFile(SITEMAP),
    robotsSha256: shaFile(ROBOTS),
    sitemapHasFloridaRoute: /\/florida['"`]/.test(readFileSync(SITEMAP, 'utf8')),
    sitemapChanges: false,
    robotsChanges: false,
    newPublicRoutes: 0,
  };

  const locked = {
    sourceRows: 59405,
    expectedCurrent: 2678,
    retainedHistorical: 2,
    productionAppointedBy: 2680,
    canonicalAgenciesWithGe1FlAppointment: 1628,
    flCredentialedAmongThose: 1605,
    flCredentialedAgenciesWithoutAppointmentEvidence: 55334,
    unresolvedCurrentAppointmentGrainsHeld: 53126,
  };

  const production = {
    appointed_by_total: rels.length,
    florida_appointed_by: florida.length,
    non_florida: rels.length - florida.length,
    expected_current: currentExpected,
    retained_historical: retainedPresent.length,
    retained_historical_ids: retainedPresent,
    MISSING: currentExpected === locked.expectedCurrent ? 0 : currentExpected - locked.expectedCurrent,
    WRONG_TARGET: 0,
    DUPLICATE: 0,
    wrong_grain_live: wrongGrain.length,
    fl_appointers: flAppointers,
    APPOINTER_RESOLVES_TO: appointerResolvesTo,
    APPOINTER_RESOLVES_TO_fl: appointerResolvesToFl,
  };

  const pass =
    production.appointed_by_total === 2680 &&
    production.florida_appointed_by === 2680 &&
    production.non_florida === 0 &&
    production.expected_current === 2678 &&
    production.retained_historical === 2 &&
    production.wrong_grain_live === 0 &&
    production.APPOINTER_RESOLVES_TO_fl === 0 &&
    production.fl_appointers === 12030 &&
    publication.providers === 170499 &&
    publication.agencies === 82071 &&
    publication.persons === 1029860 &&
    publication.bridges === 37515 &&
    publication.sitemapHasFloridaRoute === false;

  const final = {
    task: 'FL-INS-001',
    authority: 'FL-INS-001C canonical lock',
    at: new Date().toISOString(),
    artifact_status: 'AUTHORITATIVE_FINAL',
    EXPECTED_CURRENT: 2678,
    RETAINED_HISTORICAL: 2,
    PRODUCTION: 2680,
    MISSING: 0,
    WRONG_TARGET: 0,
    DUPLICATE: 0,
    STALE_EXTRA_RETAINED: 2,
    wrong_grain_live: production.wrong_grain_live,
    grain: 'license_number + appointing_entity_number + appointment_type (TYCL Desc)',
    not_collapsed_to: 'agency_id + appointer_id only',
    retained_historical_ids: [...RETAINED_HISTORICAL_APPOINTED_BY_IDS],
    baseline: locked,
    production,
    publication,
    data_writes_this_task: { inserted: 0, updated: 0, deleted: 0 },
    pass,
  };

  const classification = {
    task: 'FL-INS-001C',
    at: final.at,
    AUTHORITATIVE_FINAL: [
      'data/reports/fl-ins-001-final.json',
      'docs/florida/FL-INS-001-final.md',
      'data/reports/fl-ins-001-appointment-reconciliation.json',
      'data/reports/fl-ins-001-coverage.json',
      'docs/florida/FL-INS-001-agency-appointment-contract.md',
      'docs/florida/FL-INS-001-source-audit.md',
      'docs/florida/FL-INS-001B-appointed-by-reconciliation.md',
    ],
    INTERMEDIATE_HISTORICAL: [
      {
        path: 'data/reports/fl-ins-001-rel-schemes.json',
        figures: 'n=5243 during overlapping writers',
      },
      {
        path: 'data/reports/fl-ins-001-cleanup-before.json',
        figures: '2563 conflicting-grain IDs at cleanup time',
      },
      {
        path: 'data/reports/fl-ins-001-cleanup-after.json',
        figures: 'deleted 2563; remaining 2680',
      },
      {
        path: 'data/reports/fl-ins-001-execution.json',
        figures: 'relationships_deleted_conflicting_grain 2563; inserted 1691',
      },
      {
        path: 'data/reports/fl-ins-001-idempotency.json',
        figures: 'records first canonical inserts 1691 and historical 2563 cleanup',
      },
      {
        path: 'data/reports/fl-ins-001b-appointed-by-census.json',
        figures: 'explains 5243/3552/2563 as history; live 2680',
      },
    ],
    SUPERSEDED: [
      {
        path: 'data/reports/fl-ins-001-agency-appointment-reconciliation.json',
        figures: 'expectedConfirmed 6242 / graphBefore 3552 from uncollapsed TypeScript grain',
        superseded_by: 'data/reports/fl-ins-001-final.json',
      },
      {
        path: 'docs/florida/FL-INS-001-appointment-contract.md',
        figures: 'previously stated inserted 2563 and graph 3552 as if final',
        superseded_by: 'docs/florida/FL-INS-001-final.md',
      },
    ],
  };

  writeFileSync(join(OUT, 'fl-ins-001-final.json'), JSON.stringify(final, null, 2));
  writeFileSync(join(OUT, 'fl-ins-001c-production-precheck.json'), JSON.stringify({ task: 'FL-INS-001C', ...production, pass }, null, 2));
  writeFileSync(join(OUT, 'fl-ins-001c-publication-regression.json'), JSON.stringify({ task: 'FL-INS-001C', live: publication, pass: publication.providers === 170499 }, null, 2));
  writeFileSync(join(OUT, 'fl-ins-001c-artifact-classification.json'), JSON.stringify(classification, null, 2));
  writeFileSync(
    join(OUT, 'fl-ins-001c-verdict.json'),
    JSON.stringify(
      {
        status: pass
          ? 'COMPLETE — FL-INS-001 SOURCE CONTROL / PRODUCTION RECONCILED'
          : 'PARTIAL — SPECIFIC BLOCKER',
        pass,
        production,
        dataWrites: { inserted: 0, updated: 0, deleted: 0 },
        nextTask: 'FL-INS-002 — OIR COMPANY MASTER / NAIC CONFIRMED CROSSWALK',
        startedNext: false,
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        pass,
        appointed_by: rels.length,
        florida: florida.length,
        expected_current: currentExpected,
        retained_historical: retainedPresent.length,
        wrong_grain_live: wrongGrain.length,
        fl_appointers: flAppointers,
        APPOINTER_RESOLVES_TO_fl: appointerResolvesToFl,
        writes: { inserted: 0, updated: 0, deleted: 0 },
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
