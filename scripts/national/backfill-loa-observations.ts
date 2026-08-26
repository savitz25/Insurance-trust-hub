/**
 * INS-NAT-009 — official LOA observations for confirmed graph agencies.
 *
 *   npx tsx scripts/national/backfill-loa-observations.ts
 *   npx tsx scripts/national/backfill-loa-observations.ts --execute
 *
 * Default dry-run. Never writes public.providers. Never creates entities
 * or credentials. Never treats appointment TYCL or license class as LOA.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  datasetJurisdiction,
  executeEligible,
  extractOfficialLoas,
  normalizeLoaStatus,
  observationKey,
  type ExtractedLoa,
  type LoaStatusToken,
} from '../../lib/national/loa';

const OUTDIR =
  process.env.INS_NAT_009_OUTDIR ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-009-manifest';
const execute = process.argv.includes('--execute');
const APPROVED_TABLES = new Set(['tdi_producers', 'vt_producers', 'odi_producers']);
const TABLE_DATASET: Record<string, string> = {
  tdi_producers: 'texas_tdi',
  vt_producers: 'vermont_dfr',
  odi_producers: 'ohio_odi',
  dfs_producers: 'florida_dfs',
};
const DATASET_REGULATOR: Record<string, string> = {
  texas_tdi: 'Texas Department of Insurance',
  vermont_dfr: 'Vermont Department of Financial Regulation',
  ohio_odi: 'Ohio Department of Insurance',
  florida_dfs: 'Florida Department of Financial Services',
};

type Link = {
  source_table: string;
  source_record_id: string;
  entity_id: string | null;
  credential_id: string | null;
  source_dataset: string;
};

type Producer = {
  id: string;
  license_types?: string[] | null;
  qualifications?: string[] | null;
  lines_of_authority?: string[] | null;
  license_status?: string | null;
  source_checked_at?: string | null;
};

type Planned = {
  entity_id: string;
  credential_id: string;
  official_text: string;
  official_code: string | null;
  loa_status: LoaStatusToken;
  source_dataset: string;
  regulator: string;
  source_observed_at: string | null;
  consumer_group: string | null;
  families: string[];
  attribution: ExtractedLoa['attribution'];
  jurisdiction: string;
};

async function fetchAll<T>(
  sb: SupabaseClient,
  table: string,
  select: string,
  eq?: [string, string]
): Promise<T[]> {
  const rows: T[] = [];
  const page = 1000;
  let from = 0;
  for (;;) {
    let q = sb.from(table).select(select).range(from, from + page - 1);
    if (eq) q = q.eq(eq[0], eq[1]);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return rows;
}

async function count(sb: SupabaseClient, table: string, eq?: [string, string]): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  if (eq) q = q.eq(eq[0], eq[1]);
  const { count: n, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
}

function historicalOrUnknown(licenseStatus: string | null | undefined): LoaStatusToken {
  const n = normalizeLoaStatus(licenseStatus);
  if (n === 'expired' || n === 'inactive' || n === 'terminated') return n;
  return 'UNKNOWN';
}

async function uniqueArrayTerms(
  sb: SupabaseClient,
  table: string,
  column: string
): Promise<Record<string, number>> {
  const rows = await fetchAll<Record<string, string[] | null>>(sb, table, column);
  const counts: Record<string, number> = {};
  for (const r of rows) {
    for (const t of r[column] ?? []) {
      const s = String(t || '').trim();
      if (s) bump(counts, s);
    }
  }
  return counts;
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const providers = await count(sb, 'providers');
  if (providers !== 170499) {
    console.error(JSON.stringify({ halt: 'providers_count_unexpected', providers }));
    process.exit(1);
  }

  const baseline = {
    agencies: await count(sb, 'national_entities', ['entity_kind', 'agency']),
    credentials: await count(sb, 'license_credentials'),
    carriers: await count(sb, 'national_entities', ['entity_kind', 'carrier']),
    appointments: await count(sb, 'national_relationships'),
    contacts: await count(sb, 'contact_observations'),
    loaBefore: await count(sb, 'loa_observations'),
    providers,
  };

  const links = await fetchAll<Link>(
    sb,
    'source_record_links',
    'source_table,source_record_id,entity_id,credential_id,source_dataset'
  );
  const bySource = new Map<string, Link>();
  const agenciesExamined = new Set<string>();
  const credentialsExamined = new Set<string>();
  for (const l of links) {
    if (!l.source_record_id) continue;
    bySource.set(`${l.source_table}|${l.source_record_id}`, l);
    if (l.entity_id) agenciesExamined.add(l.entity_id);
    if (l.credential_id) credentialsExamined.add(l.credential_id);
  }

  const planned = new Map<string, Planned>();
  const skipReasons: Record<string, number> = {};
  let skippedNoLineage = 0;
  let reviewRequired = 0;
  let unresolved = 0;
  let malformed = 0;
  const sourceAudit: Record<string, unknown> = {};

  const flTypes = await uniqueArrayTerms(sb, 'dfs_producers', 'lines_of_authority');
  sourceAudit.florida = {
    field: 'lines_of_authority',
    role: 'CREDENTIAL_CLASS',
    distinctTerms: Object.keys(flTypes).length,
    top: Object.entries(flTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24),
    note: 'DFS License TYCL Desc. Not product LOA. Not written.',
  };
  bump(skipReasons, 'fl_credential_class', Object.values(flTypes).reduce((a, b) => a + b, 0));

  const { data: apptSample, error: apptErr } = await sb
    .from('dfs_appointments')
    .select('appointment_type')
    .limit(2000);
  if (apptErr) throw new Error(apptErr.message);
  const apptTypes: Record<string, number> = {};
  for (const r of apptSample ?? []) {
    const t = String((r as { appointment_type: string | null }).appointment_type || '').trim();
    if (t) bump(apptTypes, t);
  }
  sourceAudit.floridaAppointments = {
    field: 'appointment_type',
    role: 'APPOINTMENT_TYPE',
    sampleDistinct: Object.keys(apptTypes).length,
    top: Object.entries(apptTypes).sort((a, b) => b[1] - a[1]).slice(0, 15),
    note: 'Never treated as LOA.',
  };

  async function processProducers(table: string, select: string) {
    const dataset = TABLE_DATASET[table]!;
    const jurisdiction = datasetJurisdiction(dataset)!;
    const regulator = DATASET_REGULATOR[dataset]!;
    const rows = await fetchAll<Producer>(sb, table, select);
    const qualCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let withQual = 0;
    let predicted = 0;
    for (const r of rows) {
      for (const t of r.license_types ?? []) {
        if (t?.trim()) bump(typeCounts, t.trim());
      }
      const quals = (r.qualifications ?? []).map((q) => q.trim()).filter(Boolean);
      if (quals.length) withQual += 1;
      for (const q of quals) bump(qualCounts, q);

      if (!APPROVED_TABLES.has(table)) continue;

      const extracted = extractOfficialLoas({
        jurisdiction,
        sourceDataset: dataset,
        licenseTypes: r.license_types,
        qualifications: r.qualifications,
        licenseStatus: r.license_status,
        loaStatusByText: Object.fromEntries(
          quals.map((q) => [q, historicalOrUnknown(r.license_status)])
        ),
      });
      for (const s of extracted.skipped) bump(skipReasons, s.reason);
      if (!quals.length && extracted.observations.length === 0) continue;

      const link = bySource.get(`${table}|${r.id}`);
      if (!link?.entity_id || !link?.credential_id) {
        skippedNoLineage += 1;
        bump(skipReasons, 'no_deterministic_lineage');
        continue;
      }

      for (const obs of extracted.observations) {
        if (obs.attribution === 'REVIEW_REQUIRED') {
          reviewRequired += 1;
          continue;
        }
        if (obs.attribution === 'UNRESOLVED') {
          unresolved += 1;
          continue;
        }
        if (!executeEligible(obs)) {
          bump(skipReasons, 'not_execute_eligible');
          continue;
        }
        const key = observationKey(link.credential_id, dataset, obs.officialText);
        if (planned.has(key)) continue;
        planned.set(key, {
          entity_id: link.entity_id,
          credential_id: link.credential_id,
          official_text: obs.officialText,
          official_code: obs.officialCode,
          loa_status: obs.loaStatus,
          source_dataset: dataset,
          regulator,
          source_observed_at: r.source_checked_at ?? null,
          consumer_group: obs.consumerGroup,
          families: obs.families,
          attribution: obs.attribution,
          jurisdiction,
        });
        predicted += 1;
      }
    }
    sourceAudit[table] = {
      rows: rows.length,
      distinctLicenseTypes: Object.keys(typeCounts).length,
      licenseTypes: Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 30),
      distinctQualifications: Object.keys(qualCounts).length,
      qualifications: Object.entries(qualCounts).sort((a, b) => b[1] - a[1]).slice(0, 40),
      rowsWithQualifications: withQual,
      predictedFromTable: predicted,
    };
  }

  await processProducers(
    'tdi_producers',
    'id,license_types,qualifications,license_status,source_checked_at'
  );
  await processProducers(
    'vt_producers',
    'id,license_types,qualifications,license_status,source_checked_at'
  );
  await processProducers(
    'odi_producers',
    'id,license_types,qualifications,license_status,source_checked_at'
  );

  const nvTypes = await uniqueArrayTerms(sb, 'nv_producers', 'license_types');
  const nvQuals = await uniqueArrayTerms(sb, 'nv_producers', 'qualifications');
  const msTypes = await uniqueArrayTerms(sb, 'ms_producers', 'license_types');
  const msQuals = await uniqueArrayTerms(sb, 'ms_producers', 'qualifications');
  sourceAudit.nevada = {
    attached: false,
    reason: 'provisional identity; not on confirmed graph',
    licenseTypes: Object.entries(nvTypes).sort((a, b) => b[1] - a[1]).slice(0, 15),
    qualifications: Object.entries(nvQuals).sort((a, b) => b[1] - a[1]).slice(0, 15),
  };
  sourceAudit.mississippi = {
    attached: false,
    reason: 'provisional identity; not on confirmed graph',
    licenseTypes: Object.entries(msTypes).sort((a, b) => b[1] - a[1]).slice(0, 10),
    qualifications: Object.entries(msQuals).sort((a, b) => b[1] - a[1]).slice(0, 10),
  };

  const list = [...planned.values()].sort((a, b) =>
    observationKey(a.credential_id, a.source_dataset, a.official_text).localeCompare(
      observationKey(b.credential_id, b.source_dataset, b.official_text)
    )
  );
  const fingerprint = createHash('sha256')
    .update(
      list
        .map((o) => observationKey(o.credential_id, o.source_dataset, o.official_text))
        .join('\n')
    )
    .digest('hex');

  const byState: Record<string, number> = {};
  const byFamily: Record<string, number> = {};
  const byOfficial: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const agenciesCovered = new Set<string>();
  const credsCovered = new Set<string>();
  const agencyStates = new Map<string, Set<string>>();
  const agencyFamiliesByState = new Map<string, Map<string, Set<string>>>();

  for (const o of list) {
    bump(byState, o.jurisdiction);
    bump(byOfficial, o.official_text);
    bump(byStatus, o.loa_status);
    agenciesCovered.add(o.entity_id);
    credsCovered.add(o.credential_id);
    if (!agencyStates.has(o.entity_id)) agencyStates.set(o.entity_id, new Set());
    agencyStates.get(o.entity_id)!.add(o.jurisdiction);
    if (!agencyFamiliesByState.has(o.entity_id)) agencyFamiliesByState.set(o.entity_id, new Map());
    const fm = agencyFamiliesByState.get(o.entity_id)!;
    if (!fm.has(o.jurisdiction)) fm.set(o.jurisdiction, new Set());
    for (const f of o.families) {
      bump(byFamily, f);
      fm.get(o.jurisdiction)!.add(f);
    }
  }

  let agencies2plus = 0;
  let agencies3plus = 0;
  for (const id of agenciesCovered) {
    const fams = new Set<string>();
    for (const set of agencyFamiliesByState.get(id)?.values() ?? []) {
      for (const f of set) fams.add(f);
    }
    if (fams.size >= 2) agencies2plus += 1;
    if (fams.size >= 3) agencies3plus += 1;
  }

  let loaIn1State = 0;
  let loaIn2plusStates = 0;
  let sameFamilyMultiState = 0;
  let differentFamiliesAcrossStates = 0;
  for (const [id, states] of agencyStates) {
    if (states.size === 1) loaIn1State += 1;
    if (states.size >= 2) {
      loaIn2plusStates += 1;
      const perState = agencyFamiliesByState.get(id)!;
      const all = [...perState.values()];
      const intersection = new Set(all[0]);
      for (const s of all.slice(1)) {
        for (const f of [...intersection]) {
          if (!s.has(f)) intersection.delete(f);
        }
      }
      if (intersection.size > 0) sameFamilyMultiState += 1;
      const union = new Set<string>();
      for (const s of all) for (const f of s) union.add(f);
      let differs = false;
      for (const s of all) {
        if (s.size !== union.size) differs = true;
      }
      if (differs) differentFamiliesAcrossStates += 1;
    }
  }

  let existingKeys = new Set<string>();
  {
    const rows = await fetchAll<{
      credential_id: string | null;
      source_dataset: string;
      official_text: string;
    }>(sb, 'loa_observations', 'credential_id,source_dataset,official_text');
    for (const r of rows) {
      if (!r.credential_id) continue;
      existingKeys.add(observationKey(r.credential_id, r.source_dataset, r.official_text));
    }
  }
  const toInsert = list.filter(
    (o) => !existingKeys.has(observationKey(o.credential_id, o.source_dataset, o.official_text))
  );

  const withDatesOrStatus = list.filter((o) => o.loa_status !== 'UNKNOWN').length;

  const summary = {
    task: 'INS-NAT-009',
    execute,
    baseline,
    fingerprint,
    graphAgenciesExamined: agenciesExamined.size,
    credentialsExamined: credentialsExamined.size,
    credentialsWithLoaData: credsCovered.size,
    predictedLoaObservations: list.length,
    observationsByState: byState,
    observationsByFamily: byFamily,
    observationsByOfficialTerm: byOfficial,
    observationsByStatus: byStatus,
    observationsWithDatesOrNonUnknownStatus: withDatesOrStatus,
    reviewRequired,
    unresolved,
    malformed,
    skippedNoLineage,
    skipReasons,
    agenciesCovered: agenciesCovered.size,
    credentialsCovered: credsCovered.size,
    agenciesWith2PlusFamilies: agencies2plus,
    agenciesWith3PlusFamilies: agencies3plus,
    multiState: {
      loaIn1State,
      loaIn2plusStates,
      sameFamilyAcrossStates: sameFamilyMultiState,
      differentFamiliesAcrossStates,
    },
    dryRun: {
      insert: toInsert.length,
      existing: list.length - toInsert.length,
      providerWritesPredicted: 0,
      entityWritesPredicted: 0,
      credentialWritesPredicted: 0,
    },
    sourceAudit,
    nvMs: 'inspected; not attached (no confirmed national identity)',
  };

  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute to write observations.');
    return;
  }

  let inserted = 0;
  let failures = 0;
  let retries = 0;
  const executionLog: Array<Record<string, unknown>> = [];
  const batches = chunk(toInsert, 150);
  for (let i = 0; i < batches.length; i += 1) {
    const part = batches[i]!;
    const payload = part.map((o) => ({
      entity_id: o.entity_id,
      credential_id: o.credential_id,
      official_text: o.official_text,
      official_code: o.official_code,
      loa_status: o.loa_status,
      source_dataset: o.source_dataset,
      regulator: o.regulator,
      source_observed_at: o.source_observed_at,
      consumer_group: o.consumer_group,
    }));
    const { data, error } = await sb.from('loa_observations').insert(payload).select('id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        retries += 1;
        executionLog.push({ batch: i, duplicate: true, n: part.length });
        continue;
      }
      failures += 1;
      executionLog.push({ batch: i, error: error.message, n: part.length });
      console.error('insert fail', error.message);
      writeFileSync(
        resolve(OUTDIR, 'execution.json'),
        JSON.stringify({ failures, retries, inserted, executionLog }, null, 2)
      );
      process.exit(1);
    }
    inserted += data?.length ?? 0;
  }

  const after = {
    executed: true,
    batches: batches.length,
    insertedThisRun: inserted,
    failures,
    retries,
    loa_observations: await count(sb, 'loa_observations'),
    agencies: await count(sb, 'national_entities', ['entity_kind', 'agency']),
    credentials: await count(sb, 'license_credentials'),
    carriers: await count(sb, 'national_entities', ['entity_kind', 'carrier']),
    contacts: await count(sb, 'contact_observations'),
    appointments: await count(sb, 'national_relationships'),
    providers: await count(sb, 'providers'),
    fingerprint,
  };
  writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(after, null, 2));
  console.log(JSON.stringify(after, null, 2));
  if (after.providers !== 170499) {
    console.error('providers changed');
    process.exit(1);
  }
  if (after.agencies !== baseline.agencies || after.credentials !== baseline.credentials) {
    console.error('entity or credential counts changed');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
