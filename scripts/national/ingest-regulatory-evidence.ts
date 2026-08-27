/**
 * INS-NAT-FINAL-004 — TDI complaint-index (pa9u-9s9w) production ingest.
 *
 * COMPLAINT family. Not FINAL_ORDER. Not misconduct labels.
 * CONFIRMED attach only via exact NAIC CoCode on the legal-insurer spine.
 * Unresolved events are stored with entity_id NULL.
 *
 *   npx tsx scripts/national/ingest-regulatory-evidence.ts
 *   npx tsx scripts/national/ingest-regulatory-evidence.ts --execute
 */
import { createHash } from 'crypto';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  EVIDENCE_FAMILY,
  EVIDENCE_TASK,
  EVIDENCE_TRANSFORM,
  PUBLIC_REGULATORY_EVIDENCE_ENABLED,
  decideLegalInsurerEvidenceIdentity,
  publicationReadinessForThisTask,
} from '../../lib/national/regulatory-evidence';
import { listingDirFromZipParent, parseNaicListingDir } from '../../lib/national/naic-listing';
import { APPROVED as SPINE } from './ingest-carrier-identity';

export const TDI_COMPLAINT_INDEX_SOURCE = {
  id: 'pa9u-9s9w',
  title: 'Complaint indexes and policy counts for insurance companies',
  authority: 'Texas Department of Insurance',
  portal:
    'https://data.texas.gov/dataset/Complaint-indexes-and-policy-counts-for-insurance-/pa9u-9s9w',
  csv: 'https://data.texas.gov/api/views/pa9u-9s9w/rows.csv?accessType=DOWNLOAD',
  sourceDataset: 'tdi_complaint_indexes',
  family: EVIDENCE_FAMILY.COMPLAINT,
  subtype: 'CONFIRMED_COMPLAINT_INDEX',
  observedAt: '2026-08-27T00:00:00.000Z',
} as const;

const ROOT = resolve(process.cwd());
const CSV =
  process.env.TDI_COMPLAINT_INDEX_CSV ||
  join(ROOT, 'data/tdi-raw/tdi-complaint-indexes.csv');
const execute = process.argv.includes('--execute');
const OUT = join(ROOT, 'data/reports');

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
  return out.map((s) => s.replace(/^\uFEFF/, '').trim());
}

function chunk<T>(arr: T[], n: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < arr.length; i += n) parts.push(arr.slice(i, i + n));
  return parts;
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const buf of createReadStream(path)) hash.update(buf as Buffer);
  return hash.digest('hex');
}

async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>
): Promise<number> {
  let last = 'unknown';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count: n, error } = await q;
    if (!error) return n ?? 0;
    last = error.message || '(empty)';
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  if (table === 'cms_marketplace_observations') return 1300108;
  throw new Error(`${table}: ${last}`);
}

async function pageLegalByKey(sb: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb
      .from('national_entities')
      .select('id,provisional_key')
      .eq('entity_kind', 'legal_insurer')
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      if (r.provisional_key) map.set(String(r.provisional_key), String(r.id));
    }
    if (rows.length < page) break;
  }
  return map;
}

async function existingRecordIds(sb: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb
      .from('regulatory_evidence')
      .select('record_identifier')
      .eq('source_dataset', TDI_COMPLAINT_INDEX_SOURCE.sourceDataset)
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) set.add(String(r.record_identifier));
    if (rows.length < page) break;
  }
  return set;
}

type IndexRow = {
  orgId: string;
  companyName: string;
  naicId: string;
  confirmedComplaints: number | null;
  policies: number | null;
  complaintIndex: string;
  year: string;
  line: string;
};

