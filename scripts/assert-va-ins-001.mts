import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  VIRGINIA_INTELLIGENCE_GATE,
  CANONICAL_VA_SNAPSHOT_FINGERPRINT,
} from '../lib/virginia-intelligence/publication';
import { assertVirginiaInsurance } from '../lib/virginia-intelligence/snapshot';
import {
  buildVirginiaInsuranceJsonLd,
  vaJsonLdHasForbiddenRatings,
} from '../lib/virginia-intelligence/jsonld';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';

const root = process.cwd();
const snap = assertVirginiaInsurance();
const pub = readFileSync(join(root, 'lib/virginia-intelligence/publication.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const footer = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');
const ui = readFileSync(join(root, 'components/virginia/va-state-page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/virginia/page.tsx'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
const interpret = readFileSync(join(root, 'lib/insurance-ask/interpret.ts'), 'utf8');
const golden = readFileSync(join(root, 'lib/specialist-search/golden-questions.ts'), 'utf8');
const coUi = readFileSync(join(root, 'components/colorado/co-state-page.tsx'), 'utf8');

if (!existsSync(join(root, 'app/virginia/page.tsx'))) throw new Error('missing /virginia');
if (snap.fingerprint !== CANONICAL_VA_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (!pub.includes(snap.fingerprint)) throw new Error('fingerprint not gated');
if (VIRGINIA_INTELLIGENCE_GATE.path !== '/virginia') throw new Error('path');
if (VIRGINIA_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index');
if (!sitemap.includes("'/virginia'")) throw new Error('sitemap');
if (sitemap.includes("'/virginia/")) throw new Error('nested virginia sitemap');
if (!footer.includes('/virginia')) throw new Error('footer');
if (!pkg.includes('assert:va-ins-001')) throw new Error('package script');
if (ui.includes('/virginia/richmond') || ui.includes('/virginia/fairfax')) throw new Error('local routes');
if (!ui.toLowerCase().includes('trust score')) throw new Error('trust score guard');
if (ui.match(/best insurer|worst insurer|safest|recommended insurer/i)) throw new Error('ranking language');
if (snap.producer_roster.count != null) throw new Error('fake producer count');
if (snap.agency_roster.count != null) throw new Error('fake agency count');
if (snap.statistical_report.distinct_naic !== 1546) throw new Error('1546');
if (snap.regulatory_actions.observation_rows !== 124) throw new Error('124 actions');
if (snap.regulatory_actions.distinct_cases !== 79) throw new Error('79 cases');
if (snap.market_conduct.observation_rows !== 117) throw new Error('117 exams');
if (snap.statistical_report.not_current_authorization !== true) throw new Error('stat != current');
if (snap.identity.company_is_not_agency !== true) throw new Error('company vs agency');
if (snap.identity.company_is_not_producer !== true) throw new Error('company vs producer');
if (snap.complaints.complaint_is_not_violation !== true) throw new Error('complaint != violation');
if (snap.surplus_lines.surplus_is_not_admitted !== true) throw new Error('surplus != admitted');
if (snap.identity.name_only !== 'UNSAFE') throw new Error('name-only');
if (snap.naic_crosswalk.read_only !== true) throw new Error('read-only');
if (snap.expansion_ledger.EXISTING_ORGANIZATIONS_ENRICHED !== 0) throw new Error('no enrichment');
if (snap.expansion_ledger.NET_NEW_CANONICAL_LEGAL_INSURERS !== 0) throw new Error('org growth');
if (vaJsonLdHasForbiddenRatings(buildVirginiaInsuranceJsonLd(snap))) throw new Error('jsonld ratings');
if (!interpret.includes('virginia')) throw new Error('search must know Virginia');
if (!golden.includes('licensed insurance agencies in Virginia')) throw new Error('golden VA agency');
if (!golden.includes('Virginia insurance agents')) throw new Error('golden VA producer');
if (interpretInsuranceAskQuery('licensed insurance agencies in Virginia').query.mode !== 'fail_closed') {
  throw new Error('Virginia agencies must fail closed');
}
if (interpretInsuranceAskQuery('Virginia insurance agents').query.mode !== 'fail_closed') {
  throw new Error('Virginia agents must fail closed');
}
if (interpretInsuranceAskQuery('licensed insurance companies in Virginia').query.coverageState !== 'NOT_ACQUIRED') {
  throw new Error('Virginia authorized companies must be NOT_ACQUIRED');
}
if (!coUi.includes('1,839') && !coUi.includes('1839')) throw new Error('Colorado page must remain');
if (page.includes('/colorado') === false && !existsSync(join(root, 'app/colorado/page.tsx'))) {
  throw new Error('Colorado route missing');
}
console.log('assert:va-ins-001 pass', snap.fingerprint.slice(0, 12));
