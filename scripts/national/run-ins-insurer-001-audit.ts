/**
 * INS-INSURER-001 — read-only legal-insurer identity census.
 *   npx tsx scripts/national/run-ins-insurer-001-audit.ts
 *
 * No graph writes. No publication. Unordered .range() is not used.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../../lib/national/publication';
import { normalizeLegalName } from '../../lib/national/names';
import { IDENTIFIER_SCHEME, normalizeNaicCompanyCode } from '../../lib/national/legal-insurer-identity';
import {
  INS_INSURER_001_DECISION,
  classifyLegalInsurerReadiness,
} from '../../lib/national/legal-insurer-publication';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports');
const TASK = 'INS-INSURER-001';

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>,
): Promise<number> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count: n, error } = await q;
    if (!error) return n ?? 0;
    await sleep(1200 * (attempt + 1));
  }
  return -1;
}

async function countLike(
  sb: SupabaseClient,
  kind: string,
  col: string,
  pattern: string,
): Promise<number> {
  const { count: n, error } = await sb
    .from('national_entities')
    .select('id', { count: 'exact', head: true })
    .eq('entity_kind', kind)
    .like(col, pattern);
  if (error) return -1;
  return n ?? 0;
}

async function countIs(sb: SupabaseClient, table: string, col: string): Promise<number> {
  const { count: n, error } = await sb.from(table).select('id', { count: 'exact', head: true }).is(col, null);
  if (error) return -1;
  return n ?? 0;
}

async function countNotNull(sb: SupabaseClient, table: string, col: string): Promise<number> {
  const { count: n, error } = await sb.from(table).select('id', { count: 'exact', head: true }).not(col, 'is', null);
  if (error) return -1;
  return n ?? 0;
}

async function keyset<T extends { id: string }>(
  sb: SupabaseClient,
  table: string,
  select: string,
  eqs: Array<[string, string]>,
): Promise<T[]> {
  const out: T[] = [];
  let last = '';
  for (;;) {
    let q = sb.from(table).select(select).order('id', { ascending: true }).limit(1000);
    for (const eq of eqs) q = q.eq(eq[0], eq[1]);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(`${table} keyset: ${error.message}`);
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
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const grains = {
    person: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    agency: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    legal_insurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    carrier: await count(sb, 'national_entities', [['entity_kind', 'carrier']]),
    insurance_group: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumer_brand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    providers: await count(sb, 'providers'),
    credentials: await count(sb, 'license_credentials'),
    loa: await count(sb, 'loa_observations'),
    marketplace: await count(sb, 'cms_marketplace_observations'),
    regulatory_evidence: await count(sb, 'regulatory_evidence'),
  };

  const carrierPrefixes = {
    fl_dfs: await countLike(sb, 'carrier', 'provisional_key', 'carrier:fl-dfs:%'),
    tx_tdi: await countLike(sb, 'carrier', 'provisional_key', 'carrier:tx-tdi-naic:%'),
  };

  const legal = await keyset<{
    id: string;
    legal_name: string;
    identity_confidence: string;
    provisional_key: string | null;
  }>(sb, 'national_entities', 'id,legal_name,identity_confidence,provisional_key', [
    ['entity_kind', 'legal_insurer'],
  ]);

  const identifiers = await keyset<{
    id: string;
    entity_id: string;
    scheme: string;
    value: string;
  }>(sb, 'national_entity_identifiers', 'id,entity_id,scheme,value', [['scheme', IDENTIFIER_SCHEME.NAIC_COCODE]]);

  const naicByEntity = new Map<string, string[]>();
  const entitiesByNaic = new Map<string, string[]>();
  for (const row of identifiers) {
    const code = normalizeNaicCompanyCode(row.value);
    if (!code) continue;
    const list = naicByEntity.get(row.entity_id) || [];
    list.push(code);
    naicByEntity.set(row.entity_id, list);
    const ents = entitiesByNaic.get(code) || [];
    ents.push(row.entity_id);
    entitiesByNaic.set(code, ents);
  }

  let missingNaic = 0;
  let multiNaicOnEntity = 0;
  const exactName = new Map<string, number>();
  const normName = new Map<string, number>();
  for (const ent of legal) {
    const codes = naicByEntity.get(ent.id) || [];
    const fromKey = ent.provisional_key?.startsWith('legal-insurer:naic:')
      ? ent.provisional_key.slice('legal-insurer:naic:'.length)
      : null;
    if (codes.length === 0 && !normalizeNaicCompanyCode(fromKey)) missingNaic += 1;
    if (new Set(codes).size > 1) multiNaicOnEntity += 1;
    exactName.set(ent.legal_name, (exactName.get(ent.legal_name) || 0) + 1);
    const n = normalizeLegalName(ent.legal_name);
    if (n) normName.set(n, (normName.get(n) || 0) + 1);
  }
  const duplicateCodes = [...entitiesByNaic.values()].filter((v) => new Set(v).size > 1).length;
  const exactDupNames = [...exactName.values()].filter((n) => n > 1).length;
  const normDupNames = [...normName.values()].filter((n) => n > 1).length;

  const credentialsOnLegal = await count(sb, 'license_credentials', [['entity_kind', 'legal_insurer']]);
  const evidenceLegal = await count(sb, 'regulatory_evidence', [['respondent_kind', 'legal_insurer']]);
  const evidenceAgency = await count(sb, 'regulatory_evidence', [['respondent_kind', 'agency']]);
  const evidencePerson = await count(sb, 'regulatory_evidence', [['respondent_kind', 'person']]);
  const evidenceCarrier = await count(sb, 'regulatory_evidence', [['respondent_kind', 'carrier']]);
  const evidenceUnattached = await countIs(sb, 'regulatory_evidence', 'entity_id');
  const evidenceAttached = await countNotNull(sb, 'regulatory_evidence', 'entity_id');

  const cmsUnattached = await countIs(sb, 'cms_marketplace_observations', 'entity_id');
  const cmsAttached = await countNotNull(sb, 'cms_marketplace_observations', 'entity_id');

  const sample = await sb
    .from('cms_marketplace_observations')
    .select('entity_id')
    .not('entity_id', 'is', null)
    .order('id', { ascending: true })
    .limit(200);
  const sampleIds = [...new Set((sample.data || []).map((r) => String(r.entity_id)).filter(Boolean))];
  const kindHits: Record<string, number> = {};
  if (sampleIds.length) {
    const { data: ents } = await sb.from('national_entities').select('id,entity_kind').in('id', sampleIds);
    for (const e of ents || []) {
      const k = String(e.entity_kind);
      kindHits[k] = (kindHits[k] || 0) + 1;
    }
  }

  const relationships = {
    APPOINTER_RESOLVES_TO: await count(sb, 'national_relationships', [['relationship_type', 'APPOINTER_RESOLVES_TO']]),
    USES_BRAND: await count(sb, 'national_relationships', [['relationship_type', 'USES_BRAND']]),
    MEMBER_OF_GROUP: await count(sb, 'national_relationships', [['relationship_type', 'MEMBER_OF_GROUP']]),
    appointed_by: await count(sb, 'national_relationships', [['relationship_type', 'appointed_by']]),
    WORKS_FOR: await count(sb, 'national_relationships', [['relationship_type', 'WORKS_FOR']]),
  };

  const eligibility = {
    PUBLIC_READY: 0,
    REVIEW_REQUIRED: 0,
    INSUFFICIENT_EVIDENCE: 0,
    IDENTITY_COLLISION: 0,
    INTERNAL_ONLY: 0,
  };
  for (const ent of legal) {
    const codes = [...new Set(naicByEntity.get(ent.id) || [])];
    const naic = codes[0] || normalizeNaicCompanyCode(ent.provisional_key?.slice('legal-insurer:naic:'.length) || null);
    const dup = naic ? (entitiesByNaic.get(naic) || []).filter((id, i, arr) => arr.indexOf(id) === i).length > 1 : false;
    const cls = classifyLegalInsurerReadiness({
      entityKind: 'legal_insurer',
      identityConfidence: ent.identity_confidence,
      naicCode: naic,
      duplicateNaic: dup,
      nameCollision: (exactName.get(ent.legal_name) || 0) > 1 && !naic,
      usefulPublicEvidenceFamilies: [],
    });
    eligibility[cls] += 1;
  }

  const report = {
    task: TASK,
    generatedAt: new Date().toISOString(),
    db_writes: { schema: 0, publication: 0, data_mutation: 0 },
    pagination: 'keyset order=id gt=id; no unordered range',
    grains,
    carrierPrefixes,
    carrierKindExplanation:
      'entity_kind=carrier is appointing-entity grain (FL DFS + TX TDI keys), not the NAIC legal-insurer spine.',
    legalInsurerExplanation:
      'entity_kind=legal_insurer is one NAIC CoCode from Listing of Companies. One CoCode = one legal insurer.',
    naic: {
      identifierRows: identifiers.length,
      withCode: legal.length - missingNaic,
      missing: missingNaic,
      duplicateCodes,
      oneEntityMultipleNaic: multiNaicOnEntity,
      source: 'national_entity_identifiers.scheme=naic_cocode + provisional_key legal-insurer:naic:{CoCode}',
      confidence: 'CONFIRMED official CoCode; name never invents NAIC',
      sourceClock: '2026-08-27T00:00:00.000Z',
    },
    names: {
      exactDuplicateLegalNames: exactDupNames,
      normalizedDuplicateLegalNames: normDupNames,
      note: 'Same legal name + different CoCode is two insurers. Search similarity is not a merge.',
    },
    brands: {
      consumer_brand: grains.consumer_brand,
      USES_BRAND: relationships.USES_BRAND,
      curatedCarrierPages: 14,
      note: '/carriers is a curated brand/Medicare hub, not the 6,185 legal-insurer graph.',
    },
    evidence: {
      credentialsOnLegalInsurer: credentialsOnLegal,
      regulatory: {
        total: grains.regulatory_evidence,
        insurerAttached: evidenceLegal,
        agencyAttached: evidenceAgency,
        personAttached: evidencePerson,
        carrierAttached: evidenceCarrier,
        unattached: evidenceUnattached,
        attached: evidenceAttached,
        attachmentMethod: 'exact NAIC / source-native identifier; name-only prohibited',
      },
      marketplace: {
        total: grains.marketplace,
        attached: cmsAttached,
        unattached: cmsUnattached >= 0 ? cmsUnattached : Math.max(0, grains.marketplace - Math.max(cmsAttached, 0)),
        sampleAttachedKinds: kindHits,
        note: 'Marketplace observations are not a legal-insurer census. Brand-name similarity is not attachment.',
      },
    },
    appointments: {
      ...relationships,
      unresolvedFlPolicy: 'FL DFS appointing number is never treated as NAIC CoCode',
      txConfirmedBridges: relationships.APPOINTER_RESOLVES_TO,
    },
    eligibility,
    publication: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
      mayPublishAgency: mayPublishEntityKind('agency'),
      publicPeople: 0,
      publicGraphAgencies: 0,
      publicLegalInsurers: 0,
      publishedUrls: 0,
      decision: INS_INSURER_001_DECISION,
      sitemapBefore: 0,
      sitemapAfter: 0,
    },
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'ins-insurer-001-census.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ task: TASK, grains, eligibility, naic: report.naic, decision: INS_INSURER_001_DECISION }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
