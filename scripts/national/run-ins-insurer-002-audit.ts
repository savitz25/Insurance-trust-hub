/**
 * INS-INSURER-002 — read-only regulatory-source inventory + R1–R8 denominators.
 *   npx tsx scripts/national/run-ins-insurer-002-audit.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../../lib/national/publication';
import { PUBLIC_REGULATORY_EVIDENCE_ENABLED } from '../../lib/national/regulatory-evidence';
import {
  HELD_SOURCE_FAMILY,
  INS_INSURER_002_DECISION,
  INS_INSURER_002_IDENTITY_ONLY_PAGES,
  INS_INSURER_002_PUBLIC_SOURCE_ALLOWLIST,
  INS_INSURER_002_WAVE1_SIZE,
  assertRegulatoryEquations,
  classifyLegalInsurerReadinessV2,
  classifyObservationPublicSafety,
  regulatoryEventGroupKey,
  type RegulatoryObservationRow,
} from '../../lib/national/legal-insurer-regulatory-gate';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports');

async function count(sb: SupabaseClient, table: string, eqs?: Array<[string, string]>): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
  const { count: n, error } = await q;
  if (error) return -1;
  return n ?? 0;
}

async function keyset<T extends { id: string }>(
  sb: SupabaseClient,
  table: string,
  select: string,
  eqs: Array<[string, string]> = [],
): Promise<T[]> {
  const out: T[] = [];
  let last = '';
  for (;;) {
    let q = sb.from(table).select(select).order('id', { ascending: true }).limit(1000);
    for (const eq of eqs) q = q.eq(eq[0], eq[1]);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data || []) as T[];
    if (!rows.length) break;
    out.push(...rows);
    last = rows[rows.length - 1]!.id;
    if (rows.length < 1000) break;
  }
  return out;
}

async function main() {
  loadLocalEnv(ROOT);
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const R1 = await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]);
  const totalEvidence = await count(sb, 'regulatory_evidence');
  const attachedLegal = await count(sb, 'regulatory_evidence', [['respondent_kind', 'legal_insurer']]);

  const evidence = await keyset<Record<string, unknown>>(
    sb,
    'regulatory_evidence',
    'id,entity_id,source_dataset,evidence_family,evidence_subtype,respondent_kind,publication_readiness,attribution_confidence,event_date,source_observed_at,record_identifier,regulator,match_basis,identifier_scheme,source_url,raw',
  );

  const rows: RegulatoryObservationRow[] = evidence.map((r) => ({
    id: String(r.id),
    entityId: r.entity_id ? String(r.entity_id) : null,
    respondentKind: r.respondent_kind ? String(r.respondent_kind) : null,
    sourceDataset: r.source_dataset ? String(r.source_dataset) : null,
    family: r.evidence_family ? String(r.evidence_family) : null,
    subtype: r.evidence_subtype ? String(r.evidence_subtype) : null,
    publicationReadiness: r.publication_readiness ? String(r.publication_readiness) : null,
    attributionConfidence: r.attribution_confidence ? String(r.attribution_confidence) : null,
    eventDate: r.event_date ? String(r.event_date) : null,
    sourceObservedAt: r.source_observed_at ? String(r.source_observed_at) : null,
    recordIdentifier: r.record_identifier ? String(r.record_identifier) : null,
    matchBasis: r.match_basis ? String(r.match_basis) : null,
  }));

  const attached = rows.filter((r) => r.entityId && r.respondentKind === 'legal_insurer');
  const unattached = rows.filter((r) => !r.entityId);
  const R4 = attached.length;
  let R5 = 0;
  let R6 = 0;
  let R7 = 0;
  const publicSafeEntities = new Set<string>();
  const attachedEntities = new Set<string>();
  const internalEntities = new Set<string>();
  const reviewEntities = new Set<string>();
  const eventKeys = new Set<string>();
  const datasets = new Map<string, { total: number; attached: number; entities: Set<string>; earliest: string | null; latest: string | null }>();

  for (const row of rows) {
    const ds = row.sourceDataset || 'unknown';
    const bucket = datasets.get(ds) || { total: 0, attached: 0, entities: new Set<string>(), earliest: null, latest: null };
    bucket.total += 1;
    const clock = row.eventDate || row.sourceObservedAt;
    if (clock && (!bucket.earliest || clock < bucket.earliest)) bucket.earliest = clock;
    if (clock && (!bucket.latest || clock > bucket.latest)) bucket.latest = clock;
    if (row.entityId && row.respondentKind === 'legal_insurer') {
      bucket.attached += 1;
      bucket.entities.add(row.entityId);
      attachedEntities.add(row.entityId);
      const cls = classifyObservationPublicSafety(row);
      if (cls === 'PUBLIC_SAFE') {
        R5 += 1;
        publicSafeEntities.add(row.entityId);
      } else if (cls === 'REVIEW_REQUIRED') {
        R7 += 1;
        reviewEntities.add(row.entityId);
      } else {
        R6 += 1;
        internalEntities.add(row.entityId);
      }
      const gk = regulatoryEventGroupKey(row);
      if (gk) eventKeys.add(gk);
    }
    datasets.set(ds, bucket);
  }

  const R2 = attachedEntities.size;
  const R3 = R1 - R2;
  const R8 = publicSafeEntities.size;
  const denominators = { R1, R2, R3, R4, R5, R6, R7, R8 };
  const equationErrors = assertRegulatoryEquations(denominators);

  const legal = await keyset<{ id: string; identity_confidence: string; provisional_key: string | null }>(
    sb,
    'national_entities',
    'id,identity_confidence,provisional_key',
    [['entity_kind', 'legal_insurer']],
  );
  const eligibility = {
    PUBLIC_READY: 0,
    REVIEW_REQUIRED: 0,
    INSUFFICIENT_EVIDENCE: 0,
    IDENTITY_COLLISION: 0,
    INTERNAL_ONLY: 0,
  };
  for (const ent of legal) {
    const naic = ent.provisional_key?.startsWith('legal-insurer:naic:')
      ? ent.provisional_key.slice('legal-insurer:naic:'.length)
      : null;
    const cls = classifyLegalInsurerReadinessV2({
      entityKind: 'legal_insurer',
      identityConfidence: ent.identity_confidence,
      naicCode: naic,
      duplicateNaic: false,
      publicSafeObservationCount: publicSafeEntities.has(ent.id) ? 1 : 0,
      internalOnlyAttachedObservationCount: internalEntities.has(ent.id) ? 1 : 0,
      reviewRequiredObservationCount: reviewEntities.has(ent.id) ? 1 : 0,
    });
    eligibility[cls] += 1;
  }

  const inventory = [...datasets.entries()].map(([dataset, b]) => ({
    regulator: dataset === HELD_SOURCE_FAMILY.dataset ? HELD_SOURCE_FAMILY.regulator : 'unknown',
    dataset,
    observationType: dataset === HELD_SOURCE_FAMILY.dataset ? HELD_SOURCE_FAMILY.observationType : 'unknown',
    grain: dataset === HELD_SOURCE_FAMILY.dataset ? HELD_SOURCE_FAMILY.grain : 'unknown',
    identifierUsed: dataset === HELD_SOURCE_FAMILY.dataset ? HELD_SOURCE_FAMILY.identifier : 'unknown',
    naicAttachmentMethod: dataset === HELD_SOURCE_FAMILY.dataset ? HELD_SOURCE_FAMILY.attachmentMethod : 'unknown',
    totalRows: b.total,
    attachedRows: b.attached,
    uniqueLegalInsurers: b.entities.size,
    earliestObservedDate: b.earliest,
    latestObservedDate: b.latest,
    retrievedDate: dataset === HELD_SOURCE_FAMILY.dataset ? '2026-08-27T00:00:00.000Z' : null,
    publicSourceUrlAvailable: dataset === HELD_SOURCE_FAMILY.dataset,
    consumerSafeDescription: dataset === HELD_SOURCE_FAMILY.dataset,
    publicationEligible: INS_INSURER_002_PUBLIC_SOURCE_ALLOWLIST.includes(dataset),
    reason: dataset === HELD_SOURCE_FAMILY.dataset ? HELD_SOURCE_FAMILY.holdReason : 'unlisted source family held',
  }));

  const report = {
    task: 'INS-INSURER-002',
    generatedAt: new Date().toISOString(),
    db_writes: { schema: 0, publication: 0, data_mutation: 0 },
    pagination: 'keyset order=id gt=id',
    grains: {
      legal_insurer: R1,
      regulatory_evidence_total: totalEvidence,
      attached_legal_insurer_count_head: attachedLegal,
      unattached: unattached.length,
    },
    denominators,
    equationErrors,
    inventory,
    duplicateEvents: {
      method: 'source_dataset + record_identifier (TDI org|year|line|naic). No fuzzy name/text merge.',
      distinctEventKeys: eventKeys.size,
      attachedRows: R4,
      extrasVsKeys: R4 - eventKeys.size,
    },
    eligibility,
    publication: {
      PUBLIC_REGULATORY_EVIDENCE_ENABLED,
      mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
      PUBLIC_PERSON_PROFILES_ENABLED,
      allowlist: [...INS_INSURER_002_PUBLIC_SOURCE_ALLOWLIST],
      identityOnlyPages: INS_INSURER_002_IDENTITY_ONLY_PAGES,
      decision: INS_INSURER_002_DECISION,
      wave1: INS_INSURER_002_WAVE1_SIZE,
      publicPeople: 0,
      publicGraphAgencies: 0,
      publicLegalInsurers: 0,
      publishedUrls: 0,
    },
    nameOnlyJoins: 0,
    marketplaceOnProfiles: false,
    medicareOnProfiles: false,
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'ins-insurer-002-census.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ denominators, eligibility, inventory: inventory.map((i) => ({ dataset: i.dataset, attached: i.attachedRows, unique: i.uniqueLegalInsurers, eligible: i.publicationEligible })), equationErrors, decision: INS_INSURER_002_DECISION }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
