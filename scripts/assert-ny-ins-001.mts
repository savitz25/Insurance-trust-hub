import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  NEW_YORK_INTELLIGENCE_GATE,
  CANONICAL_NY_SNAPSHOT_FINGERPRINT,
} from '../lib/new-york-intelligence/publication';
import { assertNewYorkInsurance } from '../lib/new-york-intelligence/snapshot';
import {
  buildNewYorkInsuranceJsonLd,
  nyJsonLdHasForbiddenRatings,
} from '../lib/new-york-intelligence/jsonld';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';

const root = process.cwd();
const snap = assertNewYorkInsurance();
const pub = readFileSync(join(root, 'lib/new-york-intelligence/publication.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const footer = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');
const ui = readFileSync(join(root, 'components/new-york/ny-state-page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/new-york/page.tsx'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
const interpret = readFileSync(join(root, 'lib/insurance-ask/interpret.ts'), 'utf8');
const golden = readFileSync(join(root, 'lib/specialist-search/golden-questions.ts'), 'utf8');
const vaUi = readFileSync(join(root, 'components/virginia/va-state-page.tsx'), 'utf8');

if (!existsSync(join(root, 'app/new-york/page.tsx'))) throw new Error('missing /new-york');
if (snap.fingerprint !== CANONICAL_NY_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (!pub.includes(snap.fingerprint)) throw new Error('fingerprint not gated');
if (NEW_YORK_INTELLIGENCE_GATE.path !== '/new-york') throw new Error('path');
if (NEW_YORK_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index');
if (!sitemap.includes("'/new-york'")) throw new Error('sitemap');
if (sitemap.includes("'/new-york/")) throw new Error('nested new-york sitemap');
if (!footer.includes('/new-york')) throw new Error('footer');
if (!pkg.includes('assert:ny-ins-001')) throw new Error('package script');
if (
  ui.includes('/new-york/new-york-city') ||
  ui.includes('/manhattan') ||
  ui.includes('/brooklyn') ||
  ui.includes('/queens')
) {
  throw new Error('local routes');
}
if (!ui.toLowerCase().includes('trust score')) throw new Error('trust score guard');
if (ui.match(/best insurer|worst insurer|safest insurer|recommended insurer/i)) {
  throw new Error('ranking language');
}
if (ui.match(/authorized insurers/i) && !ui.match(/not currently authorized/i) && !ui.match(/not current writing/i)) {
  throw new Error('ambiguous authorized-insurer hero');
}
if (snap.producer_roster.count != null) throw new Error('fake producer count');
if (snap.agency_roster.count != null) throw new Error('fake agency count');
if (snap.company_directory.directory_rows !== 1054) throw new Error('1054');
if (snap.enforcement_actions.observation_rows !== 147) throw new Error('147 actions');
if (snap.auto_complaints.observation_rows !== 128) throw new Error('128 auto');
if (snap.company_directory.row_is_not_current_authorization !== true) throw new Error('dir != current');
if (snap.identity.company_is_not_agency !== true) throw new Error('company vs agency');
if (snap.identity.company_is_not_producer !== true) throw new Error('company vs producer');
if (snap.auto_complaints.complaint_is_not_violation !== true) throw new Error('complaint != violation');
if (snap.identity.name_only !== 'UNSAFE') throw new Error('name-only');
if (snap.naic_crosswalk.read_only !== true) throw new Error('read-only');
if (snap.expansion_ledger.EXISTING_ORGANIZATIONS_ENRICHED !== 0) throw new Error('no enrichment');
if (snap.expansion_ledger.NET_NEW_CANONICAL_LEGAL_INSURERS !== 0) throw new Error('org growth');
if (nyJsonLdHasForbiddenRatings(buildNewYorkInsuranceJsonLd(snap))) throw new Error('jsonld ratings');
if (!interpret.includes('new york')) throw new Error('search must know New York');
if (!golden.includes('licensed insurance agencies in New York')) throw new Error('golden NY agency');
if (!golden.includes('New York insurance agents')) throw new Error('golden NY producer');
if (interpretInsuranceAskQuery('licensed insurance agencies in New York').query.mode !== 'fail_closed') {
  throw new Error('New York agencies must fail closed');
}
if (interpretInsuranceAskQuery('New York insurance agents').query.mode !== 'fail_closed') {
  throw new Error('New York agents must fail closed');
}
if (interpretInsuranceAskQuery('licensed insurance companies in New York').query.coverageState !== 'NOT_ACQUIRED') {
  throw new Error('New York authorized companies must be NOT_ACQUIRED');
}
if (interpretInsuranceAskQuery('best auto insurer in New York').query.mode !== 'fail_closed') {
  throw new Error('best auto insurer must fail closed');
}
if (!vaUi.includes('Virginia Insurance Market')) throw new Error('Virginia page must remain');
if (!existsSync(join(root, 'app/virginia/page.tsx'))) throw new Error('Virginia route missing');
if (!existsSync(join(root, 'app/colorado/page.tsx'))) throw new Error('Colorado route missing');
console.log('assert:ny-ins-001 pass', snap.fingerprint.slice(0, 12));
