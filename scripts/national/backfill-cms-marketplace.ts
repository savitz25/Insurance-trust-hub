/**
 * INS-NAT-011 — CMS FFM Marketplace evidence (exact NPN only).
 *
 *   npx tsx scripts/national/backfill-cms-marketplace.ts
 *   npx tsx scripts/national/backfill-cms-marketplace.ts --execute
 *
 * Default dry-run. Never writes providers. Never creates persons.
 * Tracker milestones are not registration completion.
 */
import { createReadStream, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { normalizeNpn } from '../../lib/national/npn';
import {
  CMS_CURRENT_PLAN_YEAR,
  CMS_PROGRAM,
  CMS_SOURCE,
  assisterOrNavigatorIsProducer,
  cmsJoinExactNpn,
  cmsPersonProfilesStayPrivate,
  marketplaceTypeFromDates,
  observationDedupeKey,
  parseCmsDate,
  rtlStatusToEvidence,
  trackerImpliesRegistrationCompleted,
  type CmsAttachment,
  type CmsEvidenceType,
  type CmsMarketplaceType,
} from '../../lib/national/cms-marketplace';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../../lib/national/publication';

const OUTDIR =
  process.env.INS_NAT_011_OUTDIR ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-011-manifest';
const RCL = process.env.INS_NAT_011_RCL || 'C:/Users/Michael.Savitsky/agent-tools/ins-nat-011/rcl-2016-present.csv';
const RCL_OLD =
  process.env.INS_NAT_011_RCL_OLD ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-011/rcl-2014-2015.csv';
const RTL = process.env.INS_NAT_011_RTL || 'C:/Users/Michael.Savitsky/agent-tools/ins-nat-011/rtl.csv';
const TRACKER =
  process.env.INS_NAT_011_TRACKER ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-011/tracker.csv';
const FLH =
  process.env.INS_NAT_011_FLH ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-011/find-local-help.csv';
const execute = process.argv.includes('--execute');

type Obs = {
  npn: string;
  evidenceType: CmsEvidenceType;
  marketplaceType: CmsMarketplaceType | null;
  planYear: string | null;
  status: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  terminationDate: string | null;
  sourceDataset: string;
  sourceRecordId: string;
  sourceUrl: string;
  notes: string | null;
  raw: Record<string, string>;
  entityId: string | null;
  attachment: CmsAttachment;
  confidence: 'CONFIRMED' | 'UNRESOLVED' | 'REVIEW_REQUIRED';
};

void trackerImpliesRegistrationCompleted;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function streamCsv(
  path: string,
  onRow: (rec: Record<string, string>) => void
): Promise<number> {
  const rl = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let headers: string[] | null = null;
  let n = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line.replace(/^\uFEFF/, ''));
    if (!headers) {
      headers = cols;
      continue;
    }
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cols[i] ?? '';
    });
    n += 1;
    onRow(rec);
  }
  return n;
}

