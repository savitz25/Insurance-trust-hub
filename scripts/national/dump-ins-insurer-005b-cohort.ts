/**
 * INS-INSURER-005B — read-only Production reconciliation + locked PUBLIC_READY cohort.
 *   npx tsx scripts/national/dump-ins-insurer-005b-cohort.ts
 */
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  EXAM_DATASETS,
  NON_CANONICAL_FIVE_DIGIT,
  assertPublicSafeEquations,
  classifyLegalInsurerReadinessV4,
} from '../../lib/national/legal-insurer-exam-ingest';
import { TDI_COMPLAINT_INDEX_DATASET } from '../../lib/national/legal-insurer-regulatory-gate';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports');

type ExamRow = {
  id: string;
  entity_id: string | null;
  regulator: string | null;
  event_date: string | null;
  source_dataset: string | null;
  source_url: string | null;
  document_url: string | null;
  document_sha256: string | null;
  source_record_id: string | null;
  source_respondent_identifier: string | null;
  publication_readiness: string | null;
  evidence_family: string | null;
  evidence_subtype: string | null;
};

async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>
): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
  const { count: n, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

async function pageExams(sb: SupabaseClient): Promise<ExamRow[]> {
  const out: ExamRow[] = [];
  for (const ds of [EXAM_DATASETS.CA_FINANCIAL, EXAM_DATASETS.FL_MARKET_CONDUCT]) {
    let last = '';
    for (;;) {
      let q = sb
        .from('regulatory_evidence')
        .select(
          'id,entity_id,regulator,event_date,source_dataset,source_url,document_url,document_sha256,source_record_id,source_respondent_identifier,publication_readiness,evidence_family,evidence_subtype'
        )
        .eq('source_dataset', ds)
        .order('id', { ascending: true })
        .limit(1000);
      if (last) q = q.gt('id', last);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as ExamRow[];
      if (!rows.length) break;
      out.push(...rows);
      last = rows[rows.length - 1]!.id;
      if (rows.length < 1000) break;
    }
  }
  return out;
}

async function tdiAttachedIds(sb: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  let last = '';
  for (;;) {
    let q = sb
      .from('regulatory_evidence')
      .select('id,entity_id,source_respondent_identifier')
      .eq('source_dataset', TDI_COMPLAINT_INDEX_DATASET)
      .not('entity_id', 'is', null)
      .order('id', { ascending: true })
      .limit(1000);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const r of rows) if (r.entity_id) ids.add(String(r.entity_id));
    last = String(rows[rows.length - 1]!.id);
    if (rows.length < 1000) break;
  }
  return ids;
}

async function pageLegal(
  sb: SupabaseClient
): Promise<Array<{ id: string; legal_name: string; provisional_key: string | null; identity_confidence: string | null }>> {
  const out = [];
  let last = '';
  for (;;) {
    let q = sb
      .from('national_entities')
      .select('id,legal_name,provisional_key,identity_confidence')
      .eq('entity_kind', 'legal_insurer')
      .order('id', { ascending: true })
      .limit(1000);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;
    out.push(
      ...rows.map((r) => ({
        id: String(r.id),
        legal_name: String(r.legal_name),
        provisional_key: r.provisional_key as string | null,
        identity_confidence: r.identity_confidence as string | null,
      }))
    );
    last = String(rows[rows.length - 1]!.id);
    if (rows.length < 1000) break;
  }
  return out;
}

function jurisdictionFor(dataset: string | null): string {
  if (dataset === EXAM_DATASETS.CA_FINANCIAL) return 'CA';
  if (dataset === EXAM_DATASETS.FL_MARKET_CONDUCT) return 'FL';
  return 'unknown';
}