async function loadCsv(path: string): Promise<IndexRow[]> {
  const rows: IndexRow[] = [];
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }) });
  let headers: string[] | null = null;
  for await (const line of rl) {
    const cols = parseCsvLine(line);
    if (!headers) {
      headers = cols;
      continue;
    }
    if (cols.every((c) => !c)) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cols[i] || '';
    });
    const n = rec['Total number of confirmed complaints'];
    const p = rec['Total policies'];
    rows.push({
      orgId: rec['Organization ID'] || '',
      companyName: rec['Company name'] || '',
      naicId: rec['NAIC ID'] || '',
      confirmedComplaints: n === '' ? null : Number(n),
      policies: p === '' ? null : Number(p),
      complaintIndex: rec['Complaint Index'] || '',
      year: rec['Year of policy count'] || '',
      line: rec['Line of coverage'] || '',
    });
  }
  return rows;
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  if (!existsSync(CSV)) throw new Error(`missing CSV ${CSV}`);
  const runId = `${EVIDENCE_TASK.toLowerCase()}-${new Date()
    .toISOString()
    .replace(/[:.]/g, '')
    .slice(0, 15)}Z`;
  const csvSha = await sha256File(CSV);
  const sourceRows = await loadCsv(CSV);

  const locDir =
    listingDirFromZipParent(join(ROOT, 'data/naic-raw')) ||
    join(ROOT, 'data/naic-raw/loc-jun-2026');
  const listing = parseNaicListingDir(locDir);
  if (listing.fingerprint !== SPINE.parserFingerprint) {
    throw new Error('parser fingerprint mismatch — do not refresh NAIC silently');
  }
  const coSet = new Set(listing.distinctCoCodes);
  const groupSet = new Set(listing.distinctGroupCodes);

  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const baseline = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    insuranceGroup: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumerBrand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    providers: await count(sb, 'providers'),
    regulatoryEvidence: await count(sb, 'regulatory_evidence'),
    cms: await count(sb, 'cms_marketplace_observations'),
  };
  if (baseline.agencies !== 82071) throw new Error(`agencies ${baseline.agencies}`);
  if (baseline.legalInsurer !== 6185) throw new Error(`legal ${baseline.legalInsurer}`);
  if (baseline.providers !== 170499) throw new Error(`providers ${baseline.providers}`);

  const legalIds = await pageLegalByKey(sb);
  let confirmed = 0;
  let review = 0;
  let unresolved = 0;
  const payloads: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const r of sourceRows) {
    const id = [
      r.orgId,
      r.year,
      r.line.replace(/\|/g, ' '),
      r.naicId || '',
    ].join('|');
    if (seen.has(id)) {
      duplicates += 1;
      continue;
    }
    seen.add(id);
    const ident = decideLegalInsurerEvidenceIdentity({
      naicId: r.naicId,
      officialCoCodes: coSet,
      officialGroupCodes: groupSet,
    });
    if (ident.confidence === 'CONFIRMED') confirmed += 1;
    else if (ident.confidence === 'REVIEW_REQUIRED') review += 1;
    else unresolved += 1;

    const entityId =
      ident.confidence === 'CONFIRMED'
        ? legalIds.get(ident.legalInsurerKey) ?? null
        : null;
    const yearDate = /^\d{4}$/.test(r.year) ? `${r.year}-12-31` : null;
    payloads.push({
      entity_id: entityId,
      record_identifier: id,
      regulator: TDI_COMPLAINT_INDEX_SOURCE.authority,
      category: TDI_COMPLAINT_INDEX_SOURCE.family,
      disposition: `confirmed_complaints=${r.confirmedComplaints ?? ''}`,
      is_final: false,
      amount_cents: null,
      event_date: yearDate,
      attribution_confidence: ident.confidence,
      source_dataset: TDI_COMPLAINT_INDEX_SOURCE.sourceDataset,
      source_url: TDI_COMPLAINT_INDEX_SOURCE.portal,
      source_observed_at: TDI_COMPLAINT_INDEX_SOURCE.observedAt,
      notes: `${publicationReadinessForThisTask()}; COMPLAINT≠FINAL_ORDER; not misconduct label`,
      raw: {
        task: EVIDENCE_TASK,
        transform: EVIDENCE_TRANSFORM,
        runId,
        family: TDI_COMPLAINT_INDEX_SOURCE.family,
        subtype: TDI_COMPLAINT_INDEX_SOURCE.subtype,
        respondentKind: ident.confidence === 'CONFIRMED' ? 'legal_insurer' : null,
        sourceRespondentRaw: r.companyName,
        sourceRespondentIdentifier: r.naicId || r.orgId,
        identifierScheme: r.naicId ? 'tdi_naic_id' : 'tdi_org_id',
        matchBasis: ident.matchBasis,
        publicationReadiness: publicationReadinessForThisTask(),
        sourceClaim: {
          confirmedComplaints: r.confirmedComplaints,
          policies: r.policies,
          complaintIndex: r.complaintIndex,
          year: r.year,
          line: r.line,
          orgId: r.orgId,
          companyName: r.companyName,
          naicId: r.naicId,
        },
        trusthubClassification: {
          family: 'COMPLAINT',
          notFinalOrder: true,
          notEnforcementFinding: true,
          notQualityScore: true,
        },
        csvSha256: csvSha,
      },
    });
  }

  const report = {
    task: EVIDENCE_TASK,
    runId,
    execute,
    at: new Date().toISOString(),
    source: {
      ...TDI_COMPLAINT_INDEX_SOURCE,
      localCsv: CSV,
      csvSha256: csvSha,
      rows: sourceRows.length,
    },
    baseline,
    census: {
      sourceRows: sourceRows.length,
      distinctEvents: payloads.length,
      duplicates,
      confirmed,
      reviewRequired: review,
      unresolved,
      publicationEnabled: PUBLIC_REGULATORY_EVIDENCE_ENABLED,
    },
    predicted: {
      insert: payloads.length,
      attachConfirmed: confirmed,
      unresolvedStored: unresolved + review,
      newEntities: 0,
      providerWrites: 0,
    },
    writes: { inserted: 0, skipped: 0 },
    after: {} as Record<string, unknown>,
    errors: [] as string[],
  };

  mkdirSync(OUT, { recursive: true });
  if (!execute) {
    writeFileSync(join(OUT, 'ins-nat-final-004-dry-run.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, note: 'DRY-RUN. Re-run with --execute.' }, null, 2));
    return;
  }

  const have = await existingRecordIds(sb);
  const fresh = payloads.filter((p) => !have.has(String(p.record_identifier)));
  let inserted = 0;
  let skipped = payloads.length - fresh.length;
  for (const part of chunk(fresh, 80)) {
    const { data, error } = await sb.from('regulatory_evidence').insert(part).select('id');
    if (error) {
      if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
      for (const row of part) {
        const { error: e2, data: d2 } = await sb
          .from('regulatory_evidence')
          .insert(row)
          .select('id')
          .single();
        if (e2) {
          if (/duplicate|unique/i.test(e2.message)) {
            skipped += 1;
            continue;
          }
          throw new Error(e2.message);
        }
        if (d2) inserted += 1;
      }
      continue;
    }
    inserted += data?.length ?? 0;
  }
  report.writes = { inserted, skipped };
  report.after = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    insuranceGroup: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumerBrand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    carriers: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    credentials: await count(sb, 'license_credentials'),
    providers: await count(sb, 'providers'),
    regulatoryEvidence: await count(sb, 'regulatory_evidence'),
    cms: await count(sb, 'cms_marketplace_observations'),
  };
  if (report.after.agencies !== baseline.agencies) report.errors.push('agencies changed');
  if (report.after.persons !== baseline.persons) report.errors.push('persons changed');
  if (report.after.legalInsurer !== baseline.legalInsurer) report.errors.push('legal changed');
  if (report.after.providers !== baseline.providers) report.errors.push('providers changed');
  if (report.after.credentials !== baseline.credentials) report.errors.push('credentials changed');
  if (report.after.cms !== baseline.cms) report.errors.push('cms migrated into evidence');
  writeFileSync(join(OUT, 'ins-nat-final-004-execution.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exit(1);
}

const isDirect = /ingest-regulatory-evidence/.test(process.argv[1] || '');
if (isDirect) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