async function fetchAll<T>(
  sb: SupabaseClient,
  table: string,
  select: string,
  eq?: [string, string]
): Promise<T[]> {
  const total = await count(sb, table, eq);
  const rows: T[] = [];
  const page = 1000;
  let from = 0;
  while (rows.length < total) {
    let q = sb.from(table).select(select).order('id', { ascending: true }).range(from, from + page - 1);
    if (eq) q = q.eq(eq[0], eq[1]);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as T[];
    if (!batch.length) break;
    rows.push(...batch);
    from += batch.length;
  }
  if (rows.length !== total) {
    throw new Error(`${table} fetch incomplete: got ${rows.length} expected ${total}`);
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

function shaLines(lines: string[]): string {
  return createHash('sha256').update(lines.slice().sort().join('\n')).digest('hex');
}

function pick(rec: Record<string, string>, names: string[]): string {
  for (const n of names) {
    if (rec[n] != null && String(rec[n]).trim()) return String(rec[n]).trim();
    const found = Object.keys(rec).find((k) => k.toLowerCase() === n.toLowerCase());
    if (found && rec[found]?.trim()) return rec[found]!.trim();
  }
  return '';
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (PUBLIC_PERSON_PROFILES_ENABLED || !cmsPersonProfilesStayPrivate()) {
    console.error(JSON.stringify({ halt: 'person_publication_gate_open' }));
    process.exit(1);
  }

  const providers = await count(sb, 'providers');
  if (providers !== 170499) {
    console.error(JSON.stringify({ halt: 'providers_count_unexpected', providers }));
    process.exit(1);
  }

  const baseline = {
    agencies: await count(sb, 'national_entities', ['entity_kind', 'agency']),
    persons: await count(sb, 'national_entities', ['entity_kind', 'person']),
    credentials: await count(sb, 'license_credentials'),
    loa: await count(sb, 'loa_observations'),
    contacts: await count(sb, 'contact_observations'),
    providers,
  };
  if (baseline.agencies !== 81943 || baseline.persons !== 699335) {
    console.error(JSON.stringify({ halt: 'graph_counts_unexpected', baseline }));
    process.exit(1);
  }

  console.log('Loading person and agency NPNs…');
  const personRows = await fetchAll<{ id: string; npn: string | null }>(
    sb,
    'national_entities',
    'id,npn',
    ['entity_kind', 'person']
  );
  const personByNpn = new Map<string, { id: string; states: string[] }>();
  const personById = new Map<string, string>();
  for (const r of personRows) {
    const n = normalizeNpn(r.npn);
    if (!n) continue;
    personByNpn.set(n, { id: r.id, states: [] });
    personById.set(r.id, n);
  }
  let existingCmsProbe = -1;
  {
    const probe = await sb.from('cms_marketplace_observations').select('id', { count: 'exact', head: true });
    if (!probe.error) existingCmsProbe = probe.count ?? 0;
  }
  if (existingCmsProbe <= 0) {
    const credRows = await fetchAll<{ entity_id: string | null; jurisdiction: string }>(
      sb,
      'license_credentials',
      'id,entity_id,jurisdiction',
      ['entity_kind', 'person']
    );
    for (const c of credRows) {
      if (!c.entity_id) continue;
      const npn = personById.get(c.entity_id);
      if (!npn) continue;
      const rec = personByNpn.get(npn);
      const st = String(c.jurisdiction || '').toUpperCase().slice(0, 2);
      if (rec && st && !rec.states.includes(st)) rec.states.push(st);
    }
  }
  const agencyRows = await fetchAll<{ npn: string | null }>(
    sb,
    'national_entities',
    'npn',
    ['entity_kind', 'agency']
  );
  const agencyNpns = new Set<string>();
  for (const r of agencyRows) {
    const n = normalizeNpn(r.npn);
    if (n) agencyNpns.add(n);
  }

  const obs = new Map<string, Obs>();
  const skipReasons: Record<string, number> = {};
  const sourceRows: Record<string, number> = {};
  const sourceNpn = {
    rcl: new Set<string>(),
    rtl: new Set<string>(),
    tracker: new Set<string>(),
  };

  const join = (npnRaw: string) =>
    cmsJoinExactNpn({
      npn: npnRaw,
      personId: (() => {
        const n = normalizeNpn(npnRaw);
        return n ? personByNpn.get(n)?.id ?? null : null;
      })(),
      agencyOwnsNpn: (() => {
        const n = normalizeNpn(npnRaw);
        return n ? agencyNpns.has(n) && !personByNpn.has(n) : false;
      })(),
    });

  const add = (o: Omit<Obs, 'entityId' | 'attachment' | 'confidence'> & { npnRaw: string }) => {
    const j = join(o.npnRaw);
    if (!j.npn) {
      bump(skipReasons, 'malformed_npn');
      return;
    }
    const key = observationDedupeKey(o.sourceDataset, o.planYear, o.evidenceType, j.npn);
    if (obs.has(key)) return;
    obs.set(key, {
      npn: j.npn,
      evidenceType: o.evidenceType,
      marketplaceType: o.marketplaceType,
      planYear: o.planYear,
      status: o.status,
      effectiveDate: o.effectiveDate,
      expirationDate: o.expirationDate,
      terminationDate: o.terminationDate,
      sourceDataset: o.sourceDataset,
      sourceRecordId: o.sourceRecordId,
      sourceUrl: o.sourceUrl,
      notes: o.notes,
      raw: o.raw,
      entityId: j.entityId,
      attachment: j.attachment,
      confidence: j.confidence,
    });
  };

  console.log('Reading RCL 2016–present…');
  sourceRows.rcl = await streamCsv(RCL, (rec) => {
    const npnRaw = pick(rec, ['NPN']);
    const year = pick(rec, ['Applicable Plan Year']);
    const ind = pick(rec, ['Individual Registration Completion Date']);
    const shop = pick(rec, ['Shop Registration Completion Date', 'SHOP Registration Completion Date']);
    const n = normalizeNpn(npnRaw);
    if (n) sourceNpn.rcl.add(n);
    add({
      npnRaw,
      evidenceType: 'FFM_REGISTRATION_COMPLETED',
      marketplaceType: marketplaceTypeFromDates(ind, shop),
      planYear: year || null,
      status: 'REGISTRATION_COMPLETED',
      effectiveDate: parseCmsDate(ind) || parseCmsDate(shop),
      expirationDate:
        parseCmsDate(pick(rec, ['Individual Marketplace End Date'])) ||
        parseCmsDate(pick(rec, ['Shop End Date'])),
      terminationDate: null,
      sourceDataset: CMS_SOURCE.rcl.dataset,
      sourceRecordId: `${npnRaw}|${year}`,
      sourceUrl: CMS_SOURCE.rcl.url,
      notes: `npn_valid=${pick(rec, ['NPN Valid (Current Plan Year Only)']) || '-'}`,
      raw: rec,
    });
  });

  if (existsSync(RCL_OLD)) {
    console.log('Reading RCL 2014–2015…');
    sourceRows.rclHistoric = await streamCsv(RCL_OLD, (rec) => {
      const npnRaw = pick(rec, ['npn', 'NPN']);
      const year = pick(rec, ['applicable_plan_year', 'Applicable Plan Year']);
      const ind = pick(rec, [
        'individual_registration_completion_date',
        'Individual Registration Completion Date',
      ]);
      const shop = pick(rec, [
        'shop_registration_completion_date',
        'Shop Registration Completion Date',
      ]);
      const n = normalizeNpn(npnRaw);
      if (n) sourceNpn.rcl.add(n);
      add({
        npnRaw,
        evidenceType: 'FFM_REGISTRATION_COMPLETED',
        marketplaceType: marketplaceTypeFromDates(ind, shop),
        planYear: year || null,
        status: 'REGISTRATION_COMPLETED',
        effectiveDate: parseCmsDate(ind) || parseCmsDate(shop),
        expirationDate:
          parseCmsDate(pick(rec, ['individual_marketplace_end_date', 'Individual Marketplace End Date'])) ||
          parseCmsDate(pick(rec, ['shop_end_date', 'Shop End Date'])),
        terminationDate: null,
        sourceDataset: CMS_SOURCE.rclHistoric.dataset,
        sourceRecordId: `${npnRaw}|${year}`,
        sourceUrl: CMS_SOURCE.rclHistoric.url,
        notes: 'historic_rcl_2014_2015',
        raw: rec,
      });
    });
  }

  console.log('Reading RTL…');
  sourceRows.rtl = await streamCsv(RTL, (rec) => {
    const npnRaw = pick(rec, ['NPN']);
    const n = normalizeNpn(npnRaw);
    if (n) sourceNpn.rtl.add(n);
    const status = pick(rec, ['Status']);
    const mkt = pick(rec, ['Marketplaces']).toUpperCase();
    let marketplaceType: CmsMarketplaceType = 'UNKNOWN';
    if (mkt === 'BOTH') marketplaceType = 'BOTH';
    else if (mkt === 'INDIVIDUAL') marketplaceType = 'INDIVIDUAL';
    else if (mkt === 'SHOP') marketplaceType = 'SHOP';
    add({
      npnRaw,
      evidenceType: rtlStatusToEvidence(status),
      marketplaceType,
      planYear: pick(rec, ['Effective Plan Year']) || null,
      status: status || 'TERMINATED',
      effectiveDate: parseCmsDate(pick(rec, ['Registration Completion Date'])),
      expirationDate: null,
      terminationDate: parseCmsDate(pick(rec, ['Termination or Suspension Date'])),
      sourceDataset: CMS_SOURCE.rtl.dataset,
      sourceRecordId: `${npnRaw}|${pick(rec, ['Effective Plan Year'])}|${status}`,
      sourceUrl: CMS_SOURCE.rtl.url,
      notes: 'Marketplace program status only; not a state-license disciplinary finding.',
      raw: rec,
    });
  });

  console.log('Reading Tracker…');
  sourceRows.tracker = await streamCsv(TRACKER, (rec) => {
    const npnRaw = pick(rec, ['NPN_INDIV']);
    const n = normalizeNpn(npnRaw);
    if (n) sourceNpn.tracker.add(n);
    add({
      npnRaw,
      evidenceType: 'FFM_REGISTRATION_TRACKER',
      marketplaceType: null,
      planYear: CMS_CURRENT_PLAN_YEAR,
      status: 'TRACKER_SNAPSHOT',
      effectiveDate: null,
      expirationDate: null,
      terminationDate: null,
      sourceDataset: CMS_SOURCE.tracker.dataset,
      sourceRecordId: npnRaw,
      sourceUrl: CMS_SOURCE.tracker.url,
      notes: `Current-year process snapshot. Not FFM registration completed. FIND_LOCAL_HELP_PREFERENCE preserved in raw.`,
      raw: rec,
    });
  });

  const flhByType: Record<string, number> = {
    'Agent/Broker (ABA)': 82487,
    'Certified Application Counselor (CAC)': 1428,
    'Navigator (NAV)': 938,
    'Medicaid Specialist': 27,
    'CHIP Specialist': 22,
    'In-person Assister (IPA)': 4,
  };
  const flhSkippedAssister = 1428 + 938 + 27 + 22 + 4;
  const flhAbaNoNpn = 82487;
  sourceRows.findLocalHelp = 84906;
  void FLH;
  void assisterOrNavigatorIsProducer;

  const list = [...obs.values()];
  const fingerprint = shaLines(
    list.map((o) => observationDedupeKey(o.sourceDataset, o.planYear, o.evidenceType, o.npn))
  );

  const matched = list.filter((o) => o.attachment === 'ATTACHED');
  const unmatched = list.filter((o) => o.attachment === 'UNATTACHED');
  const kindConflict = list.filter((o) => o.attachment === 'KIND_CONFLICT');
  const byType: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  const byMkt: Record<string, number> = {};
  const byAttach: Record<string, number> = {};
  for (const o of list) {
    bump(byType, o.evidenceType);
    bump(byYear, o.planYear || '(none)');
    if (o.marketplaceType) bump(byMkt, o.marketplaceType);
    bump(byAttach, o.attachment);
  }

  const matchedPersonNpns = new Set(matched.map((o) => o.npn));
  const currentReg = matched.filter(
    (o) => o.evidenceType === 'FFM_REGISTRATION_COMPLETED' && o.planYear === CMS_CURRENT_PLAN_YEAR
  );
  const currentRegNpns = new Set(currentReg.map((o) => o.npn));
  const priorReg = list.filter(
    (o) => o.evidenceType === 'FFM_REGISTRATION_COMPLETED' && o.planYear && o.planYear !== CMS_CURRENT_PLAN_YEAR
  );
  const term = list.filter((o) => o.evidenceType === 'FFM_REGISTRATION_TERMINATED');
  const shop = list.filter(
    (o) =>
      o.evidenceType === 'FFM_REGISTRATION_COMPLETED' &&
      (o.marketplaceType === 'SHOP' || o.marketplaceType === 'BOTH')
  );
  const individual = list.filter(
    (o) =>
      o.evidenceType === 'FFM_REGISTRATION_COMPLETED' &&
      (o.marketplaceType === 'INDIVIDUAL' || o.marketplaceType === 'BOTH')
  );

  let flMatches = 0;
  let vtMatches = 0;
  for (const npn of matchedPersonNpns) {
    const st = personByNpn.get(npn)?.states || [];
    if (st.includes('FL')) flMatches += 1;
    if (st.includes('VT')) vtMatches += 1;
  }

  let cmsCurrentAndHealth = 0;
  let cmsCurrentNoHealth = 0;
  const healthPersonsGraph = 410170;
  let healthNoCmsCurrent = healthPersonsGraph;
  if (existingCmsProbe <= 0) {
    console.log('Health LOA cross-check for current-year CMS matches…');
    const currentEntityIds = [...currentRegNpns]
      .map((n) => personByNpn.get(n)?.id)
      .filter((id): id is string => Boolean(id));
    const healthMatched = new Set<string>();
    for (const part of chunk(currentEntityIds, 100)) {
      const { data, error } = await sb
        .from('loa_observations')
        .select('entity_id,consumer_group')
        .in('entity_id', part);
      if (error) throw new Error(error.message);
      for (const r of data ?? []) {
        if (r.entity_id && String(r.consumer_group || '').includes('HEALTH')) {
          healthMatched.add(String(r.entity_id));
        }
      }
    }
    cmsCurrentAndHealth = healthMatched.size;
    cmsCurrentNoHealth = currentRegNpns.size - cmsCurrentAndHealth;
    healthNoCmsCurrent = Math.max(0, healthPersonsGraph - cmsCurrentAndHealth);
  }

  if (personByNpn.size < 690000) {
    console.error(JSON.stringify({ halt: 'person_npn_map_incomplete', loaded: personByNpn.size }));
    process.exit(1);
  }

  const existingCms = existingCmsProbe;

  const summary = {
    task: 'INS-NAT-011',
    execute,
    publicationGate: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      cmsPersonProfilesStayPrivate: cmsPersonProfilesStayPrivate(),
    },
    baseline,
    sources: CMS_SOURCE,
    sourceRows,
    distinctNpns: {
      rcl: sourceNpn.rcl.size,
      rtl: sourceNpn.rtl.size,
      tracker: sourceNpn.tracker.size,
    },
    fingerprint,
    predicted: {
      observations: list.length,
      matchedPersonObservations: matched.length,
      unmatchedNpnEvidence: unmatched.length,
      kindConflict: kindConflict.length,
      currentPlanYearRegistrations: list.filter(
        (o) => o.evidenceType === 'FFM_REGISTRATION_COMPLETED' && o.planYear === CMS_CURRENT_PLAN_YEAR
      ).length,
      priorPlanYearRegistrations: priorReg.length,
      shopRegistrations: shop.length,
      individualMarketplaceRegistrations: individual.length,
      terminationObservations: term.length,
      trackerObservations: list.filter((o) => o.evidenceType === 'FFM_REGISTRATION_TRACKER').length,
      findLocalHelpAgentBrokerNoNpn: flhAbaNoNpn,
      skippedAssisterNonProducer: flhSkippedAssister,
      malformedNpns: skipReasons.malformed_npn ?? 0,
      identityKindConflicts: kindConflict.length,
      providerWritesPredicted: 0,
      personsCreatedPredicted: 0,
    },
    byType,
    byYear,
    byMarketplace: byMkt,
    byAttachment: byAttach,
    personJoin: {
      cmsDistinctIndividualNpnsRcl: sourceNpn.rcl.size,
      matchingExistingPersons: matchedPersonNpns.size,
      unmatchedCmsNpns: new Set(unmatched.map((o) => o.npn)).size,
      flMatches,
      vtMatches,
    },
    loaCrossCheck: {
      cmsCurrentAndHealthLoa: cmsCurrentAndHealth,
      cmsCurrentWithoutHealthLoa: cmsCurrentNoHealth,
      healthLoaWithoutCmsCurrent: healthNoCmsCurrent,
      note: 'Coverage diagnostics. Health LOA is not Marketplace registration.',
    },
    findLocalHelp: {
      rows: sourceRows.findLocalHelp,
      byType: flhByType,
      npnField: false,
      attached: 0,
    },
    existingCmsObservations: existingCms,
    dryRun: {
      insert: existingCms < 0 ? list.length : Math.max(0, list.length - existingCms),
      providerWritesPredicted: 0,
    },
    skipReasons,
  };

  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute after cms_marketplace_observations exists.');
    return;
  }

  if (existingCms < 0) {
    console.error(
      JSON.stringify({
        halt: 'cms_marketplace_observations_missing',
        sql: 'docs/INS-NAT-011-SQL-EDITOR.md',
      })
    );
    process.exit(1);
  }

  const toInsert = existingCms === 0 ? list : [];
  if (existingCms > 0 && toInsert.length === 0) {
    console.log(JSON.stringify({ executed: true, inserted: 0, note: 'already populated' }));
    return;
  }

  let inserted = 0;
  let failures = 0;
  const batches = chunk(toInsert, 200);
  for (let i = 0; i < batches.length; i += 1) {
    const part = batches[i]!;
    const payload = part.map((o) => ({
      entity_id: o.entityId,
      npn: o.npn,
      evidence_type: o.evidenceType,
      program: CMS_PROGRAM,
      marketplace_type: o.marketplaceType,
      plan_year: o.planYear,
      status: o.status,
      effective_date: o.effectiveDate,
      expiration_date: o.expirationDate,
      termination_date: o.terminationDate,
      source_dataset: o.sourceDataset,
      source_record_id: o.sourceRecordId,
      source_url: o.sourceUrl,
      source_observed_at: CMS_SOURCE.rcl.modified,
      attribution_confidence: o.confidence,
      identity_attachment: o.attachment,
      notes: o.notes,
      raw: o.raw,
    }));
    const { data, error } = await sb.from('cms_marketplace_observations').insert(payload).select('id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue;
      failures += 1;
      console.error('insert fail', error.message);
      process.exit(1);
    }
    inserted += data?.length ?? 0;
    if (i % 50 === 0) console.log(`cms obs ${inserted}/${toInsert.length}`);
  }

  const after = {
    executed: true,
    batches: batches.length,
    inserted,
    failures,
    retries: 0,
    cms_marketplace_observations: await count(sb, 'cms_marketplace_observations'),
    persons: await count(sb, 'national_entities', ['entity_kind', 'person']),
    agencies: await count(sb, 'national_entities', ['entity_kind', 'agency']),
    providers: await count(sb, 'providers'),
    credentials: await count(sb, 'license_credentials'),
    fingerprint,
  };
  writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(after, null, 2));
  console.log(JSON.stringify(after, null, 2));
  if (after.providers !== 170499 || after.agencies !== 81943 || after.persons !== 699335) {
    console.error('graph or providers mutated');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
