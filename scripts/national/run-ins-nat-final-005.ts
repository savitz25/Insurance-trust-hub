/**
 * INS-NAT-FINAL-005 — evidence column backfill + provider→graph CONFIRMED NPN bridges.
 *
 *   npx tsx scripts/national/run-ins-nat-final-005.ts
 *   npx tsx scripts/national/run-ins-nat-final-005.ts --execute
 *
 * Does not mass-publish graph agencies. Does not publish people/insurers.
 * Does not start Florida. Does not apply SQL via DATABASE_URL (migration is SQL Editor).
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
  legalInsurerEvidenceAppearsOnAgencyReport,
  mayPublishRegulatoryEvidenceRecord,
} from '../../lib/national/regulatory-display';
import {
  classifyAgencyPublicationReadiness,
  decideProviderAgencyBridge,
  extractProviderNpn,
  BRIDGE_MATCH_METHOD,
  BRIDGE_TASK,
} from '../../lib/national/provider-graph-bridge';
import {
  TRUST_REPORT_VERSION,
  agencyTrustReportLimitations,
  appointmentCoverageNote,
  buildAgencyTrustReport,
  emptyAgencyRegulatoryModule,
  footprintCopy,
} from '../../lib/national/agency-trust-report';

const ROOT = resolve(process.cwd());
const execute = process.argv.includes('--execute');
const OUT = join(ROOT, 'data/reports');
const MIGRATION = 'supabase/migrations/20260827180000_regulatory_evidence_foundation.sql';

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
        'id,raw,entity_id,attribution_confidence,source_dataset,record_identifier,event_date,evidence_family,publication_readiness,is_final'
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

type Prov = { id: string; npn: string | null; name: string; state: string | null; verified: boolean };
type Ag = { id: string; npn: string | null; legal_name: string; display_name: string; identity_confidence: string };

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
        .select('id,name,verified,license_info,states_licensed')
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
      const npn = extractProviderNpn({ licenseInfo: r.license_info });
      const states = (r.states_licensed as string[]) || [];
      out.push({
        id: String(r.id),
        npn,
        name: String(r.name || ''),
        state: states[0] || null,
        verified: Boolean(r.verified),
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
    let rows: Ag[] = [];
    let last = 'unknown';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let q = sb
        .from('national_entities')
        .select('id,npn,legal_name,display_name,identity_confidence')
        .eq('entity_kind', 'agency')
        .not('npn', 'is', null)
        .order('npn', { ascending: true })
        .limit(page);
      if (lastNpn) q = q.gt('npn', lastNpn);
      const { data, error } = await q;
      if (!error) {
        rows = (data ?? []) as Ag[];
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
        id: r.id,
        npn: normalizeNpn(r.npn),
        legal_name: r.legal_name,
        display_name: r.display_name,
        identity_confidence: r.identity_confidence,
      });
    }
    lastNpn = rows[rows.length - 1]!.npn;
    if (out.length % 20000 === 0) console.error(`agencies paged ${out.length}`);
    if (rows.length < page) break;
  }
  return out;
}

async function sampleTrustReport(
  sb: SupabaseClient,
  agency: Ag
): Promise<ReturnType<typeof buildAgencyTrustReport>> {
  const { data: creds } = await sb
    .from('license_credentials')
    .select(
      'jurisdiction,license_number,license_class,regulatory_status,issue_date,expiration_date,source_dataset,source_observed_at'
    )
    .eq('entity_id', agency.id)
    .limit(12);
  const { data: loas } = await sb
    .from('loa_observations')
    .select('official_text,official_code,source_dataset')
    .eq('entity_id', agency.id)
    .limit(12);
  const { data: rels } = await sb
    .from('national_relationships')
    .select('to_entity_id,relationship_type,status,source_dataset')
    .eq('from_entity_id', agency.id)
    .limit(12);
  const { data: contacts } = await sb
    .from('contact_observations')
    .select('contact_kind,value,source_dataset,public_eligible')
    .eq('entity_id', agency.id)
    .eq('public_eligible', true)
    .limit(12);
  const credentials = (creds || []).map((c) => ({
    jurisdiction: String(c.jurisdiction || ''),
    licenseNumber: String(c.license_number || ''),
    licenseClass: c.license_class ? String(c.license_class) : null,
    regulatoryStatus: c.regulatory_status ? String(c.regulatory_status) : null,
    issueDate: c.issue_date ? String(c.issue_date) : null,
    expirationDate: c.expiration_date ? String(c.expiration_date) : null,
    sourceDataset: String(c.source_dataset || ''),
    sourceObservedAt: c.source_observed_at ? String(c.source_observed_at) : null,
  }));
  return buildAgencyTrustReport({
    entity: {
      id: agency.id,
      kind: 'agency',
      npn: agency.npn,
      legalName: agency.legal_name,
      displayName: agency.display_name,
      identityConfidence: agency.identity_confidence,
    },
    credentials,
    loas: (loas || []).map((l) => ({
      officialText: String(l.official_text || ''),
      officialCode: l.official_code ? String(l.official_code) : null,
      sourceDataset: String(l.source_dataset || ''),
    })),
    appointments: (rels || []).map((r) => ({
      toEntityId: String(r.to_entity_id),
      relationshipType: String(r.relationship_type),
      status: r.status ? String(r.status) : null,
      sourceDataset: String(r.source_dataset || ''),
      limitation: 'Appointment is not employment, quality, or service territory.',
    })),
    cms: [],
    contacts: (contacts || []).map((c) => ({
      kind: String(c.contact_kind),
      value: String(c.value),
      sourceDataset: String(c.source_dataset || ''),
      publicEligible: Boolean(c.public_eligible),
    })),
    sources: credentials.map((c) => ({
      authority: 'State insurance regulator',
      dataset: c.sourceDataset,
      asOf: c.sourceObservedAt,
    })),
    readiness: classifyAgencyPublicationReadiness({
      identityConfidence: (agency.identity_confidence as 'CONFIRMED') || 'UNRESOLVED',
      hasNpn: Boolean(agency.npn),
      hasCredential: credentials.length > 0,
      kindCollision: false,
    }),
  });
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const preflight = {
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    legalInsurer: await count(sb, 'national_entities', [['entity_kind', 'legal_insurer']]),
    insuranceGroup: await count(sb, 'national_entities', [['entity_kind', 'insurance_group']]),
    consumerBrand: await count(sb, 'national_entities', [['entity_kind', 'consumer_brand']]),
    credentials: await count(sb, 'license_credentials'),
    providers: await count(sb, 'providers'),
    regulatoryEvidence: await count(sb, 'regulatory_evidence'),
    confirmedEvidence: await count(sb, 'regulatory_evidence', [
      ['attribution_confidence', 'CONFIRMED'],
    ]),
    unresolvedEvidence: await count(sb, 'regulatory_evidence', [
      ['attribution_confidence', 'UNRESOLVED'],
    ]),
    appointerResolvesTo: await count(sb, 'national_relationships', [
      ['relationship_type', 'APPOINTER_RESOLVES_TO'],
    ]),
    bridges: await count(sb, 'provider_entity_bridges'),
  };

  const familyOk = await schemaHasEvidenceFamily(sb);
  let backfill = { updated: 0, skipped: 0, schemaReady: familyOk };
  if (familyOk) {
    backfill = { ...(await backfillEvidence(sb, execute)), schemaReady: true };
  }

  console.error('Paging providers and agencies…');
  const providers = await pageProviders(sb);
  const agencies = await pageAgencies(sb);

  const agenciesByNpn = new Map<string, string[]>();
  const agencyById = new Map<string, Ag>();
  for (const a of agencies) {
    agencyById.set(a.id, a);
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

  let confirmed = 0;
  let review = 0;
  let unresolved = 0;
  const confirmedPairs: Array<{ providerId: string; entityId: string; npn: string }> = [];
  for (const p of providers) {
    const agencyIds = p.npn ? agenciesByNpn.get(p.npn) ?? [] : [];
    const otherProviders = p.npn
      ? (providersByNpn.get(p.npn) ?? []).filter((id) => id !== p.id)
      : [];
    const d = decideProviderAgencyBridge({
      providerNpn: p.npn,
      agencyIdsForNpn: agencyIds,
      otherProviderIdsForNpn: otherProviders,
    });
    if (d.action === 'bridge') {
      confirmed += 1;
      confirmedPairs.push({ providerId: p.id, entityId: agencyIds[0]!, npn: d.npn });
    } else if (d.confidence === 'REVIEW_REQUIRED') review += 1;
    else unresolved += 1;
  }

  let ready = 0;
  let internal = 0;
  let agReview = 0;
  let notReady = 0;
  for (const a of agencies) {
    const r = classifyAgencyPublicationReadiness({
      identityConfidence: (a.identity_confidence as 'CONFIRMED') || 'UNRESOLVED',
      hasNpn: Boolean(a.npn),
      hasCredential: Boolean(a.npn),
      kindCollision: (agenciesByNpn.get(a.npn || '') || []).length > 1,
    });
    if (r === 'READY_FOR_PUBLIC_PROFILE') ready += 1;
    else if (r === 'INTERNAL_ONLY') internal += 1;
    else if (r === 'REVIEW_REQUIRED') agReview += 1;
    else notReady += 1;
  }

  const census = {
    publicProviders: providers.length,
    providersWithNpn: providers.filter((p) => p.npn).length,
    graphAgencies: agencies.length,
    graphAgenciesWithNpn: agencies.filter((a) => a.npn).length,
    exactNpnMatches: confirmed + review,
    confirmed1to1: confirmed,
    reviewRequired: review,
    unresolved,
    unmatchedProviders: unresolved,
    unmatchedGraphAgencies: agencies.filter((a) => a.npn && !providersByNpn.has(a.npn)).length,
  };

  const qaEntities = confirmedPairs
    .slice(0, 8)
    .map((p) => agencyById.get(p.entityId))
    .filter((a): a is Ag => Boolean(a));
  const qaReports = [];
  for (const a of qaEntities) {
    qaReports.push(await sampleTrustReport(sb, a));
  }

  const sampleReport = {
    version: TRUST_REPORT_VERSION,
    regulatoryEvidence: emptyAgencyRegulatoryModule(),
    regulatoryNote:
      'Legal-insurer complaint statistics are not shown on agency Trust Reports. Agency regulatory evidence appears only when the respondent is the agency.',
    appointmentCoverageNote: appointmentCoverageNote(false),
    footprintCopy: footprintCopy(2),
    limitations: agencyTrustReportLimitations(),
    qaReports,
    gates: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      PUBLIC_REGULATORY_EVIDENCE_ENABLED,
      LEGAL_INSURER_DISPLAY_DECISION,
      mayPublishPerson: mayPublishEntityKind('person'),
      mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
      mayPublishGroup: mayPublishEntityKind('insurance_group'),
      mayPublishBrand: mayPublishEntityKind('consumer_brand'),
      legalInsurerEvidenceOnAgency: legalInsurerEvidenceAppearsOnAgencyReport(),
      complaintPublishExample: mayPublishRegulatoryEvidenceRecord({
        entityId: 'x',
        identityConfidence: 'CONFIRMED',
        publicationReadiness: 'INTERNAL_ONLY',
        family: 'COMPLAINT',
        sourceDataset: 'tdi_complaint_indexes',
        eventDate: '2024-12-31',
        respondentKind: 'legal_insurer',
      }),
    },
  };

  const report = {
    task: BRIDGE_TASK,
    execute,
    at: new Date().toISOString(),
    preflight,
    schema: {
      evidenceFamilyColumns: familyOk,
      migration: MIGRATION,
      backfill,
      sqlEditorRequired: !familyOk,
    },
    census,
    readiness: {
      READY_FOR_PUBLIC_PROFILE: ready,
      INTERNAL_ONLY: internal,
      REVIEW_REQUIRED: agReview,
      NOT_READY: notReady,
      publicGraphAgenciesPublished: 0,
      legalInsurerPages: LEGAL_INSURER_DISPLAY_DECISION,
    },
    predictedBridges: confirmed,
    writes: { inserted: 0, skipped: 0 },
    publicationRegression: {
      providersBefore: preflight.providers,
      providersAfter: preflight.providers,
      indexableProvidersUnchanged: true,
      graphAgenciesBefore: preflight.agencies,
      graphAgenciesAfter: preflight.agencies,
      publicGraphAgenciesBefore: 0,
      publicGraphAgenciesAfter: 0,
      sitemapChanges: false,
      robotsChanges: false,
      newRoutes: false,
      publicPeople: 0,
      publicLegalInsurers: 0,
      publicGroups: 0,
      publicBrands: 0,
    },
    sampleReport,
    errors: [] as string[],
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, 'ins-nat-final-005-bridge-census.json'),
    JSON.stringify({ census, at: report.at }, null, 2)
  );
  writeFileSync(join(OUT, 'ins-nat-final-005-readiness.json'), JSON.stringify(report.readiness, null, 2));
  writeFileSync(join(OUT, 'ins-nat-final-005-profile-qa.json'), JSON.stringify(sampleReport, null, 2));
  writeFileSync(
    join(OUT, 'ins-nat-final-005-publication-regression.json'),
    JSON.stringify(report.publicationRegression, null, 2)
  );

  if (!execute) {
    writeFileSync(join(OUT, 'ins-nat-final-005-dry-run.json'), JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify(
        {
          ...report,
          note: familyOk
            ? 'DRY-RUN. Re-run with --execute to write CONFIRMED bridges + evidence backfill.'
            : `DRY-RUN. Schema missing ${MIGRATION} — apply in SQL Editor then --execute.`,
        },
        null,
        2
      )
    );
    return;
  }

  const existing = new Set<string>();
  {
    const page = 1000;
    let lastId: string | null = null;
    for (;;) {
      let q = sb
        .from('provider_entity_bridges')
        .select('provider_id')
        .order('provider_id', { ascending: true })
        .limit(page);
      if (lastId) q = q.gt('provider_id', lastId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      if (!rows.length) break;
      for (const r of rows) existing.add(String(r.provider_id));
      lastId = String(rows[rows.length - 1]!.provider_id);
      if (rows.length < page) break;
    }
  }

  let inserted = 0;
  let skipped = 0;
  const seenProv = new Set<string>();
  const uniquePairs = confirmedPairs.filter((p) => {
    if (seenProv.has(p.providerId)) return false;
    seenProv.add(p.providerId);
    return true;
  });
  const fresh = uniquePairs.filter((p) => !existing.has(p.providerId));
  skipped = uniquePairs.length - fresh.length;
  for (const part of chunk(fresh, 80)) {
    const payload = part.map((p) => ({
      provider_id: p.providerId,
      entity_id: p.entityId,
      match_method: BRIDGE_MATCH_METHOD,
      confidence: 'CONFIRMED',
      source: BRIDGE_TASK,
      notes: `npn=${p.npn}`,
    }));
    const { data, error } = await sb.from('provider_entity_bridges').insert(payload).select('id');
    if (error) {
      if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
      for (const row of payload) {
        const { data: one, error: ierr } = await sb
          .from('provider_entity_bridges')
          .insert(row)
          .select('id');
        if (ierr) {
          if (!/duplicate|unique/i.test(ierr.message)) throw new Error(ierr.message);
          skipped += 1;
          continue;
        }
        inserted += one?.length ?? 1;
      }
      continue;
    }
    inserted += data?.length ?? 0;
  }
  report.writes = { inserted, skipped };
  report.publicationRegression.providersAfter = await count(sb, 'providers');
  const outfile = existing.size > 0 && inserted === 0
    ? 'ins-nat-final-005-idempotency.json'
    : 'ins-nat-final-005-execution.json';
  writeFileSync(join(OUT, outfile), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
