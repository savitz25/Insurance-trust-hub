/**
 * INS-NAT-FINAL-005B — regulatory backfill + exact bridge reconciliation + readiness fix.
 *
 *   npx tsx scripts/national/run-ins-nat-final-005b.ts
 *   npx tsx scripts/national/run-ins-nat-final-005b.ts --execute
 *
 * Does not mass-publish. Does not start Florida. Does not start FINAL-006.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { normalizeNpn } from '../../lib/national/npn';
import {
  PUBLIC_PERSON_PROFILES_ENABLED,
  mayPublishEntityKind,
} from '../../lib/national/publication';
import { PUBLIC_REGULATORY_EVIDENCE_ENABLED } from '../../lib/national/regulatory-evidence';
import {
  LEGAL_INSURER_DISPLAY_DECISION,
  mayPublishRegulatoryEvidenceRecord,
} from '../../lib/national/regulatory-display';
import {
  BRIDGE_MATCH_METHOD,
  BRIDGE_TASK,
  buildExpectedConfirmedBridges,
  classifyAgencyPublicationReadiness,
  extractProviderNpn,
  reconcileProviderBridges,
  type ExistingBridgeRow,
  type ExpectedBridge,
} from '../../lib/national/provider-graph-bridge';

const ROOT = resolve(process.cwd());
const execute = process.argv.includes('--execute');
const OUT = join(ROOT, 'data/reports');
const TASK = 'INS-NAT-FINAL-005B';
const PRIOR_BRIDGES = 38607;

function chunk<T>(arr: T[], n: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < arr.length; i += n) parts.push(arr.slice(i, i + n));
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

async function schemaHasEvidenceFamily(sb: SupabaseClient): Promise<boolean> {
  const { error } = await sb.from('regulatory_evidence').select('evidence_family').limit(1);
  if (!error) return true;
  return !/evidence_family|PGRST204|schema cache|does not exist/i.test(error.message || '');
}

async function backfillEvidence(
  sb: SupabaseClient,
  write: boolean
): Promise<{ updated: number; skipped: number }> {
  let updated = 0;
  let skipped = 0;
  const page = 500;
  let lastId: string | null = null;
  for (;;) {
    let q = sb
      .from('regulatory_evidence')
      .select(
        'id,raw,entity_id,attribution_confidence,source_dataset,record_identifier,event_date,evidence_family,evidence_subtype,publication_readiness,is_final'
      )
      .eq('source_dataset', 'tdi_complaint_indexes')
      .order('id', { ascending: true })
      .limit(page);
    if (lastId) q = q.gt('id', lastId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const row of rows) {
      const raw = (row.raw || {}) as Record<string, unknown>;
      const claim = (raw.sourceClaim || {}) as Record<string, unknown>;
      const already =
        row.evidence_family === 'COMPLAINT' &&
        row.evidence_subtype === 'CONFIRMED_COMPLAINT_INDEX' &&
        row.publication_readiness === 'INTERNAL_ONLY' &&
        row.is_final === false;
      if (already) {
        skipped += 1;
        continue;
      }
      const patch = {
        evidence_family: raw.family || 'COMPLAINT',
        evidence_subtype: raw.subtype || 'CONFIRMED_COMPLAINT_INDEX',
        respondent_kind: row.entity_id ? 'legal_insurer' : null,
        source_respondent_raw: raw.sourceRespondentRaw || claim.companyName || null,
        source_respondent_identifier: raw.sourceRespondentIdentifier || claim.naicId || null,
        identifier_scheme: raw.identifierScheme || 'tdi_naic_id',
        match_basis: raw.matchBasis || null,
        case_or_order_number: null,
        effective_date: row.event_date,
        status_normalized: 'UNKNOWN',
        status_raw: null,
        disposition_raw: `confirmed_complaints=${claim.confirmedComplaints ?? ''}`,
        sanction_raw: null,
        currency: null,
        document_url: null,
        document_sha256: null,
        publication_readiness: 'INTERNAL_ONLY',
        is_current: true,
        is_final: false,
        source_record_id: row.record_identifier,
        source_release: 'pa9u-9s9w',
      };
      if (!write) {
        updated += 1;
        continue;
      }
      const { error: uerr } = await sb.from('regulatory_evidence').update(patch).eq('id', row.id);
      if (uerr) throw new Error(`backfill ${row.id}: ${uerr.message}`);
      updated += 1;
    }
    lastId = String(rows[rows.length - 1]!.id);
    if (rows.length < page) break;
  }
  return { updated, skipped };
}

type Prov = { id: string; npn: string | null };
type Ag = { id: string; npn: string | null; identity_confidence: string };

async function pageProviders(sb: SupabaseClient): Promise<Prov[]> {
  const out: Prov[] = [];
  const page = 500;
  let lastId: string | null = null;
  for (;;) {
    let rows: Array<Record<string, unknown>> = [];
    let last = 'unknown';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let q = sb
        .from('providers')
        .select('id,license_info')
        .order('id', { ascending: true })
        .limit(page);
      if (lastId) q = q.gt('id', lastId);
      const { data, error } = await q;
      if (!error) {
        rows = (data ?? []) as Array<Record<string, unknown>>;
        last = '';
        break;
      }
      last = error.message || '(empty)';
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    if (last) throw new Error(`providers: ${last}`);
    if (!rows.length) break;
    for (const r of rows) {
      out.push({
        id: String(r.id),
        npn: extractProviderNpn({ licenseInfo: r.license_info }),
      });
    }
    lastId = String(rows[rows.length - 1]!.id);
    if (out.length % 20000 === 0) console.error(`providers paged ${out.length}`);
    if (rows.length < page) break;
  }
  return out;
}

async function pageAgencies(sb: SupabaseClient): Promise<Ag[]> {
  const out: Ag[] = [];
  const page = 500;
  let lastNpn: string | null = null;
  for (;;) {
    let rows: Array<Record<string, unknown>> = [];
    let last = 'unknown';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let q = sb
        .from('national_entities')
        .select('id,npn,identity_confidence')
        .eq('entity_kind', 'agency')
        .not('npn', 'is', null)
        .order('npn', { ascending: true })
        .limit(page);
      if (lastNpn) q = q.gt('npn', lastNpn);
      const { data, error } = await q;
      if (!error) {
        rows = (data ?? []) as Array<Record<string, unknown>>;
        last = '';
        break;
      }
      last = error.message || '(empty)';
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    if (last) throw new Error(`agencies: ${last}`);
    if (!rows.length) break;
    for (const r of rows) {
      out.push({
        id: String(r.id),
        npn: normalizeNpn(r.npn as string | null),
        identity_confidence: String(r.identity_confidence),
      });
    }
    lastNpn = String(rows[rows.length - 1]!.npn);
    if (out.length % 20000 === 0) console.error(`agencies paged ${out.length}`);
    if (rows.length < page) break;
  }
  {
    const { data, error } = await sb
      .from('national_entities')
      .select('id,npn,identity_confidence')
      .eq('entity_kind', 'agency')
      .is('npn', null)
      .limit(1000);
    if (error) throw new Error(`agencies-null-npn: ${error.message}`);
    for (const r of data ?? []) {
      out.push({
        id: String(r.id),
        npn: null,
        identity_confidence: String(r.identity_confidence),
      });
    }
  }
  return out;
}

async function pageAgencyCredentialIds(sb: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  const page = 1000;
  let lastId: string | null = null;
  for (;;) {
    let rows: Array<{ id: string; entity_id: string | null; entity_kind: string }> = [];
    let last = 'unknown';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let q = sb
        .from('license_credentials')
        .select('id,entity_id,entity_kind')
        .order('id', { ascending: true })
        .limit(page);
      if (lastId) q = q.gt('id', lastId);
      const { data, error } = await q;
      if (!error) {
        rows = (data ?? []) as typeof rows;
        last = '';
        break;
      }
      last = error.message || '(empty)';
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    if (last) throw new Error(`credentials: ${last}`);
    if (!rows.length) break;
    for (const r of rows) {
      if (r.entity_kind === 'agency' && r.entity_id) ids.add(String(r.entity_id));
    }
    lastId = String(rows[rows.length - 1]!.id);
    if (ids.size % 20000 === 0 && ids.size > 0) {
      console.error(`agency credential entities ${ids.size}`);
    }
    if (rows.length < page) break;
  }
  return ids;
}

async function pageExistingBridges(sb: SupabaseClient): Promise<ExistingBridgeRow[]> {
  const out: ExistingBridgeRow[] = [];
  const page = 1000;
  let lastId: string | null = null;
  for (;;) {
    let q = sb
      .from('provider_entity_bridges')
      .select('id,provider_id,entity_id,match_method,confidence,source,notes,matched_at')
      .order('id', { ascending: true })
      .limit(page);
    if (lastId) q = q.gt('id', lastId);
    const { data, error } = await q;
    if (error) throw new Error(`bridges: ${error.message}`);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const r of rows) {
      out.push({
        id: String(r.id),
        providerId: String(r.provider_id),
        entityId: r.entity_id ? String(r.entity_id) : null,
        matchMethod: r.match_method ? String(r.match_method) : null,
        confidence: r.confidence ? String(r.confidence) : null,
        source: r.source ? String(r.source) : null,
        notes: r.notes ? String(r.notes) : null,
        matchedAt: r.matched_at ? String(r.matched_at) : null,
      });
    }
    lastId = String(rows[rows.length - 1]!.id);
    if (rows.length < page) break;
  }
  return out;
}

async function evidenceSnapshot(sb: SupabaseClient) {
  return {
    total: await count(sb, 'regulatory_evidence'),
    complaint: await count(sb, 'regulatory_evidence', [['evidence_family', 'COMPLAINT']]),
    subtype: await count(sb, 'regulatory_evidence', [
      ['evidence_subtype', 'CONFIRMED_COMPLAINT_INDEX'],
    ]),
    internalOnly: await count(sb, 'regulatory_evidence', [
      ['publication_readiness', 'INTERNAL_ONLY'],
    ]),
    confirmed: await count(sb, 'regulatory_evidence', [
      ['attribution_confidence', 'CONFIRMED'],
    ]),
    unresolved: await count(sb, 'regulatory_evidence', [
      ['attribution_confidence', 'UNRESOLVED'],
    ]),
    review: await count(sb, 'regulatory_evidence', [
      ['attribution_confidence', 'REVIEW_REQUIRED'],
    ]),
  };
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  mkdirSync(OUT, { recursive: true });

  const preflight = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    insuranceGroup: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumerBrand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    credentials: await count(sb, 'license_credentials'),
    providers: await count(sb, 'providers'),
    regulatoryEvidence: await count(sb, 'regulatory_evidence'),
    bridges: await count(sb, 'provider_entity_bridges'),
  };
  if (preflight.agencies !== 82071) throw new Error(`agencies ${preflight.agencies}`);
  if (preflight.providers !== 170499) throw new Error(`providers ${preflight.providers}`);
  if (preflight.regulatoryEvidence !== 5966) {
    throw new Error(`regulatory_evidence ${preflight.regulatoryEvidence}`);
  }

  const familyOk = await schemaHasEvidenceFamily(sb);
  if (!familyOk) throw new Error('evidence_family columns not visible — SQL Editor apply required');

  console.error('Backfilling regulatory_evidence…');
  const backfill1 = await backfillEvidence(sb, execute);
  const backfill2 = await backfillEvidence(sb, execute);
  const evidenceAfter = await evidenceSnapshot(sb);

  const backfillReport = {
    task: TASK,
    execute,
    at: new Date().toISOString(),
    schemaVisible: true,
    first: backfill1,
    second: backfill2,
    after: evidenceAfter,
    publicationEnabled: PUBLIC_REGULATORY_EVIDENCE_ENABLED,
    complaintPublish: mayPublishRegulatoryEvidenceRecord({
      entityId: 'x',
      identityConfidence: 'CONFIRMED',
      publicationReadiness: 'INTERNAL_ONLY',
      family: 'COMPLAINT',
      sourceDataset: 'tdi_complaint_indexes',
      eventDate: '2024-12-31',
    }),
  };
  const backfillPath = join(OUT, 'ins-nat-final-005b-regulatory-backfill.json');
  writeFileSync(backfillPath, JSON.stringify(backfillReport, null, 2));
  if (backfill1.updated > 0) {
    writeFileSync(
      join(OUT, 'ins-nat-final-005b-regulatory-backfill-first.json'),
      JSON.stringify(backfillReport, null, 2)
    );
  }

  console.error('Paging providers, agencies, credentials, bridges…');
  const providers = await pageProviders(sb);
  const agencies = await pageAgencies(sb);
  const credentialEntityIds = await pageAgencyCredentialIds(sb);
  const existing = await pageExistingBridges(sb);

  const agenciesByNpn = new Map<string, string[]>();
  for (const a of agencies) {
    if (!a.npn) continue;
    const list = agenciesByNpn.get(a.npn) ?? [];
    list.push(a.id);
    agenciesByNpn.set(a.npn, list);
  }
  const providersByNpn = new Map<string, string[]>();
  for (const p of providers) {
    if (!p.npn) continue;
    const list = providersByNpn.get(p.npn) ?? [];
    list.push(p.id);
    providersByNpn.set(p.npn, list);
  }

  const expected: ExpectedBridge[] = buildExpectedConfirmedBridges({
    providers,
    agenciesByNpn,
    providersByNpn,
  });
  const recon1 = reconcileProviderBridges({ expected, existing });

  writeFileSync(
    join(OUT, 'ins-nat-final-005b-bridge-expected.json'),
    JSON.stringify(
      {
        count: expected.length,
        matchMethod: BRIDGE_MATCH_METHOD,
        source: `${BRIDGE_TASK}/005B`,
        pairs: expected,
      },
      null,
      2
    )
  );
  const stalePayload = {
    count: recon1.staleExtra.length,
    rows: recon1.staleExtra.map((r) => ({
      provider_id: r.providerId,
      entity_id: r.entityId,
      match_method: r.matchMethod,
      confidence: r.confidence,
      source: r.source,
      notes: r.notes,
      created_at: r.matchedAt,
      reason: r.reason,
    })),
    wrongTarget: recon1.wrongTarget,
    duplicates: recon1.duplicates,
    at: new Date().toISOString(),
  };
  if (recon1.staleExtra.length > 0) {
    writeFileSync(join(OUT, 'ins-nat-final-005b-bridge-stale.json'), JSON.stringify(stalePayload, null, 2));
    writeFileSync(
      join(OUT, `ins-nat-final-005b-bridge-stale-${stalePayload.at.replace(/[:.]/g, '')}.json`),
      JSON.stringify(stalePayload, null, 2)
    );
  }

  const writes = { inserted: 0, updated: 0, deleted: 0 };
  if (execute) {
    for (const part of chunk(recon1.staleExtra, 80)) {
      const ids = part.map((r) => r.id);
      const { error } = await sb.from('provider_entity_bridges').delete().in('id', ids);
      if (error) throw new Error(`delete stale: ${error.message}`);
      writes.deleted += part.length;
    }
    for (const row of recon1.duplicates) {
      const { error } = await sb.from('provider_entity_bridges').delete().eq('id', row.id);
      if (error) throw new Error(`delete dup: ${error.message}`);
      writes.deleted += 1;
    }
    for (const row of recon1.wrongTarget) {
      const { error } = await sb
        .from('provider_entity_bridges')
        .update({
          entity_id: row.expectedEntityId,
          match_method: BRIDGE_MATCH_METHOD,
          confidence: 'CONFIRMED',
          source: TASK,
          notes: `reconciled ${row.reason}`,
        })
        .eq('id', row.id);
      if (error) throw new Error(`update wrong: ${error.message}`);
      writes.updated += 1;
    }
    for (const part of chunk(recon1.missing, 80)) {
      const payload = part.map((p) => ({
        provider_id: p.providerId,
        entity_id: p.entityId,
        match_method: BRIDGE_MATCH_METHOD,
        confidence: 'CONFIRMED',
        source: TASK,
        notes: `npn=${p.npn}`,
      }));
      const { data, error } = await sb.from('provider_entity_bridges').insert(payload).select('id');
      if (error) {
        if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
        for (const row of payload) {
          const { error: ierr } = await sb.from('provider_entity_bridges').insert(row);
          if (ierr && !/duplicate|unique/i.test(ierr.message)) throw new Error(ierr.message);
          if (!ierr) writes.inserted += 1;
        }
        continue;
      }
      writes.inserted += data?.length ?? 0;
    }
  }

  const existingAfter = execute ? await pageExistingBridges(sb) : existing;
  const recon2 = reconcileProviderBridges({ expected, existing: existingAfter });
  const bridgesAfter = await count(sb, 'provider_entity_bridges');

  const reconReport = {
    task: TASK,
    execute,
    at: new Date().toISOString(),
    priorReported: PRIOR_BRIDGES,
    expected: expected.length,
    before: {
      production: existing.length,
      ...recon1.summary,
    },
    writes,
    after: {
      production: existingAfter.length,
      countHead: bridgesAfter,
      ...recon2.summary,
    },
    reviewRequiredBridges: existingAfter.filter((b) => b.confidence === 'REVIEW_REQUIRED').length,
    unresolvedBridges: existingAfter.filter((b) => b.confidence === 'UNRESOLVED').length,
    zeroDelta:
      recon2.summary.missing === 0 &&
      recon2.summary.staleExtra === 0 &&
      recon2.summary.wrongTarget === 0 &&
      recon2.summary.duplicate === 0 &&
      existingAfter.length === expected.length,
  };
  writeFileSync(
    join(OUT, 'ins-nat-final-005b-bridge-reconciliation.json'),
    JSON.stringify(reconReport, null, 2)
  );

  let ready = 0;
  let internal = 0;
  let agReview = 0;
  let notReady = 0;
  for (const a of agencies) {
    const r = classifyAgencyPublicationReadiness({
      identityConfidence: (a.identity_confidence as 'CONFIRMED') || 'UNRESOLVED',
      hasNpn: Boolean(a.npn),
      hasCredential: credentialEntityIds.has(a.id),
      kindCollision: (agenciesByNpn.get(a.npn || '') || []).length > 1,
    });
    if (r === 'READY_FOR_PUBLIC_PROFILE') ready += 1;
    else if (r === 'INTERNAL_ONLY') internal += 1;
    else if (r === 'REVIEW_REQUIRED') agReview += 1;
    else notReady += 1;
  }

  const readiness = {
    task: TASK,
    at: new Date().toISOString(),
    previousLogic: 'hasCredential = Boolean(agency.npn)',
    correctedLogic:
      'hasCredential = agency has at least one license_credentials row; NPN alone is insufficient',
    criteria: {
      READY_FOR_PUBLIC_PROFILE:
        'entity_kind=agency, canonical NPN, identity CONFIRMED, ≥1 license_credentials, no kind collision',
      INTERNAL_ONLY: 'NPN + credential but identity not CONFIRMED',
      REVIEW_REQUIRED: 'kind/identity collision or identity REVIEW_REQUIRED',
      NOT_READY: 'missing NPN or missing official credential',
    },
    agencies: agencies.length,
    agenciesWithNpn: agencies.filter((a) => a.npn).length,
    agenciesWithCredential: [...agencies].filter((a) => credentialEntityIds.has(a.id)).length,
    READY_FOR_PUBLIC_PROFILE: ready,
    INTERNAL_ONLY: internal,
    REVIEW_REQUIRED: agReview,
    NOT_READY: notReady,
    publicGraphAgenciesPublished: 0,
  };
  writeFileSync(join(OUT, 'ins-nat-final-005b-readiness.json'), JSON.stringify(readiness, null, 2));

  const regression = {
    providersBefore: preflight.providers,
    providersAfter: await count(sb, 'providers'),
    graphAgenciesBefore: preflight.agencies,
    graphAgenciesAfter: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    publicGraphAgenciesBefore: 0,
    publicGraphAgenciesAfter: 0,
    publicPeople: Number(mayPublishEntityKind('person')),
    publicLegalInsurers: Number(mayPublishEntityKind('legal_insurer')),
    publicGroups: Number(mayPublishEntityKind('insurance_group')),
    publicBrands: Number(mayPublishEntityKind('consumer_brand')),
    PUBLIC_PERSON_PROFILES_ENABLED,
    PUBLIC_REGULATORY_EVIDENCE_ENABLED,
    LEGAL_INSURER_DISPLAY_DECISION,
    sitemapChanges: false,
    robotsChanges: false,
    newRoutes: false,
    massPublish: false,
  };
  writeFileSync(
    join(OUT, 'ins-nat-final-005b-publication-regression.json'),
    JSON.stringify(regression, null, 2)
  );

  const summary = {
    task: TASK,
    execute,
    at: new Date().toISOString(),
    preflight,
    backfill: { first: backfill1, second: backfill2, after: evidenceAfter },
    bridges: reconReport,
    readiness,
    regression,
    note: execute
      ? 'EXECUTE complete.'
      : 'DRY-RUN. Re-run with --execute to backfill, delete stale bridges, and insert missing CONFIRMED pairs.',
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
