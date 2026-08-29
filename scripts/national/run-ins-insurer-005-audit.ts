/** Census PS1–PS10 and Publication Readiness V4. Read-only. */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  EXAM_DATASETS,
  assertPublicSafeEquations,
  classifyLegalInsurerReadinessV4,
} from '../../lib/national/legal-insurer-exam-ingest';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports');

async function pageExamRows(sb: SupabaseClient): Promise<
  Array<{
    entity_id: string | null;
    source_dataset: string | null;
    document_sha256: string | null;
    source_record_id: string | null;
    publication_readiness: string | null;
    evidence_family: string | null;
    evidence_subtype: string | null;
    match_basis: string | null;
  }>
> {
  const out = [];
  for (const ds of [EXAM_DATASETS.CA_FINANCIAL, EXAM_DATASETS.FL_MARKET_CONDUCT]) {
    let last = '';
    for (;;) {
      let q = sb
        .from('regulatory_evidence')
        .select(
          'id,entity_id,source_dataset,document_sha256,source_record_id,publication_readiness,evidence_family,evidence_subtype,match_basis'
        )
        .eq('source_dataset', ds)
        .order('id', { ascending: true })
        .limit(1000);
      if (last) q = q.gt('id', last);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      if (!rows.length) break;
      out.push(...rows);
      last = String(rows[rows.length - 1]!.id);
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
      .select('id,entity_id')
      .eq('source_dataset', 'tdi_complaint_indexes')
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

async function pageLegal(sb: SupabaseClient): Promise<Array<{ id: string; identity_confidence: string | null }>> {
  const out: Array<{ id: string; identity_confidence: string | null }> = [];
  let last = '';
  for (;;) {
    let q = sb
      .from('national_entities')
      .select('id,identity_confidence')
      .eq('entity_kind', 'legal_insurer')
      .order('id', { ascending: true })
      .limit(1000);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const r of rows) out.push({ id: String(r.id), identity_confidence: r.identity_confidence });
    last = rows[rows.length - 1]!.id as string;
    if (rows.length < 1000) break;
  }
  return out;
}

async function main() {
  loadLocalEnv(ROOT);
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const exams = await pageExamRows(sb);
  const publicSafe = exams.filter((e) => e.publication_readiness === 'READY_FOR_PUBLIC_REVIEW');
  const review = exams.filter((e) => e.evidence_subtype === 'HISTORICAL_NAME_REVIEW' || e.publication_readiness === 'REVIEW_REQUIRED');
  const internal = exams.filter((e) => !publicSafe.includes(e) && !review.includes(e));
  const caSafe = publicSafe.filter((e) => e.source_dataset === EXAM_DATASETS.CA_FINANCIAL);
  const flSafe = publicSafe.filter((e) => e.source_dataset === EXAM_DATASETS.FL_MARKET_CONDUCT);
  const docs = new Set(exams.map((e) => e.document_sha256).filter(Boolean));
  const examIds = new Set(exams.map((e) => e.source_record_id).filter(Boolean));
  const uniqueInsurers = new Set(exams.map((e) => e.entity_id).filter(Boolean));
  const uniquePublicReadyEntities = new Set(publicSafe.map((e) => e.entity_id).filter(Boolean));

  const d = {
    PS1: docs.size,
    PS2: examIds.size,
    PS3: exams.length,
    PS4: uniqueInsurers.size,
    PS5: publicSafe.length,
    PS6: internal.length,
    PS7: review.length,
    PS8: caSafe.length,
    PS9: flSafe.length,
    PS10: uniquePublicReadyEntities.size,
  };
  const eq = assertPublicSafeEquations(d);
  if (eq.length) throw new Error(eq.join('; '));

  const tdiIds = await tdiAttachedIds(sb);
  const legal = await pageLegal(sb);
  const buckets = {
    PUBLIC_READY: 0,
    REVIEW_REQUIRED: 0,
    INSUFFICIENT_EVIDENCE: 0,
    IDENTITY_COLLISION: 0,
    INTERNAL_ONLY: 0,
  };
  const safeByEntity = new Map<string, number>();
  const reviewByEntity = new Map<string, number>();
  for (const e of publicSafe) {
    if (e.entity_id) safeByEntity.set(e.entity_id, (safeByEntity.get(e.entity_id) || 0) + 1);
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
      publicSafeExamCount: safeByEntity.get(ent.id) || 0,
      reviewRequiredExamCount: reviewByEntity.get(ent.id) || 0,
      internalOnlyAttachedCount: tdiIds.has(ent.id) ? 1 : 0,
    });
    buckets[status] += 1;
  }
  if (legal.length !== 6185) throw new Error(`legal ${legal.length}`);
  if (buckets.PUBLIC_READY + buckets.REVIEW_REQUIRED + buckets.INSUFFICIENT_EVIDENCE + buckets.IDENTITY_COLLISION + buckets.INTERNAL_ONLY !== 6185) {
    throw new Error('V4 does not partition 6185');
  }

  const report = {
    task: 'INS-INSURER-005',
    at: new Date().toISOString(),
    db_writes: { identity: 0 },
    tdi: { attachedInsurers: tdiIds.size, family: 'INTERNAL_ONLY' },
    denominators: d,
    publicationReadinessV4: buckets,
    examRows: exams.length,
    legalInsurers: legal.length,
    identityWrites: 0,
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'ins-insurer-005-census.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
