/**
 * INS-INSURER-002 — regulatory publication gate. Wave 1 = 0.
 *   npm run check:ins-insurer-002
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import { buildInsuranceHomeIntelV1, fingerprintHomeIntel } from '../lib/national/home-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { PUBLIC_REGULATORY_EVIDENCE_ENABLED } from '../lib/national/regulatory-evidence';
import { mayPublishRegulatoryEvidenceRecord } from '../lib/national/regulatory-display';
import { INSURER_SEARCH_RANK } from '../lib/national/legal-insurer-search';
import { emptyLegalInsurerProfile, LEGAL_INSURER_PROFILE_VERSION } from '../lib/national/legal-insurer-profile';
import { nameOnlyRegulatoryJoinAllowed } from '../lib/national/legal-insurer-publication';
import {
  ABSENCE_NOT_CLEAN_RECORD,
  COUNT_NOT_VIOLATIONS,
  FORBIDDEN_REGULATORY_SCORES,
  HELD_SOURCE_FAMILY,
  INS_INSURER_002_DECISION,
  INS_INSURER_002_IDENTITY_ONLY_PAGES,
  INS_INSURER_002_PUBLIC_SOURCE_ALLOWLIST,
  INS_INSURER_002_PUBLISHED_URLS,
  INS_INSURER_002_WAVE1_SIZE,
  OBSERVATION_NOT_VIOLATION,
  REGULATORY_HISTORY_HEADING,
  TDI_COMPLAINT_INDEX_DATASET,
  appointmentsOnLegalInsurerProfileAllowed,
  assertRegulatoryEquations,
  attachedObservationCountIsViolationCount,
  classifyLegalInsurerReadinessV2,
  classifyObservationPublicSafety,
  complaintIndexIsEnforcementAction,
  identityOnlyPagesAllowed,
  inferredInsurerCredentialsAllowed,
  marketplaceOnLegalInsurerProfileAllowed,
  medicareOnLegalInsurerProfileAllowed,
  regulatoryEventGroupKey,
} from '../lib/national/legal-insurer-regulatory-gate';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const HOME_FP = '934a48723912a0bb514f5c5589d9dbd6f682e70af9b9473be3dd8713ff2073d9';
const FL_FP = '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93';
const home = buildInsuranceHomeIntelV1();
assert(home.fingerprint === HOME_FP && home.fingerprint === fingerprintHomeIntel(home), 'homepage fingerprint unchanged');
assert(home.population.legalInsurers.value === 6185, 'legal insurer count reconciled');
assert(home.publicAvailability.publicPeople === 0, 'public people remain 0');
assert(home.publicAvailability.publicGraphAgencies === 0, 'public graph agencies remain 0');
assert(home.publicAvailability.publicLegalInsurers === 0, 'public legal-insurer pages 0');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people unpublished');
assert(mayPublishEntityKind('legal_insurer') === false, 'legal insurer kind unpublished');
assert(PUBLIC_REGULATORY_EVIDENCE_ENABLED === false, 'global regulatory flag remains off');
assert(INS_INSURER_002_PUBLIC_SOURCE_ALLOWLIST.length === 0, 'public-safe allowlist empty');
assert(INS_INSURER_002_DECISION === 'ZERO_PUBLICATION', 'zero publication');
assert(INS_INSURER_002_WAVE1_SIZE === 0, 'wave 1 = 0');
assert(INS_INSURER_002_PUBLISHED_URLS === 0, 'sitemap equals pilot (0)');
assert(identityOnlyPagesAllowed() === false, 'identity-only shells not published');
assert(INS_INSURER_002_IDENTITY_ONLY_PAGES === false, 'identity-only policy NO');
assert(nameOnlyRegulatoryJoinAllowed() === false, 'no name-only joins');
assert(marketplaceOnLegalInsurerProfileAllowed() === false, 'Marketplace excluded');
assert(medicareOnLegalInsurerProfileAllowed() === false, 'Medicare excluded');
assert(appointmentsOnLegalInsurerProfileAllowed() === false, 'appointments excluded');
assert(inferredInsurerCredentialsAllowed() === false, 'credentials not inferred');
assert(complaintIndexIsEnforcementAction() === false, 'no violation inference');
assert(attachedObservationCountIsViolationCount() === false, 'count ≠ violations');
assert(REGULATORY_HISTORY_HEADING === 'Regulatory & Enforcement History', 'heading');
assert(/not a clean record/.test(ABSENCE_NOT_CLEAN_RECORD), 'no clean-record inference');
assert(/not automatically a violation/.test(OBSERVATION_NOT_VIOLATION), 'observation ≠ violation');
assert(/not a count of violations/.test(COUNT_NOT_VIOLATIONS), 'event count semantics');
for (const s of FORBIDDEN_REGULATORY_SCORES) {
  assert(!src('app/page.tsx').toLowerCase().includes(s), `no ${s} on homepage`);
}

const complaintHeld = classifyObservationPublicSafety({
  id: '1',
  entityId: 'e',
  respondentKind: 'legal_insurer',
  sourceDataset: TDI_COMPLAINT_INDEX_DATASET,
  family: 'COMPLAINT',
  subtype: 'CONFIRMED_COMPLAINT_INDEX',
  publicationReadiness: 'INTERNAL_ONLY',
  attributionConfidence: 'CONFIRMED',
  eventDate: '2024-12-31',
  sourceObservedAt: '2026-08-27T00:00:00.000Z',
  recordIdentifier: 'org|2024|Auto|12345',
  matchBasis: 'exact_tdi_naic_id_equals_official_loc_cocode',
});
assert(complaintHeld === 'INTERNAL_ONLY', 'internal-only records excluded');
assert(
  mayPublishRegulatoryEvidenceRecord({
    entityId: 'e',
    identityConfidence: 'CONFIRMED',
    publicationReadiness: 'READY_FOR_PUBLIC_REVIEW',
    family: 'COMPLAINT',
    sourceDataset: TDI_COMPLAINT_INDEX_DATASET,
    eventDate: '2024-12-31',
    respondentKind: 'legal_insurer',
  }).ok === false,
  'COMPLAINT still fail-closed even if flags hypothetically on',
);
assert(
  classifyLegalInsurerReadinessV2({
    entityKind: 'legal_insurer',
    identityConfidence: 'REVIEW_REQUIRED',
    naicCode: '12345',
    duplicateNaic: false,
    publicSafeObservationCount: 1,
    internalOnlyAttachedObservationCount: 0,
    reviewRequiredObservationCount: 0,
  }) === 'REVIEW_REQUIRED',
  'review-required records excluded',
);
assert(
  classifyLegalInsurerReadinessV2({
    entityKind: 'legal_insurer',
    identityConfidence: 'CONFIRMED',
    naicCode: '12345',
    duplicateNaic: false,
    publicSafeObservationCount: 0,
    internalOnlyAttachedObservationCount: 0,
    reviewRequiredObservationCount: 0,
  }) === 'INSUFFICIENT_EVIDENCE',
  'identity-only not PUBLIC_READY',
);
assert(
  regulatoryEventGroupKey({
    sourceDataset: TDI_COMPLAINT_INDEX_DATASET,
    recordIdentifier: 'a|2019|Auto|1',
  }) === `${TDI_COMPLAINT_INDEX_DATASET}|a|2019|Auto|1`,
  'duplicate events handled deterministically',
);

const census = JSON.parse(src('data/reports/ins-insurer-002-census.json'));
const d = census.denominators;
assert(d.R1 === 6185, 'R1');
assert(d.R2 + d.R3 === d.R1, 'R2 + R3 = R1');
assert(d.R5 + d.R6 + d.R7 === d.R4, 'R5 + R6 + R7 = R4');
assert(d.R4 + census.grains.unattached === census.grains.regulatory_evidence_total, 'attached + unattached = total');
assert(d.R5 === 0 && d.R8 === 0, 'no public-safe observations');
assert(d.R6 === d.R4, 'all attached held internal-only');
assert(assertRegulatoryEquations(d).length === 0, 'equations');
assert(census.eligibility.PUBLIC_READY === 0, 'PUBLIC_READY 0');
assert(census.publication.decision === 'ZERO_PUBLICATION', 'census decision');
assert(census.duplicateEvents.extrasVsKeys === 0, 'no ungrouped duplicate extras');
assert(census.nameOnlyJoins === 0, 'no name-only joins in census');
assert(census.inventory.some((i: { dataset: string }) => i.dataset === HELD_SOURCE_FAMILY.dataset), 'source family identified');
assert(census.inventory.every((i: { publicationEligible: boolean }) => i.publicationEligible === false), 'allowlist enforced');
assert(census.inventory[0].retrievedDate, 'source clock present');
assert(census.inventory[0].naicAttachmentMethod.includes('exact'), 'deterministic NAIC attachment');

const profile = emptyLegalInsurerProfile({
  entityId: 'x',
  legalName: 'TEST',
  naicCode: '25178',
  retrievedAt: '2026-08-29T00:00:00.000Z',
});
assert(LEGAL_INSURER_PROFILE_VERSION === 'insurance-legal-insurer-profile-v1', 'reuse contract');
assert(profile.regulatoryEvidence.length === 0, 'no public regulatory rows on empty profile');
assert(profile.score === null && profile.enforcementScore === null && profile.complaintScore === null, 'no regulatory score');
assert(profile.whatThisDoesNotMean.some((s) => /clean record/.test(s)), 'absence semantics on contract');

assert(INSURER_SEARCH_RANK[0] === 'exact_naic', 'search ranking preserved');
assert(INS_INSURER_002_WAVE1_SIZE === 0, '002 did not launch /insurers; 006 owns the pilot');
assert(src('app/sitemap.ts').includes('/carriers'), '/carriers semantics unchanged in sitemap');
assert(src('lib/carriers/registry.ts').includes('Curated carrier identity'), '/carriers brand hub unchanged');
assert(!src('lib/national/home-intel.ts').includes('INS-INSURER-002'), 'no homepage insurer search');
assert(!src('lib/national/fl-state-intel.ts').includes('INS-INSURER-002'), 'florida contract not edited');

const snap = JSON.parse(src('data/reports/fl-ins-006-state-snapshot.json'));
const ready = JSON.parse(src('data/reports/fl-ins-006-profile-readiness.json'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT && view.fingerprint === FL_FP, 'Florida fingerprint unchanged');

if (errors.length) {
  console.error(`INS-INSURER-002 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-INSURER-002 PASS');
console.log('decision', INS_INSURER_002_DECISION);
console.log('R', d);
console.log('eligibility', census.eligibility);
console.log('homepage', home.fingerprint);
console.log('florida', view.fingerprint);
