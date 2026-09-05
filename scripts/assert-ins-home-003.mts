import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildInsuranceHomepageEvidenceInventory, INSURANCE_HOME_EVIDENCE_FAMILIES, INSURANCE_HOMEPAGE_STATE_CARDS, assertInsuranceHomepageInventory } from '../lib/metrics/insurance-home-evidence-inventory';
import metricsJson from '../data/home/insurance-network-metrics-v1.json';
import type { InsuranceNetworkMetricsV1 } from '../lib/metrics/insurance-network-metrics-v1';

const errors: string[] = [];
const ok = (condition: unknown, message: string) => { if (!condition) errors.push(message); };
const metrics = metricsJson as InsuranceNetworkMetricsV1;
const inventory = buildInsuranceHomepageEvidenceInventory(metrics);
const page = readFileSync(join(process.cwd(), 'components/home/insurance-home-intelligence.tsx'), 'utf8');
const app = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8');
const byKey = (key: string) => inventory.find((row) => row.key === key);

ok(inventory.length >= 35, 'complete public inventory has at least 35 independently grained measures');
ok(Object.keys(INSURANCE_HOME_EVIDENCE_FAMILIES).length === 10, 'ten evidence families');
ok(inventory.every((row) => ['PUBLIC','PUBLIC_PARTIAL','PUBLIC_UNKNOWN','PUBLIC_RESEARCH_GRAPH'].includes(row.publicationStatus)), 'only allowed publication statuses render');
ok(!inventory.some((row) => row.publicationStatus === 'INTERNAL' || row.publicationStatus === 'REJECTED'), 'internal/rejected excluded');
ok(!inventory.some((row) => row.grain === 'combined_incompatible_grains'), 'no cross-grain total');
ok(byKey('insurance_producer_records')?.publicationStatus === 'PUBLIC_RESEARCH_GRAPH', 'people are research-graph only');
ok(metrics.publication.publicPeople === 0 && metrics.publication.mayPublishPerson === false, 'public people remain zero and disabled');
ok(byKey('public_directory_listings')?.value !== byKey('insurance_agencies')?.value, 'directory listings differ from graph agencies');
ok(byKey('credential_observations')?.grain !== byKey('insurance_agencies')?.grain, 'credentials differ from entities');
ok(byKey('line_of_authority_observations')?.grain !== byKey('credential_observations')?.grain, 'LOA differs from credentials');
ok(byKey('person_appointment_relationships')?.grain !== byKey('insurance_producer_records')?.grain, 'appointments differ from people');
ok(!inventory.some((row) => row.value === metrics.texas.personLicenseRowsUnpublished || row.value === metrics.texas.personAppointmentsUnpublished), 'Texas unpublished person data excluded');
ok(byKey('texas_authorized_companies')?.value === null, 'Texas authorized company unknown is not zero');
ok(byKey('nj_surplus_lines_eligible_companies')?.value === null, 'NJ surplus-lines unknown is not zero');
ok(byKey('ca_admitted_insurer_universe')?.value === null, 'CA admitted universe unknown is not zero');
ok(byKey('wa_oic_regulated_entities_annual_report')?.grain === 'annual_report_entity_aggregate', 'Washington aggregate is not a live roster');
ok(byKey('public_legal_insurer_wave1_profiles')?.doesNotCount.includes('mayPublishEntityKind'), 'Wave-1 profile semantics preserved');
ok(INSURANCE_HOMEPAGE_STATE_CARDS.length === 5, 'five state cards');
ok(INSURANCE_HOMEPAGE_STATE_CARDS.map((s) => s.href).join(',') === '/florida,/texas,/new-jersey,/california,/washington', 'five canonical routes');
ok(!page.includes('href="/arizona"'), 'no Arizona state CTA');
ok(byKey('published_state_intelligence_pages')?.value === INSURANCE_HOMEPAGE_STATE_CARDS.length, 'state count derives from state model');
ok(page.includes('Complaint ≠ proven violation') && page.includes('Exam listing ≠ adverse finding') && page.includes('Rate filing ≠ consumer premium') && page.includes('CMS observation ≠ plan or insurer'), 'semantic guardrails render');
ok(page.includes('generation and deployment dates are not agency source dates'), 'source clock semantics');
ok(!/AggregateRating/.test(page + app), 'no AggregateRating');
ok(!/best insurer|top insurer|recommended insurer/i.test(page), 'no ranking language');
ok(/No paid ranking\. No Trust Score\./.test(page), 'no paid ranking and no Trust Score positioning');

try { assertInsuranceHomepageInventory([{ ...inventory[0]!, publicationStatus: 'INTERNAL' as never }]); errors.push('INTERNAL could render'); } catch {}
if (errors.length) { console.error(`INS-HOME-003 FAIL (${errors.length})`); errors.forEach((e) => console.error(` - ${e}`)); process.exit(1); }
console.log(`INS-HOME-003 PASS · ${inventory.length} measures · ${INSURANCE_HOMEPAGE_STATE_CARDS.length} states`);
