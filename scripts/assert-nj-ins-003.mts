import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { NEW_JERSEY_INTELLIGENCE_GATE, CANONICAL_NJ_SNAPSHOT_FINGERPRINT } from '../lib/new-jersey-intelligence/publication';
import { NEW_JERSEY_SNAPSHOT } from '../lib/new-jersey-intelligence/snapshot';
import { attachNjInsuranceEvidence } from '../lib/new-jersey-intelligence/profile-attachment';
import {
  buildNewJerseyInsuranceJsonLd,
  njJsonLdHasForbiddenRatings,
} from '../lib/new-jersey-intelligence/jsonld';
import { FLORIDA_INDEXABLE, FLORIDA_ROUTE } from '../lib/national/fl-state-intel';
import { PUBLIC_PERSON_PROFILES_ENABLED } from '../lib/national/publication';

const sitemap = readFileSync('app/sitemap.ts', 'utf8');
const robots = readFileSync('app/robots.ts', 'utf8');
const page = readFileSync('app/new-jersey/page.tsx', 'utf8');
const ui = readFileSync('components/new-jersey/nj-state-page.tsx', 'utf8');
const pkg = readFileSync('package.json', 'utf8');
const footer = readFileSync('lib/design/insurance-design-system.ts', 'utf8');
const home = readFileSync('components/home/insurance-home-intelligence.tsx', 'utf8');
const bail = readFileSync('lib/directory/bail-bond-publication.ts', 'utf8');
const s = NEW_JERSEY_SNAPSHOT;

assert.equal(existsSync('app/new-jersey/page.tsx'), true);
assert.equal(NEW_JERSEY_INTELLIGENCE_GATE.path, '/new-jersey');
assert.equal(NEW_JERSEY_INTELLIGENCE_GATE.robotsIndex, true);
assert.equal(NEW_JERSEY_INTELLIGENCE_GATE.sitemap, true);
assert.match(page, /noIndex:\s*!NEW_JERSEY_INTELLIGENCE_GATE\.robotsIndex/);
assert.match(page, /canonical|path:\s*NEW_JERSEY_INTELLIGENCE_GATE\.path/);
assert.match(sitemap, /\/new-jersey/);
assert.doesNotMatch(robots, /\/new-jersey/);
assert.match(footer, /\/new-jersey/);
assert.match(home, /\/new-jersey/);
assert.match(pkg, /assert:nj-ins-003/);

assert.equal(s.fingerprint, CANONICAL_NJ_SNAPSHOT_FINGERPRINT);
assert.equal(s.fingerprint.length, 64);
assert.equal(s.authorization.admitted, 1370);
assert.equal(s.authorization.exact_naic, 1370);
assert.equal(s.authorization.classes.ADMITTED_INSURER, 1370);
assert.equal(s.authorization.surplus_lines_eligible, null);
assert.notEqual(s.authorization.admitted, s.authorization.surplus_lines_eligible);

assert.equal(s.enforcement.events, 3821);
assert.equal(s.enforcement.unique_orders, 3748);
assert.equal(s.enforcement.bfd.events, 2241);
assert.equal(s.enforcement.bfd.class_counts.CONSENT_ORDER, 2241);
assert.equal(s.document_depth.document_links, 3392);
assert.equal(s.document_depth.unique_hashes, 3356);
assert.notEqual(s.enforcement.events, s.document_depth.unique_hashes);

assert.equal(s.market_conduct.reports, 93);
assert.equal(s.financial_exams.reports, 129);
assert.equal(s.financial_exams.exact_naic, 117);
assert.equal(s.market_conduct.converted_to_enforcement, 0);
assert.equal(s.auto_complaints.rows, 50);
assert.equal(s.auto_complaints.group_grain_rows, 31);
assert.equal(s.ihc.rate_change_observations, 42);
assert.equal(s.ihc.exact_naic, 0);
assert.equal(s.serff.filings_displayed, null);
assert.equal(s.crib.publication_allowed, false);
assert.equal(s.crib.rows_rendered, 0);
assert.equal(s.rehab.entities, 12);
assert.equal(s.profile_modules.public_profile_links_rendered, 0);
assert.equal(s.publication.county_routes, false);

assert.match(ui, /SOURCE_NOT_ACQUIRED/);
assert.match(ui, /not a finding[\s\S]*zero actions/i);
assert.match(ui, /blocked source is not[\s\S]*zero filings/i);
assert.match(ui, /valid complaint is not[\s\S]*violation/i);
assert.match(ui, /IHC is not SEH/);
assert.match(ui, /not a voluntary insurer/i);
assert.doesNotMatch(ui, /serving every New Jersey consumer/i);
assert.doesNotMatch(ui, /best carrier|worst insurer|Trust Score is/i);
assert.doesNotMatch(sitemap, /['"]\/new-jersey\/[a-z]/);

const withheld = attachNjInsuranceEvidence({ matchStatus: 'REVIEW_REQUIRED', naicCocode: '10064' });
assert.equal(withheld.status, 'WITHHELD');
const individual = attachNjInsuranceEvidence({ isIndividual: true, matchStatus: 'EXACT', naicCocode: '10064' });
assert.equal(individual.status, 'WITHHELD');
const unresolved = attachNjInsuranceEvidence({ matchStatus: 'UNRESOLVED', naicCocode: '10064' });
assert.equal(unresolved.status, 'WITHHELD');

const jsonld = buildNewJerseyInsuranceJsonLd(s);
assert.equal(njJsonLdHasForbiddenRatings(jsonld), false);
assert.match(JSON.stringify(jsonld), /WebPage/);

assert.equal(FLORIDA_ROUTE, '/florida');
assert.equal(FLORIDA_INDEXABLE, true);
assert.equal(PUBLIC_PERSON_PROFILES_ENABLED, false);
assert.match(bail, /excludeFromConsumerDirectory/);
assert.equal(existsSync('app/hubs/[state]/[slug]/page.tsx') || existsSync('app/hubs'), true);
assert.equal(existsSync('.vercel/project.json'), false);
assert.equal(existsSync('docs/nj-ins-003-crib-publication-review.md'), true);

console.log('NJ-INS-003 assertions: PASS');
console.log(`  admitted ${s.authorization.admitted} · events ${s.enforcement.events}`);
console.log(`  fingerprint ${s.fingerprint}`);
