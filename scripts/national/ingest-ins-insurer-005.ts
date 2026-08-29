/**
 * INS-INSURER-005 — ingest exact examination relationships.
 *
 *   npx tsx scripts/national/ingest-ins-insurer-005.ts
 *   npx tsx scripts/national/ingest-ins-insurer-005.ts --execute
 *
 * Identity writes = 0. TDI rows untouched. Second --execute inserts 0.
 */
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { EXAMINATION_FAMILY } from '../../lib/national/legal-insurer-examination';
import {
  ATTACHMENT_METHOD,
  EXAM_DATASETS,
  FARMERS_DOCUMENT_HASH,
  FARMERS_EXACT_COCODES,
  INS_INSURER_005_IDENTITY_WRITES,
  NON_CANONICAL_FIVE_DIGIT,
  PUBLIC_EXAM_COPY,
  classifyExamRelationshipPublicSafe,
  examinationRecordId,
  relationshipRecordId,
} from '../../lib/national/legal-insurer-exam-ingest';

const ROOT = resolve(process.cwd());
const execute = process.argv.includes('--execute');
const OUT = join(ROOT, 'data/reports');
const CA_EXTRACT = join(ROOT, 'data/reports/ins-insurer-004-exam-cocode-extraction.json');
const FL_CENSUS = join(ROOT, 'data/reports/ins-insurer-005-fl-mc-census.json');
const FL_SAMPLE = join(ROOT, 'data/reports/ins-insurer-005-fl-sample.json');
const TASK = 'INS-INSURER-005';
const TRANSFORM = 'ins-insurer-005.v1';

type Examined = {
  source_name: string;
  naic_cocode: string;
  canonical_entity_id: string;
  canonical_name: string;
  evidence_location: string;
  attachment_class: string;
};

type Payload = Record<string, unknown>;

function chunk<T>(arr: T[], n: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < arr.length; i += n) parts.push(arr.slice(i, n + i));
  return parts;
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
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error(`${table}: ${last}`);
}

async function existingIds(sb: SupabaseClient, dataset: string): Promise<Set<string>> {
  const set = new Set<string>();
  let last = '';
  for (;;) {
    let q = sb
      .from('regulatory_evidence')
      .select('record_identifier')
      .eq('source_dataset', dataset)
      .order('record_identifier', { ascending: true })
      .limit(1000);
    if (last) q = q.gt('record_identifier', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const r of rows) set.add(String(r.record_identifier));
    last = String(rows[rows.length - 1]!.record_identifier);
    if (rows.length < 1000) break;
  }
  return set;
}

function examPayload(input: {
  entityId: string;
  cocode: string;
  sourceName: string;
  canonicalName: string;
  regulator: string;
  jurisdiction: string;
  sourceDataset: string;
  family: string;
  classification: 'EXAMINED_ENTITY_EXACT' | 'CONSOLIDATED_EXAM_EXPLICIT';
  reportTitle: string;
  reportDate: string;
  documentUrl: string;
  documentHash: string;
  retrievedAt: string;
  listingTitles: string[];
  evidenceLocation: string;
  consumerSafeDescription: string;
}): Payload | null {
  if (input.cocode === NON_CANONICAL_FIVE_DIGIT) return null;
  const method =
    input.classification === 'CONSOLIDATED_EXAM_EXPLICIT'
      ? ATTACHMENT_METHOD.PDF_NATIVE_COCODE_EXPLICIT_CONSOLIDATED_SCOPE
      : ATTACHMENT_METHOD.PDF_NATIVE_COCODE_EXPLICIT_SUBJECT;
  const publicClass = classifyExamRelationshipPublicSafe({
    classification: input.classification,
    naicCocode: input.cocode,
    spineHasUnique: true,
    officialSourceUrl: input.documentUrl,
    documentHash: input.documentHash,
    examType: input.family as 'FINANCIAL_EXAMINATION' | 'MARKET_CONDUCT_EXAMINATION',
    reportDate: input.reportDate,
    retrievedAt: input.retrievedAt,
    confidentialRequired: false,
    consumerSafeDescription: input.consumerSafeDescription,
  });
  if (publicClass !== 'PUBLIC_SAFE') return null;
  const rid = relationshipRecordId(input.sourceDataset, input.documentHash, input.cocode);
  return {
    entity_id: input.entityId,
    record_identifier: rid,
    regulator: input.regulator,
    category: input.family,
    disposition: 'EXAMINATION_REPORT',
    is_final: true,
    amount_cents: null,
    event_date: input.reportDate,
    attribution_confidence: 'CONFIRMED',
    source_dataset: input.sourceDataset,
    source_url: input.documentUrl,
    source_observed_at: input.reportDate,
    notes: `${publicClass}; exam≠enforcement; exam≠violation; ${PUBLIC_EXAM_COPY.notMisconduct}`,
    evidence_family: input.family,
    evidence_subtype: input.classification,
    respondent_kind: 'legal_insurer',
    source_respondent_raw: input.sourceName,
    source_respondent_identifier: input.cocode,
    identifier_scheme: 'naic_cocode',
    match_basis: method,
    document_url: input.documentUrl,
    document_sha256: input.documentHash,
    publication_readiness: 'READY_FOR_PUBLIC_REVIEW',
    is_current: true,
    source_record_id: examinationRecordId(input.sourceDataset, input.documentHash),
    case_or_order_number: null,
    effective_date: input.reportDate,
    raw: {
      task: TASK,
      transform: TRANSFORM,
      grain: 'legal_insurer_x_examination',
      examinationId: examinationRecordId(input.sourceDataset, input.documentHash),
      document: {
        hash: input.documentHash,
        url: input.documentUrl,
        listingTitles: input.listingTitles,
      },
      examination: {
        family: input.family,
        reportTitle: input.reportTitle,
        reportDate: input.reportDate,
        retrievedAt: input.retrievedAt,
      },
      subjectEvidence: {
        sourceName: input.sourceName,
        canonicalName: input.canonicalName,
        naicCocode: input.cocode,
        location: input.evidenceLocation,
      },
      attachmentMethod: method,
      publicEligibility: publicClass,
      notEnforcement: true,
      notViolation: true,
      consumerSafeDescription: input.consumerSafeDescription,
    },
  };
}

