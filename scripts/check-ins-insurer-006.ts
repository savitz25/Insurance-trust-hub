/**
 * INS-INSURER-006 — legal-insurer public profile pilot. Wave 1 = 26.
 *   npm run check:ins-insurer-006
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { CANONICAL_SNAPSHOT_FINGERPRINT } from '../lib/national/fl-state-intel';
import { buildFloridaStateView } from '../lib/national/fl-state-display';
import { buildInsuranceHomeIntelV1, fingerprintHomeIntel } from '../lib/national/home-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { INSURER_SEARCH_RANK } from '../lib/national/legal-insurer-search';
import { marketConductIsEnforcementAction, financialExaminationIsEnforcementAction } from '../lib/national/legal-insurer-examination';
import { INS_INSURER_005B_COHORT_FINGERPRINT, PUBLIC_EXAM_COPY } from '../lib/national/legal-insurer-exam-ingest';
import {
  ABSENCE_NOT_NEVER_EXAMINED,
  INS_INSURER_006_EVIDENCE_WRITES,
  INS_INSURER_006_IDENTITY_WRITES,
  INS_INSURER_006_LANDING_SITEMAP,
  INS_INSURER_006_PROFILE_SITEMAP_DELTA,
  INS_INSURER_006_WAVE1_SIZE,
  PILOT_SIZE_COPY,
  PUBLISHED_INSURERS,
  SLUG_AUDIT,
  WHAT_THIS_DOES_NOT_MEAN,
  WHAT_THIS_MEANS,
  attachmentConsumerCopy,
  buildPilotProfile,
  findUnpublishedIdentity,
  getPublishedBySlug,
  mayPublishLegalInsurerPilot,
  publicSearchForbidden,
  publishedProfileSitemapPaths,
  qualityBadgeForbidden,
  searchPublishedInsurers,
} from '../lib/national/legal-insurer-pilot';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}
const root = join(__dirname, '..');
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const HOME_FP = '7474172a3996c574e26058be24b6af5149765f801660ddedba9d5508ef332fc1';
const FL_FP = '8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93';
const home = buildInsuranceHomeIntelV1();
assert(home.fingerprint === HOME_FP && home.fingerprint === fingerprintHomeIntel(home), '35 homepage fingerprint unchanged');
assert(home.publicAvailability.publicPeople === 0, '37 public people 0');
assert(home.publicAvailability.publicGraphAgencies === 0, '38 public graph agencies 0');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'people unpublished');
assert(mayPublishEntityKind('legal_insurer') === false, 'kind flag remains false; cohort gate publishes');
assert(INS_INSURER_006_WAVE1_SIZE === 26 && PUBLISHED_INSURERS.length === 26, '1 published cohort exactly 26');
assert(INS_INSURER_005B_COHORT_FINGERPRINT === '9fae2c8fba13789a0445b50eae7af15a48c9cda3662d4ce8c31c0d6b4d488681', '2 cohort fingerprint');
assert(
  PUBLISHED_INSURERS.every((p) => /^\d{5}$/.test(p.naic_cocode)),
  '3 every published profile has exact NAIC'
);
assert(
  PUBLISHED_INSURERS.every((p) => p.examination_count >= 1 && p.public_safe_status === 'PUBLIC_SAFE'),
  '4 every published profile has ≥1 PUBLIC_SAFE exam'
);
assert(!mayPublishLegalInsurerPilot({ entityKind: 'legal_insurer', naicCocode: '25178' }), '5 non-cohort cannot publish');
assert(!mayPublishLegalInsurerPilot({ entityKind: 'legal_insurer', entityId: 'not-a-cohort' }), '6 no identity-only shell');
assert(new Set(PUBLISHED_INSURERS.map((p) => p.slug)).size === 26, '7 26 unique slugs');
assert(SLUG_AUDIT.duplicateUrlCount === 0 && SLUG_AUDIT.resolvedSlugCollisions.length === 0, '8 slug collision deterministic, 0 duplicates');

const naicHit = searchPublishedInsurers('21652');
assert(naicHit[0]?.match === 'exact_naic' && naicHit[0]?.naicCode === '21652', '9 exact NAIC search first');
const nameHit = searchPublishedInsurers('FARMERS INS EXCH');
assert(nameHit[0]?.match === 'exact_legal_name' || nameHit[0]?.match === 'exact_naic', '10 exact legal-name search');
assert(INSURER_SEARCH_RANK[0] === 'exact_naic' && INSURER_SEARCH_RANK[1] === 'exact_legal_name', 'search rank order');
assert(publicSearchForbidden('complaint index') && publicSearchForbidden('exam count') && publicSearchForbidden('paid'), '12-14 forbidden ranking');
assert(marketConductIsEnforcementAction() === false && financialExaminationIsEnforcementAction() === false, '15 examination ≠ enforcement');
assert(/misconduct/.test(PUBLIC_EXAM_COPY.notMisconduct), '16 examination ≠ violation');
assert(!WHAT_THIS_MEANS.toLowerCase().includes('complaint index'), '17 examination ≠ complaint');
assert(/never been examined/.test(ABSENCE_NOT_NEVER_EXAMINED), '18 absence ≠ never examined');

const sample = buildPilotProfile(PUBLISHED_INSURERS.find((p) => p.naic_cocode === '21652')!);
assert(!JSON.stringify(sample).toLowerCase().includes('tdi_complaint'), '19 TDI not in public payload');
assert(sample.complaintScore === null, '20 complaintScore null');
assert(sample.enforcementScore === null, '21 enforcementScore null');
assert(sample.score === null && sample.trustRating === null, '22 no Trust Score');
assert(sample.recommendation === null, '23 no recommendation');
assert(!qualityBadgeForbidden(PILOT_SIZE_COPY), '24 no quality badge in size copy');
assert(WHAT_THIS_DOES_NOT_MEAN.some((s) => /internal publication status/.test(s)), '25 PUBLIC_READY not quality');
assert(sample.examinationReports.every((r) => Boolean(r.officialSource)), '26 official source link present');
assert(sample.traceability === 'Trace This Record' && sample.sourceClocks.length > 0, '27 Trace provenance present');
assert(/NAIC company code|examination subjects/.test(attachmentConsumerCopy(sample.examinationReports[0]!.attachmentMethod)), '28 attachment method understandable');
assert(sample.limitations.length >= 4, '29 limitations present');

assert(existsSync(join(root, 'app/insurers/page.tsx')), '30 /insurers landing exists');
const farmers = PUBLISHED_INSURERS.find((p) => p.naic_cocode === '21652')!;
assert(getPublishedBySlug(farmers.slug)?.naic_cocode === '21652', '31 published route resolvable');
assert(getPublishedBySlug('not-a-published-insurer') === null, '32 non-published slug 404');
assert(getPublishedBySlug('invalid') === null, '32 invalid slug 404');
assert(publishedProfileSitemapPaths().length === 26 && INS_INSURER_006_PROFILE_SITEMAP_DELTA === 26, '33 sitemap dynamic profile delta = 26');
assert(INS_INSURER_006_LANDING_SITEMAP === 1, 'static /insurers landing sitemap handling = 1');
assert(src('app/sitemap.ts').includes('/carriers'), '34 /carriers unchanged');
assert(!src('lib/national/home-intel.ts').includes('INS-INSURER-006'), '35 homepage not edited');
assert(!src('lib/national/fl-state-intel.ts').includes('INS-INSURER-006'), '36 florida not edited');
assert(!src('lib/carriers/registry.ts').includes('INS-INSURER-006'), '34 carriers registry unchanged by 006 tag');
assert(INS_INSURER_006_IDENTITY_WRITES === 0 && INS_INSURER_006_EVIDENCE_WRITES === 0, '40 no identity/evidence mutations');

const landing = src('app/insurers/page.tsx');
assert(landing.includes('Research legal insurance companies'), 'landing H1');
assert(landing.includes('UNPUBLISHED_COPY'), 'unpublished copy');
assert(!/best insurance|trusted insurers|safest insurers/i.test(landing), 'no ranking copy');
const profilePage = src('app/insurers/[slug]/page.tsx');
assert(profilePage.includes('dynamicParams = false'), 'unknown slugs fail closed');
assert(src('components/insurers/legal-insurer-profile-view.tsx').includes('<h1'), 'one H1 in profile view');
assert(!src('components/insurers/legal-insurer-profile-view.tsx').includes('Trust Score'), 'no Trust Score UI');
assert(src('app/sitemap.ts').includes('publishedProfileSitemapPaths'), 'sitemap uses 26-profile helper');

const unpublished = findUnpublishedIdentity('25178');
assert(unpublished && unpublished.naicCocode === '25178', 'outside-cohort identity detectable without profile link');

const snap = JSON.parse(src('data/reports/fl-ins-006-state-snapshot.json'));
const ready = JSON.parse(src('data/reports/fl-ins-006-profile-readiness.json'));
const view = buildFloridaStateView(snap, ready);
assert(view.fingerprint === CANONICAL_SNAPSHOT_FINGERPRINT && view.fingerprint === FL_FP, '36 Florida fingerprint');

if (errors.length) {
  console.error(`INS-INSURER-006 FAIL (${errors.length})`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-INSURER-006 PASS');
console.log('wave1', INS_INSURER_006_WAVE1_SIZE);
console.log('slugs', SLUG_AUDIT);
console.log('sitemapProfiles', publishedProfileSitemapPaths().length);
console.log('landingSitemap', INS_INSURER_006_LANDING_SITEMAP);
console.log('homepage', home.fingerprint);
console.log('florida', view.fingerprint);
