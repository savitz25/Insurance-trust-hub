/**
 * INS-NAT-FINAL-005 agency Trust Report / publication-gate tests.
 *   npm run check:ins-nat-final-005
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  FORBIDDEN_PUBLIC_COPY,
  PUBLIC_REGULATORY_EVIDENCE_ENABLED,
  SAFE_PUBLIC_COPY,
  complaintIsEnforcementFinding,
  complaintIsFinalOrder,
  mayPublishRegulatoryEvidence,
} from '../lib/national/regulatory-evidence';
import {
  FORBIDDEN_COMPLAINT_RENDER,
  LEGAL_INSURER_DISPLAY_DECISION,
  TDI_COMPLAINT_COPY,
  agencyEvidenceAppearsOnPersonReport,
  complaintZeroIsCleanRecord,
  legalInsurerEvidenceAppearsOnAgencyReport,
  mayPublishRegulatoryEvidenceRecord,
} from '../lib/national/regulatory-display';
import {
  decideProviderAgencyBridge,
  extractProviderNpn,
  nameOnlyProviderBridges,
} from '../lib/national/provider-graph-bridge';
import {
  PERSON_APPOINTMENT_TYPE,
  TRUST_REPORT_MODULES,
  TRUST_REPORT_VERSION,
  agencyTrustReportLimitations,
  appointmentIsNotEmployment,
  buildAgencyTrustReport,
  cmsRegistrationIsNotLicense,
  credentialIsNotLoa,
  licensedJurisdictionsAreNotServiceTerritory,
  loaIsNotAppointment,
  personAppointmentsAreNotAgencyAppointments,
} from '../lib/national/agency-trust-report';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const src = readFileSync(join(root, 'scripts/national/run-ins-nat-final-005.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const robots = readFileSync(join(root, 'app/robots.ts'), 'utf8');
const display = readFileSync(join(root, 'lib/national/regulatory-display.ts'), 'utf8');
const reportLib = readFileSync(join(root, 'lib/national/agency-trust-report.ts'), 'utf8');
const mig = readFileSync(
  join(root, 'supabase/migrations/20260827180000_regulatory_evidence_foundation.sql'),
  'utf8'
);

assert(existsSync(join(root, 'lib/national/regulatory-display.ts')), 'display lib');
assert(existsSync(join(root, 'lib/national/provider-graph-bridge.ts')), 'bridge lib');
assert(existsSync(join(root, 'lib/national/agency-trust-report.ts')), 'report lib');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'no provider writes');
assert(!/generate_sitemap|app\/robots/.test(src), 'runner no sitemap/robots');
assert(!/FL-INS-000/.test(src), 'no Florida rollout');
assert(src.includes('--execute'), 'execute gate');
assert(src.includes('SQL Editor'), 'sql editor gate');
assert(PUBLIC_REGULATORY_EVIDENCE_ENABLED === false, 'publication off');
assert(mayPublishRegulatoryEvidence() === false, 'mayPublish false');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people off');
assert(LEGAL_INSURER_DISPLAY_DECISION === 'INTERNAL_ONLY', 'legal insurer option A');

// T1 exact provider NPN bridge
{
  const d = decideProviderAgencyBridge({
    providerNpn: '1234567',
    agencyIdsForNpn: ['ag-1'],
    otherProviderIdsForNpn: [],
  });
  assert(d.action === 'bridge' && d.confidence === 'CONFIRMED' && d.npn === '1234567', 'T1');
}

// T2 name-only provider no bridge
{
  const d = decideProviderAgencyBridge({
    providerNpn: null,
    agencyIdsForNpn: ['ag-1'],
    otherProviderIdsForNpn: [],
  });
  assert(d.action === 'skip' && d.confidence === 'UNRESOLVED', 'T2');
  assert(nameOnlyProviderBridges() === false, 'T2 name never key');
  assert(extractProviderNpn({ npn: null, licenseNotes: 'Allstate Agency Dallas' }) === null, 'T2 notes name');
}

// T3 collision no public bridge
{
  const multiAgency = decideProviderAgencyBridge({
    providerNpn: '1234567',
    agencyIdsForNpn: ['ag-1', 'ag-2'],
    otherProviderIdsForNpn: [],
  });
  assert(multiAgency.action === 'hold' && multiAgency.confidence === 'REVIEW_REQUIRED', 'T3 agencies');
  const multiProv = decideProviderAgencyBridge({
    providerNpn: '1234567',
    agencyIdsForNpn: ['ag-1'],
    otherProviderIdsForNpn: ['p-2'],
  });
  assert(multiProv.action === 'hold' && multiProv.confidence === 'REVIEW_REQUIRED', 'T3 providers');
}

function sampleInput() {
  return {
    entity: {
      id: 'ag-1',
      kind: 'agency' as const,
      npn: '1234567',
      legalName: 'Example Agency LLC',
      displayName: 'Example Agency',
      identityConfidence: 'CONFIRMED',
    },
    credentials: [
      {
        jurisdiction: 'TX',
        licenseNumber: '111',
        licenseClass: 'General Lines',
        regulatoryStatus: 'active',
        issueDate: '2020-01-01',
        expirationDate: '2026-01-01',
        sourceDataset: 'tdi_agencies',
        sourceObservedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        jurisdiction: 'FL',
        licenseNumber: '222',
        licenseClass: 'Agency',
        regulatoryStatus: 'active',
        issueDate: '2019-01-01',
        expirationDate: null,
        sourceDataset: 'dfs_agencies',
        sourceObservedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    loas: [
      { officialText: 'Life', officialCode: 'LIFE', sourceDataset: 'tdi_agencies' },
      { officialText: 'Health', officialCode: 'HLTH', sourceDataset: 'tdi_agencies' },
    ],
    appointments: [
      {
        toEntityId: 'carrier-1',
        relationshipType: 'appointed_by',
        status: 'active',
        sourceDataset: 'dfs_appointments',
        limitation: 'Appointment is not employment, quality, or service territory.',
      },
      {
        toEntityId: 'person-apt',
        relationshipType: PERSON_APPOINTMENT_TYPE,
        status: 'active',
        sourceDataset: 'tx_individual_appointments',
        limitation: 'Appointment is not employment, quality, or service territory.',
      },
    ],
    cms: [
      {
        evidenceType: 'FFM_REGISTRATION',
        planYear: '2026',
        sourceDataset: 'cms_marketplace_observations',
        note: '',
      },
    ],
    contacts: [
      {
        kind: 'phone',
        value: '555-0100',
        sourceDataset: 'tdi_agencies',
        sourceObservedAt: '2026-08-01T00:00:00.000Z',
        publicEligible: true,
      },
      {
        kind: 'email',
        value: 'a@example.com',
        sourceDataset: 'tdi_agencies',
        sourceObservedAt: '2026-08-01T00:00:00.000Z',
        publicEligible: true,
      },
      {
        kind: 'phone',
        value: '555-0199',
        sourceDataset: 'tdi_agencies',
        sourceObservedAt: '2026-08-01T00:00:00.000Z',
        publicEligible: false,
      },
      {
        kind: 'email',
        value: 'a@example.com',
        sourceDataset: 'dfs_agencies',
        sourceObservedAt: '2026-08-05T00:00:00.000Z',
        publicEligible: true,
      },
    ],
    regulatoryCandidates: [
      {
        entityId: 'legal-1',
        identityConfidence: 'CONFIRMED',
        publicationReadiness: 'INTERNAL_ONLY',
        family: 'COMPLAINT',
        sourceDataset: 'tdi_complaint_indexes',
        eventDate: '2024-12-31',
        respondentKind: 'legal_insurer',
      },
    ],
    sources: [
      { authority: 'Texas Department of Insurance', dataset: 'tdi_agencies', asOf: '2026-08-01' },
    ],
    readiness: 'READY_FOR_PUBLIC_PROFILE',
  };
}

const snap = buildAgencyTrustReport(sampleInput());

// T4 agency identity one canonical entity
assert(snap.entity.kind === 'agency' && snap.entity.id === 'ag-1', 'T4 one entity');
assert(TRUST_REPORT_VERSION === 'insurance-agency-trust-report-v1', 'T4 version');

// T5 multiple credentials preserved
assert(snap.credentials.length === 2, 'T5 credentials');
assert(snap.credentials[0]!.licenseNumber === '111' && snap.credentials[1]!.licenseNumber === '222', 'T5 order');

// T6 credential ≠ LOA
assert(credentialIsNotLoa() === true, 'T6');
assert(snap.credentials.length !== snap.loas.length || snap.loas[0]!.officialText !== snap.credentials[0]!.licenseClass, 'T6 arrays distinct');

// T7 LOA ≠ appointment
assert(loaIsNotAppointment() === true, 'T7');
assert(snap.loas.every((l) => !('toEntityId' in l)), 'T7 loa shape');

// T8 appointment ≠ employment
assert(appointmentIsNotEmployment() === true, 'T8');
assert(snap.appointments.every((a) => /not employment/i.test(a.limitation)), 'T8 copy');

// T9 person appointments not agency appointments
assert(personAppointmentsAreNotAgencyAppointments() === true, 'T9');
assert(snap.appointments.every((a) => a.relationshipType !== PERSON_APPOINTMENT_TYPE), 'T9 filtered');

// T10 CMS registration ≠ license
assert(cmsRegistrationIsNotLicense() === true, 'T10');
assert(snap.cms.every((c) => /not a state license/i.test(c.note)), 'T10 note');

// T11 multi-state licensed ≠ serves all states
assert(licensedJurisdictionsAreNotServiceTerritory() === true, 'T11');
assert(!/Serves .* states/i.test(snap.footprintCopy), 'T11 copy');
assert(/jurisdictions in the sources currently included/i.test(snap.footprintCopy), 'T11 footprint');

// T12 multiple contacts preserved, internal_only excluded
assert(snap.contacts.length === 3, 'T12 public contacts only');
assert(snap.contacts[0]!.value === '555-0100' && snap.contacts[1]!.value === 'a@example.com', 'T12 both');
assert(!snap.contacts.some((c) => c.value === '555-0199'), 'T12 internal_only excluded');

// T13 unresolved regulatory evidence hidden
{
  const hidden = mayPublishRegulatoryEvidenceRecord({
    entityId: null,
    identityConfidence: 'UNRESOLVED',
    publicationReadiness: 'INTERNAL_ONLY',
    family: 'COMPLAINT',
    sourceDataset: 'tdi_complaint_indexes',
    eventDate: '2024-12-31',
  });
  assert(hidden.ok === false, 'T13');
}

// T14 complaint ≠ final order
assert(complaintIsFinalOrder() === false, 'T14 final');
assert(complaintIsEnforcementFinding() === false, 'T14 finding');
assert(snap.regulatoryEvidence.length === 0, 'T14 empty module');

// T15 complaint zero ≠ clean
assert(complaintZeroIsCleanRecord() === false, 'T15');
assert(!FORBIDDEN_COMPLAINT_RENDER.some((t) => TDI_COMPLAINT_COPY.explanation.includes(t)), 'T15 copy');
assert(!FORBIDDEN_PUBLIC_COPY.some((t) => agencyTrustReportLimitations().includes(t)), 'T15 limits');

// T16 insurer evidence not inherited by agency
assert(legalInsurerEvidenceAppearsOnAgencyReport() === false, 'T16');
assert(snap.regulatoryEvidence.length === 0, 'T16 empty');

// T17 agency evidence not inherited by people
assert(agencyEvidenceAppearsOnPersonReport() === false, 'T17');

// T18 public people = 0
assert(mayPublishEntityKind('person') === false, 'T18');
assert(!/\/people\//.test(sitemap) && !/person profiles/.test(sitemap), 'T18 sitemap');

// T19 carrier/group/brand gates remain off
assert(mayPublishEntityKind('carrier') === false, 'T19 carrier');
assert(mayPublishEntityKind('legal_insurer') === false, 'T19 legal');
assert(mayPublishEntityKind('insurance_group') === false, 'T19 group');
assert(mayPublishEntityKind('consumer_brand') === false, 'T19 brand');

// T20 no unexpected index expansion
assert(!src.includes("url: `${site}/agencies"), 'T20 no agency routes');
assert(!/national_entities/.test(sitemap), 'T20 sitemap no graph');
assert(/\/admin/.test(robots), 'T20 robots still blocks admin');

// T21 deterministic profile snapshot
{
  const a = JSON.stringify(buildAgencyTrustReport(sampleInput()));
  const b = JSON.stringify(buildAgencyTrustReport(sampleInput()));
  assert(a === b, 'T21');
}

// T22 source/freshness metadata present
assert(snap.sources.length > 0 && snap.sources[0]!.dataset === 'tdi_agencies', 'T22 sources');
assert(snap.limitations.some((l) => /missing data is not evidence of absence/i.test(l)), 'T22 missing');
assert(SAFE_PUBLIC_COPY.heading === 'Regulatory & Enforcement History', 'T22 heading');
assert(TRUST_REPORT_MODULES.includes('Sources & freshness'), 'T22 module');

// T23 migration/backfill idempotent
assert(!/^\s*DROP TABLE/im.test(mig), 'T23 no drop');
assert(!/ALTER TABLE\s+providers/i.test(mig), 'T23 no provider alter');
assert(src.includes("publication_readiness === 'INTERNAL_ONLY'"), 'T23 skip already patched');
assert(src.includes('is_final: false'), 'T23 is_final false');

// T24 second bridge ingest idempotent
assert(src.includes('UNIQUE') || src.includes('existing.has') || src.includes('duplicate'), 'T24 skip existing');
assert(src.includes('provider_entity_bridges'), 'T24 table');

assert(existsSync(join(root, 'docs/national/publication/INS-NAT-FINAL-005-agency-trust-report-contract.md')), 'doc report');
assert(existsSync(join(root, 'docs/national/publication/INS-NAT-FINAL-005-provider-graph-bridge.md')), 'doc bridge');
assert(existsSync(join(root, 'docs/national/publication/INS-NAT-FINAL-005-regulatory-display-contract.md')), 'doc display');
assert(existsSync(join(root, 'docs/national/publication/INS-NAT-FINAL-005-person-verification-contract.md')), 'doc person');
assert(existsSync(join(root, 'docs/national/publication/INS-NAT-FINAL-005-public-copy-contract.md')), 'doc copy');

assert(FORBIDDEN_COMPLAINT_RENDER.includes('Clean record'), 'display forbids clean record');
assert(TDI_COMPLAINT_COPY.heading === 'Complaint Data', 'complaint heading');
assert(/not by itself establish a regulatory violation/i.test(TDI_COMPLAINT_COPY.notFinding), 'complaint not finding');
assert(!/verified expert|approved insurer|independent agent|captive agent/i.test(reportLib), 'no unsafe copy in report lib');

const complaintReady = mayPublishRegulatoryEvidenceRecord({
  entityId: 'legal-1',
  identityConfidence: 'CONFIRMED',
  publicationReadiness: 'READY_FOR_PUBLIC_REVIEW',
  family: 'COMPLAINT',
  sourceDataset: 'tdi_complaint_indexes',
  eventDate: '2024-12-31',
  respondentKind: 'legal_insurer',
});
assert(complaintReady.ok === false, 'complaint still fail-closed even if ready');

// ---------------------------------------------------------------------------
// EA-INS-001 — activate already-owned public business-contact evidence
// ---------------------------------------------------------------------------

const loaderSrc = readFileSync(join(root, 'lib/national/load-agency-trust-report.ts'), 'utf8');
const backfillSrc = readFileSync(
  join(root, 'scripts/national/backfill-contact-observations.ts'),
  'utf8'
);
const identityGraphMig = readFileSync(
  join(root, 'supabase/migrations/20260826120000_national_identity_graph.sql'),
  'utf8'
);

// EA1 exact-entity-gets-contacts / EA9 source clocks preserved
assert(snap.contacts.every((c) => 'sourceObservedAt' in c), 'EA1 sourceObservedAt field present');
assert(snap.contacts[0]!.sourceObservedAt === '2026-08-01T00:00:00.000Z', 'EA1 clock passthrough');

// EA2 cross-source provenance preserved: same value, two source_datasets, both survive
{
  const corroborated = snap.contacts.filter((c) => c.value === 'a@example.com');
  assert(corroborated.length === 2, 'EA2 both corroborating observations preserved');
  const datasets = corroborated.map((c) => c.sourceDataset).sort();
  assert(datasets[0] === 'dfs_agencies' && datasets[1] === 'tdi_agencies', 'EA2 distinct sources cited');
}

// EA3 no cross-profile leakage: loader scopes every graph query to the resolved entity_id
assert(
  /from\('contact_observations'\)[\s\S]{0,300}\.eq\('entity_id', entity\.id\)/.test(loaderSrc),
  'EA3 contact query scoped to entity_id'
);
assert(
  /from\('license_credentials'\)[\s\S]{0,300}\.eq\('entity_id', entity\.id\)/.test(loaderSrc),
  'EA3 credential query scoped to entity_id'
);

// EA4 wrong-entity/no cross-grain leakage: fail-closed unless bridge is CONFIRMED + exact_npn,
// and unless the bridged entity itself is entity_kind === 'agency'
assert(loaderSrc.includes("bridge.confidence !== 'CONFIRMED'"), 'EA4 bridge confidence gate');
assert(loaderSrc.includes("bridge.match_method !== 'exact_npn'"), 'EA4 exact NPN gate');
assert(loaderSrc.includes("entity.entity_kind !== 'agency'"), 'EA4 agency-kind gate');

// EA5 internal_only / non-public never surfaces: loader queries public_eligible = true at the DB level
assert(loaderSrc.includes(".eq('public_eligible', true)"), 'EA5 public_eligible filter at query level');

// EA6 safe field set: named_contact / contact_title are never public_eligible at the source
assert(
  backfillSrc.includes("kind !== 'named_contact' && kind !== 'contact_title'"),
  'EA6 named contact and title excluded from public eligibility upstream'
);
assert(
  !/named_contact|contact_title/.test(loaderSrc),
  'EA6 report loader never special-cases named/title kinds (relies on public_eligible filter alone)'
);

// EA7 same-source exact duplicate collapses safely: enforced by a DB-level unique index,
// never last-write-wins in application code
assert(identityGraphMig.includes('idx_contact_observations_dedupe'), 'EA7 dedupe unique index exists');
assert(
  /idx_contact_observations_dedupe[\s\S]{0,120}entity_id,\s*\n\s*contact_kind,\s*\n\s*source_dataset,\s*\n\s*UPPER\(TRIM\(value\)\)/.test(
    identityGraphMig
  ),
  'EA7 dedupe key is (entity_id, contact_kind, source_dataset, normalized value) — never entity_id+kind alone'
);

// EA8 absent evidence is never rendered as a false "none found" claim: the UI section is
// omitted entirely when there are zero contacts, never replaced with negative copy
const contactSectionSrc = readFileSync(join(root, 'components/agency-trust-report.tsx'), 'utf8');
assert(contactSectionSrc.includes('contactPreview.length > 0 ?'), 'EA8 contact card conditionally rendered');
assert(!/no (public )?contact(s)? (were )?found/i.test(contactSectionSrc), 'EA8 no false none-found copy');

// EA10 uneven-coverage disclosure present in the contact module itself (not just the generic footer)
assert(
  /coverage is uneven and growing/i.test(contactSectionSrc),
  'EA10 contact-specific uneven-coverage disclosure'
);

// EA11 no ranking/Trust Score language introduced specifically by the new contact card
{
  const contactCardMatch = contactSectionSrc.match(
    /Business \/ contact information[\s\S]*?<\/Card>/
  );
  assert(!!contactCardMatch, 'EA11 contact card located');
  assert(
    !/trust score|top.?rated|best agency|recommended/i.test(contactCardMatch?.[0] || ''),
    'EA11 no ranking/score/recommendation language in contact card'
  );
}

if (errors.length) {
  console.error('INS-NAT-FINAL-005 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-FINAL-005 PASS T1-T24, EA1-EA11 publication bridge trust-report + EA-INS-001 contact activation');