function farmersPayloads(): Payload[] {
  const extract = JSON.parse(readFileSync(CA_EXTRACT, 'utf8'));
  const doc = extract.documents.find(
    (d: { document_hash?: string }) => d.document_hash === FARMERS_DOCUMENT_HASH
  );
  if (!doc) throw new Error('Farmers consolidated document missing from INS-INSURER-004 artifact');
  const examined: Examined[] = doc.examined_entities || [];
  const got = examined.map((e) => e.naic_cocode).sort().join(',');
  const want = [...FARMERS_EXACT_COCODES].slice().sort().join(',');
  if (got !== want) throw new Error(`Farmers CoCodes drifted: ${got} ≠ ${want}`);
  const out: Payload[] = [];
  for (const e of examined) {
    const row = examPayload({
      entityId: e.canonical_entity_id,
      cocode: e.naic_cocode,
      sourceName: e.source_name,
      canonicalName: e.canonical_name,
      regulator: 'California Department of Insurance',
      jurisdiction: 'CA',
      sourceDataset: EXAM_DATASETS.CA_FINANCIAL,
      family: EXAMINATION_FAMILY.FINANCIAL_EXAMINATION,
      classification: 'CONSOLIDATED_EXAM_EXPLICIT',
      reportTitle: 'Farmers Insurance Group Consolidated Examination Report as of 12-31-21',
      reportDate: '2021-12-31',
      documentUrl: doc.document_url,
      documentHash: doc.document_hash,
      retrievedAt: doc.retrieved_at,
      listingTitles: doc.listing_names || [],
      evidenceLocation: e.evidence_location,
      consumerSafeDescription: PUBLIC_EXAM_COPY.caFinancial,
    });
    if (row) out.push(row);
  }
  if (out.length !== 7) throw new Error(`Farmers PUBLIC_SAFE rows ${out.length} ≠ 7`);
  return out;
}

function floridaPayloads(): Payload[] {
  const out: Payload[] = [];
  const seen = new Set<string>();
  const add = (cands: Array<Record<string, unknown>>) => {
    for (const d of cands) {
      if (d.classification !== 'EXAMINED_ENTITY_EXACT') continue;
      const hash = String(d.document_hash || '');
      const url = String(d.document_url || d.url || '');
      const reportDate = String(d.report_date || '');
      const retrievedAt = String(d.retrieved_at || '2026-08-29T21:30:00Z');
      const entities = (d.examined_entities as Examined[]) || (d.canonical_match ? [d.canonical_match as Examined] : []);
      for (const e of entities) {
        if (!e?.naic_cocode || !e.canonical_entity_id) continue;
        const row = examPayload({
          entityId: e.canonical_entity_id,
          cocode: e.naic_cocode,
          sourceName: e.source_name || String(d.subject || d.subject_legal_name || ''),
          canonicalName: e.canonical_name,
          regulator: 'Florida Office of Insurance Regulation',
          jurisdiction: 'FL',
          sourceDataset: EXAM_DATASETS.FL_MARKET_CONDUCT,
          family: EXAMINATION_FAMILY.MARKET_CONDUCT_EXAMINATION,
          classification: 'EXAMINED_ENTITY_EXACT',
          reportTitle: String(d.listing_title || d.listing || ''),
          reportDate,
          documentUrl: url,
          documentHash: hash,
          retrievedAt,
          listingTitles: [String(d.listing_title || d.listing || '')],
          evidenceLocation: e.evidence_location || 'cover/title',
          consumerSafeDescription: PUBLIC_EXAM_COPY.flMarketConduct,
        });
        if (!row) continue;
        const id = String(row.record_identifier);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(row);
      }
    }
  };
  if (existsSync(FL_CENSUS)) {
    const census = JSON.parse(readFileSync(FL_CENSUS, 'utf8'));
    add(census.exact_ingest_candidates || []);
  } else if (existsSync(FL_SAMPLE)) {
    const sample = JSON.parse(readFileSync(FL_SAMPLE, 'utf8'));
    add(
      (sample.rows || []).map((r: Record<string, unknown>) => ({
        ...r,
        document_hash: r.sha256,
        document_url: r.url,
        listing_title: r.listing,
        report_date: isoFromIssued(String(r.issued || '')),
        retrieved_at: '2026-08-29T21:30:00Z',
        examined_entities: r.canonical_match ? [r.canonical_match] : [],
      }))
    );
  }
  return out;
}