async function main() {
  loadLocalEnv(ROOT);
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const legalInsurer = await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]);
  const regulatoryEvidence = await count(sb, 'regulatory_evidence');
  const tdi = await count(sb, 'regulatory_evidence', [['source_dataset', TDI_COMPLAINT_INDEX_DATASET]]);
  const exams = await pageExams(sb);
  const legal = await pageLegal(sb);
  const tdiIds = await tdiAttachedIds(sb);

  const attached32399 = exams.filter(
    (e) => e.source_respondent_identifier === NON_CANONICAL_FIVE_DIGIT || e.document_sha256 === NON_CANONICAL_FIVE_DIGIT
  );
  if (attached32399.length) throw new Error('32399 attached');

  const publicSafe = exams.filter((e) => e.publication_readiness === 'READY_FOR_PUBLIC_REVIEW');
  const review = exams.filter(
    (e) => e.evidence_subtype === 'HISTORICAL_NAME_REVIEW' || e.publication_readiness === 'REVIEW_REQUIRED'
  );
  const internal = exams.filter((e) => !publicSafe.includes(e) && !review.includes(e));
  const ca = publicSafe.filter((e) => e.source_dataset === EXAM_DATASETS.CA_FINANCIAL);
  const fl = publicSafe.filter((e) => e.source_dataset === EXAM_DATASETS.FL_MARKET_CONDUCT);
  const docs = new Set(exams.map((e) => e.document_sha256).filter(Boolean));
  const examIds = new Set(exams.map((e) => e.source_record_id).filter(Boolean));
  const uniqueSafe = new Set(publicSafe.map((e) => e.entity_id).filter(Boolean));

  const d = {
    PS1: docs.size,
    PS2: examIds.size,
    PS3: exams.length,
    PS4: new Set(exams.map((e) => e.entity_id).filter(Boolean)).size,
    PS5: publicSafe.length,
    PS6: internal.length,
    PS7: review.length,
    PS8: ca.length,
    PS9: fl.length,
    PS10: uniqueSafe.size,
  };
  const eq = assertPublicSafeEquations(d);
  if (eq.length) throw new Error(eq.join('; '));

  const legalById = new Map(legal.map((r) => [r.id, r]));
  const buckets = {
    PUBLIC_READY: 0,
    REVIEW_REQUIRED: 0,
    INSUFFICIENT_EVIDENCE: 0,
    IDENTITY_COLLISION: 0,
    INTERNAL_ONLY: 0,
  };
  const safeByEntity = new Map<string, ExamRow[]>();
  const reviewByEntity = new Map<string, number>();
  for (const e of publicSafe) {
    if (!e.entity_id) continue;
    const list = safeByEntity.get(e.entity_id) || [];
    list.push(e);
    safeByEntity.set(e.entity_id, list);
  }
  for (const e of review) {
    if (e.entity_id) reviewByEntity.set(e.entity_id, (reviewByEntity.get(e.entity_id) || 0) + 1);
  }
  for (const ent of legal) {
    const status = classifyLegalInsurerReadinessV4({
      entityKind: 'legal_insurer',
      identityConfidence: ent.identity_confidence || 'CONFIRMED',
      naicCode: 'x',
      duplicateNaic: false,
      publicSafeExamCount: safeByEntity.get(ent.id)?.length || 0,
      reviewRequiredExamCount: reviewByEntity.get(ent.id) || 0,
      internalOnlyAttachedCount: tdiIds.has(ent.id) ? 1 : 0,
    });
    buckets[status] += 1;
  }

  const errors: string[] = [];
  if (legalInsurer !== 6185) errors.push(`legal insurers ${legalInsurer}`);
  if (regulatoryEvidence !== 6004) errors.push(`regulatory_evidence ${regulatoryEvidence}`);
  if (d.PS1 !== 20 || d.PS2 !== 20) errors.push(`examinations ${d.PS1}/${d.PS2}`);
  if (d.PS3 !== 26 || d.PS5 !== 26) errors.push(`relationships ${d.PS3}/${d.PS5}`);
  if (d.PS8 !== 7 || d.PS9 !== 19) errors.push(`CA/FL ${d.PS8}/${d.PS9}`);
  if (d.PS10 !== 26) errors.push(`PUBLIC_READY unique ${d.PS10}`);
  if (buckets.PUBLIC_READY !== 26) errors.push(`V4 PUBLIC_READY ${buckets.PUBLIC_READY}`);
  if (buckets.INTERNAL_ONLY !== 1249) errors.push(`V4 INTERNAL_ONLY ${buckets.INTERNAL_ONLY}`);
  if (buckets.INSUFFICIENT_EVIDENCE !== 4910) errors.push(`V4 INSUFFICIENT ${buckets.INSUFFICIENT_EVIDENCE}`);
  if (buckets.REVIEW_REQUIRED !== 0 || buckets.IDENTITY_COLLISION !== 0) errors.push('V4 review/collision');
  if (buckets.PUBLIC_READY + buckets.INTERNAL_ONLY + buckets.INSUFFICIENT_EVIDENCE !== 6185) {
    errors.push('V4 does not partition 6185');
  }
  if (errors.length) throw new Error(errors.join('; '));

  const cohort = [...safeByEntity.entries()]
    .map(([entityId, rows]) => {
      const ent = legalById.get(entityId);
      const key = String(ent?.provisional_key || '');
      const naic = key.startsWith('legal-insurer:naic:') ? key.slice('legal-insurer:naic:'.length) : rows[0]?.source_respondent_identifier;
      if (naic === NON_CANONICAL_FIVE_DIGIT) throw new Error('32399 in cohort');
      const families = [...new Set(rows.map((r) => r.evidence_family).filter(Boolean))] as string[];
      const regulators = [...new Set(rows.map((r) => r.regulator).filter(Boolean))] as string[];
      const jurisdictions = [...new Set(rows.map((r) => jurisdictionFor(r.source_dataset)))];
      return {
        entity_id: entityId,
        canonical_legal_name: ent?.legal_name || null,
        naic_cocode: naic || null,
        examination_count: rows.length,
        examination_families: families,
        regulator: regulators,
        jurisdiction: jurisdictions,
        report_dates: [...new Set(rows.map((r) => r.event_date).filter(Boolean))] as string[],
        official_source_urls: [...new Set(rows.map((r) => r.source_url || r.document_url).filter(Boolean))] as string[],
        document_hashes: [...new Set(rows.map((r) => r.document_sha256).filter(Boolean))] as string[],
        public_safe_status: 'PUBLIC_SAFE' as const,
      };
    })
    .sort((a, b) => String(a.naic_cocode).localeCompare(String(b.naic_cocode)));

  if (cohort.length !== 26) throw new Error(`cohort ${cohort.length}`);
  if (cohort.some((c) => /complaint|tdi/i.test(JSON.stringify(c)))) throw new Error('TDI leaked into cohort');

  const fingerprint = createHash('sha256')
    .update(cohort.map((c) => `${c.naic_cocode}|${c.entity_id}`).join('\n'))
    .digest('hex');

  const report = {
    task: 'INS-INSURER-005B',
    locked: true,
    at: new Date().toISOString(),
    identity_writes: 0,
    tdi_complaint_indexes: { family: 'INTERNAL_ONLY', excluded_from_cohort: true, attached_insurers: tdiIds.size },
    non_canonical_five_digit: { value: NON_CANONICAL_FIVE_DIGIT, attached: 0 },
    production: {
      legal_insurers: legalInsurer,
      regulatory_evidence: regulatoryEvidence,
      tdi_rows: tdi,
    },
    denominators: d,
    publicationReadinessV4: buckets,
    cohort_size: cohort.length,
    fingerprint,
    insurers: cohort,
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'ins-insurer-005b-public-ready-cohort.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, insurers: `${cohort.length} locked` }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
