import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OHIO_INTELLIGENCE_GATE, CANONICAL_OH_SNAPSHOT_FINGERPRINT } from '../lib/ohio-intelligence/publication';
import { assertOhioInsurance } from '../lib/ohio-intelligence/snapshot';
import { buildOhioInsuranceJsonLd, ohJsonLdHasForbiddenRatings } from '../lib/ohio-intelligence/jsonld';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const root = process.cwd();
const snap = assertOhioInsurance();
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const footer = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');
const ui = readFileSync(join(root, 'components/ohio/oh-state-page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/ohio/page.tsx'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
const interpret = readFileSync(join(root, 'lib/insurance-ask/interpret.ts'), 'utf8');
const golden = readFileSync(join(root, 'lib/specialist-search/golden-questions.ts'), 'utf8');
const published = readFileSync(join(root, 'lib/seo/published-state-path.ts'), 'utf8');

if (!existsSync(join(root, 'app/ohio/page.tsx'))) throw new Error('missing /ohio');
if (snap.fingerprint !== CANONICAL_OH_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (OHIO_INTELLIGENCE_GATE.path !== '/ohio') throw new Error('path');
if (OHIO_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index');
if (!sitemap.includes("'/ohio'")) throw new Error('sitemap');
if ((sitemap.match(/'\/ohio'/g) || []).length !== 1) throw new Error('sitemap once');
if (sitemap.includes("'/ohio/")) throw new Error('nested ohio sitemap');
if (!footer.includes('/ohio')) throw new Error('footer');
if (ui.includes('/ohio/columbus') || ui.includes('/ohio/cleveland')) throw new Error('local routes');
if (ui.includes('Pennsylvania Insurance Department') || ui.includes('NCDOI') || ui.includes('IDOI')) {
  throw new Error('other-state residue');
}
if (!interpret.toLowerCase().includes('ohio')) throw new Error('ask ohio');
if (!golden.includes('Ohio')) throw new Error('golden ohio');
if (!published.includes("'ohio'")) throw new Error('published-state registry');
if (!pkg.includes('assert:oh-ins-001')) throw new Error('package script');
if (ohJsonLdHasForbiddenRatings(buildOhioInsuranceJsonLd(snap))) throw new Error('jsonld ratings');
if (page.includes('aggregateRating')) throw new Error('schema rating');
if (!ui.toLowerCase().includes('trust score')) throw new Error('trust score guard');
if (ui.match(/best insurer|worst insurer/i)) throw new Error('ranking language');
if (/safest/.test(ui) && !/not the safest/.test(ui)) throw new Error('ranking language');
if (normalizedPublishedStatePath('/Ohio') !== '/ohio') throw new Error('308 helper Ohio');
if (normalizedPublishedStatePath('/OHIO') !== '/ohio') throw new Error('OH caps');
if (normalizedPublishedStatePath('/oHiO') !== '/ohio') throw new Error('OH mixed');
if (normalizedPublishedStatePath('/ohio') !== null) throw new Error('canonical no redirect');
if (normalizedPublishedStatePath('/Ohio/columbus') !== null) throw new Error('no local normalize');
if (!existsSync(join(root, 'app/north-carolina/page.tsx'))) throw new Error('North Carolina route missing');

const agencies = interpretInsuranceAskQuery('insurance agencies Ohio');
if (agencies.query.mode !== 'fail_closed') throw new Error('agencies must fail closed');
if (agencies.query.requestedProduct?.length) throw new Error('generic agencies must not carry product');
if (!/23,922|23922/.test(agencies.query.failReason ?? '')) throw new Error('cite agency union');
const homeowners = interpretInsuranceAskQuery('homeowners insurance agencies Ohio');
if (homeowners.query.mode !== 'fail_closed') throw new Error('homeowners must fail closed');
if (!homeowners.query.requestedProduct?.includes('homeowners')) throw new Error('homeowners product retained');
if (homeowners.query.failReason === agencies.query.failReason) {
  throw new Error('SQA-009: homeowners must not silently become generic Ohio agencies');
}
const auto = interpretInsuranceAskQuery('auto insurance agencies Ohio');
if (auto.query.mode !== 'fail_closed') throw new Error('auto must fail closed');
if (!auto.query.requestedProduct?.includes('auto')) throw new Error('auto product retained');
if (auto.query.failReason === agencies.query.failReason) {
  throw new Error('SQA-009: auto must not silently become generic Ohio agencies');
}
const life = interpretInsuranceAskQuery('life insurance agencies Ohio');
if (life.query.mode !== 'fail_closed') throw new Error('life agencies fail closed');
if (!/16,306|16306/.test(life.query.failReason ?? '')) throw new Error('cite life LOA');
const health = interpretInsuranceAskQuery('health insurance agencies Ohio');
if (health.query.mode !== 'fail_closed') throw new Error('health agencies fail closed');
if (!/16,132|16132/.test(health.query.failReason ?? '')) throw new Error('cite A&H LOA');
const companies = interpretInsuranceAskQuery('insurance companies Ohio');
if (companies.query.mode !== 'fail_closed') throw new Error('companies stay research-cited');
if (!/1,738|1738/.test(companies.query.failReason ?? '')) throw new Error('cite 1738');
const authorized = interpretInsuranceAskQuery('authorized insurance companies Ohio');
if (authorized.query.mode !== 'fail_closed') throw new Error('authorized companies');
if (!/1,738|1738/.test(authorized.query.failReason ?? '')) throw new Error('cite authorized 1738');
const complaints = interpretInsuranceAskQuery('Ohio insurance complaints');
if (complaints.query.mode !== 'fail_closed') throw new Error('complaints grain');
if (!/not zero|search-only|intake/i.test(complaints.query.failReason ?? '')) throw new Error('complaints not zero');
const actions = interpretInsuranceAskQuery('insurance administrative actions Ohio');
if (actions.query.mode !== 'fail_closed') throw new Error('journal grain');
if (!/496/.test(actions.query.failReason ?? '')) throw new Error('cite 496');
const agentDisc = interpretInsuranceAskQuery('insurance agent disciplinary action Ohio');
if (agentDisc.query.mode !== 'fail_closed') throw new Error('agent discipline');
const agencyDisc = interpretInsuranceAskQuery('insurance agency disciplinary action Ohio');
if (agencyDisc.query.mode !== 'fail_closed') throw new Error('agency discipline');
const companyAction = interpretInsuranceAskQuery('insurance company action Ohio');
if (companyAction.query.mode !== 'fail_closed') throw new Error('company action');
if (!/496/.test(companyAction.query.failReason ?? '')) throw new Error('company action cites journal');
const financial = interpretInsuranceAskQuery('Ohio insurer financial data');
if (financial.query.mode !== 'fail_closed') throw new Error('financial grain');
const agents = interpretInsuranceAskQuery('insurance agents Ohio');
if (agents.query.mode !== 'fail_closed') throw new Error('agents grain');
const best = interpretInsuranceAskQuery('best insurance company Ohio');
if (best.query.mode !== 'fail_closed') throw new Error('ranking');
const bestAgency = interpretInsuranceAskQuery('best insurance agency Ohio');
if (bestAgency.query.mode !== 'fail_closed') throw new Error('agency ranking');
const columbus = interpretInsuranceAskQuery('insurance company Columbus');
if (columbus.query.mode !== 'fail_closed') throw new Error('columbus');
const cleveland = interpretInsuranceAskQuery('insurance agency Cleveland');
if (cleveland.query.mode !== 'fail_closed') throw new Error('cleveland');
const npn = interpretInsuranceAskQuery('NPN 40000001 Ohio');
if (npn.query.mode !== 'identifier') throw new Error('NPN identifier path');
const naic = interpretInsuranceAskQuery('NAIC 10399 Ohio');
if (naic.query.mode !== 'identifier') throw new Error('NAIC identifier path');
const credentialed = interpretInsuranceAskQuery('agencies credentialed in Ohio');
if (credentialed.query.mode === 'fail_closed' && /23,922|23922/.test(credentialed.query.failReason ?? '')) {
  throw new Error('credentialed-in-Ohio must not be overwritten by statewide mailing-list fail_closed');
}

console.log('assert:oh-ins-001 pass', snap.fingerprint.slice(0, 12));