function isoFromIssued(s: string): string {
  const m = s.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (!m) return '';
  const months: Record<string, string> = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12',
  };
  const mon = months[m[1]];
  if (!mon) return '';
  return `${m[3]}-${mon}-${String(m[2]).padStart(2, '0')}`;
}

async function main() {
  loadLocalEnv(ROOT);
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const baseline = {
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    regulatoryEvidence: await count(sb, 'regulatory_evidence'),
    tdi: await count(sb, 'regulatory_evidence', [['source_dataset', 'tdi_complaint_indexes']]),
    caExams: await count(sb, 'regulatory_evidence', [['source_dataset', EXAM_DATASETS.CA_FINANCIAL]]),
    flExams: await count(sb, 'regulatory_evidence', [['source_dataset', EXAM_DATASETS.FL_MARKET_CONDUCT]]),
  };
  if (baseline.legalInsurer !== 6185) throw new Error(`legal ${baseline.legalInsurer}`);
  if (INS_INSURER_005_IDENTITY_WRITES !== 0) throw new Error('identity writes must stay 0');

  const ca = farmersPayloads();
  const fl = floridaPayloads();
  const payloads = [...ca, ...fl];
  const docs = new Set(payloads.map((p) => String((p.raw as { document?: { hash?: string } }).document?.hash)));
  const exams = new Set(payloads.map((p) => String(p.source_record_id)));

  const report: Record<string, unknown> = {
    task: TASK,
    execute,
    at: new Date().toISOString(),
    baseline,
    predicted: {
      documents: docs.size,
      examinations: exams.size,
      relationships: payloads.length,
      observations: payloads.length,
      farmers: ca.length,
      florida: fl.length,
      identityWrites: 0,
    },
    writes: { inserted: 0, skipped: 0 },
    secondRunWouldInsert: 0,
    fingerprint: createHash('sha256')
      .update(payloads.map((p) => String(p.record_identifier)).sort().join('\n'))
      .digest('hex'),
  };

  mkdirSync(OUT, { recursive: true });
  if (!execute) {
    writeFileSync(join(OUT, 'ins-insurer-005-ingest-dry-run.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, note: 'DRY-RUN. Re-run with --execute.' }, null, 2));
    return;
  }

  const have = new Set<string>([
    ...(await existingIds(sb, EXAM_DATASETS.CA_FINANCIAL)),
    ...(await existingIds(sb, EXAM_DATASETS.FL_MARKET_CONDUCT)),
  ]);
  const fresh = payloads.filter((p) => !have.has(String(p.record_identifier)));
  let inserted = 0;
  let skipped = payloads.length - fresh.length;
  for (const part of chunk(fresh, 40)) {
    const { error, data } = await sb.from('regulatory_evidence').insert(part).select('id');
    if (error) {
      if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
      skipped += part.length;
      continue;
    }
    inserted += data?.length ?? part.length;
  }
  report.writes = { inserted, skipped };
  report.after = {
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    regulatoryEvidence: await count(sb, 'regulatory_evidence'),
    tdi: await count(sb, 'regulatory_evidence', [['source_dataset', 'tdi_complaint_indexes']]),
    caExams: await count(sb, 'regulatory_evidence', [['source_dataset', EXAM_DATASETS.CA_FINANCIAL]]),
    flExams: await count(sb, 'regulatory_evidence', [['source_dataset', EXAM_DATASETS.FL_MARKET_CONDUCT]]),
  };
  const after = report.after as { legalInsurer: number; agencies: number; persons: number; tdi: number };
  if (after.legalInsurer !== 6185) throw new Error('identity mutation');
  if (after.agencies !== baseline.agencies) throw new Error('agency mutation');
  if (after.persons !== baseline.persons) throw new Error('person mutation');
  if (after.tdi !== baseline.tdi) throw new Error('TDI mutation');
  writeFileSync(join(OUT, 'ins-insurer-005-ingest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
