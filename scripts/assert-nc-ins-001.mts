import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NORTH_CAROLINA_INTELLIGENCE_GATE, CANONICAL_NC_SNAPSHOT_FINGERPRINT } from '../lib/north-carolina-intelligence/publication';
import { assertNorthCarolinaInsurance } from '../lib/north-carolina-intelligence/snapshot';
import { buildNorthCarolinaInsuranceJsonLd, ncJsonLdHasForbiddenRatings } from '../lib/north-carolina-intelligence/jsonld';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const root = process.cwd();
const snap = assertNorthCarolinaInsurance();
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const footer = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');
const ui = readFileSync(join(root, 'components/north-carolina/nc-state-page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/north-carolina/page.tsx'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
const interpret = readFileSync(join(root, 'lib/insurance-ask/interpret.ts'), 'utf8');
const golden = readFileSync(join(root, 'lib/specialist-search/golden-questions.ts'), 'utf8');
const published = readFileSync(join(root, 'lib/seo/published-state-path.ts'), 'utf8');

if (!existsSync(join(root, 'app/north-carolina/page.tsx'))) throw new Error('missing /north-carolina');
if (snap.fingerprint !== CANONICAL_NC_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (NORTH_CAROLINA_INTELLIGENCE_GATE.path !== '/north-carolina') throw new Error('path');
if (NORTH_CAROLINA_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index');
if (!sitemap.includes("'/north-carolina'")) throw new Error('sitemap');
if ((sitemap.match(/'\/north-carolina'/g) || []).length !== 1) throw new Error('sitemap once');
if (sitemap.includes("'/north-carolina/")) throw new Error('nested north-carolina sitemap');
if (!footer.includes('/north-carolina')) throw new Error('footer');
if (ui.includes('/north-carolina/charlotte') || ui.includes('/north-carolina/raleigh')) {
  throw new Error('local routes');
}
if (ui.includes('Pennsylvania Insurance Department') || ui.includes('PID Licensed') || ui.includes('IDOI') || ui.includes('DFR')) {
  throw new Error('other-state residue');
}
if (!interpret.includes('north carolina') && !interpret.includes('northCarolina')) throw new Error('ask nc');
if (!golden.includes('North Carolina')) throw new Error('golden nc');
if (!published.includes("'north-carolina'")) throw new Error('published-state registry');
if (!pkg.includes('assert:nc-ins-001')) throw new Error('package script');
if (ncJsonLdHasForbiddenRatings(buildNorthCarolinaInsuranceJsonLd(snap))) throw new Error('jsonld ratings');
if (page.includes('aggregateRating')) throw new Error('schema rating');
if (!ui.toLowerCase().includes('trust score')) throw new Error('trust score guard');
if (ui.match(/best insurer|worst insurer/i)) throw new Error('ranking language');
if (/safest/.test(ui) && !/not the safest/.test(ui)) throw new Error('ranking language');
if (normalizedPublishedStatePath('/North-Carolina') !== '/north-carolina') throw new Error('308 helper NC');
if (normalizedPublishedStatePath('/NORTH-CAROLINA') !== '/north-carolina') throw new Error('NC caps');
if (normalizedPublishedStatePath('/NoRtH-CaRoLiNa') !== '/north-carolina') throw new Error('NC mixed');
if (normalizedPublishedStatePath('/north-carolina') !== null) throw new Error('canonical no redirect');
if (normalizedPublishedStatePath('/North-Carolina/charlotte') !== null) throw new Error('no local normalize');
if (!existsSync(join(root, 'app/pennsylvania/page.tsx'))) throw new Error('Pennsylvania route missing');

const agencies = interpretInsuranceAskQuery('insurance agencies North Carolina');
if (agencies.query.mode !== 'fail_closed') throw new Error('agencies must fail closed');
if (agencies.query.requestedProduct?.length) throw new Error('generic agencies must not carry product');
const homeowners = interpretInsuranceAskQuery('homeowners insurance agencies North Carolina');
if (homeowners.query.mode !== 'fail_closed') throw new Error('homeowners must fail closed');
if (!homeowners.query.requestedProduct?.includes('homeowners')) throw new Error('homeowners product retained');
if (homeowners.query.failReason === agencies.query.failReason) {
  throw new Error('SQA-009: homeowners must not silently become generic NC agencies');
}
const auto = interpretInsuranceAskQuery('auto insurance agencies North Carolina');
if (auto.query.mode !== 'fail_closed') throw new Error('auto must fail closed');
if (!auto.query.requestedProduct?.includes('auto')) throw new Error('auto product retained');
const life = interpretInsuranceAskQuery('life insurance agencies North Carolina');
if (life.query.mode !== 'fail_closed') throw new Error('life agencies fail closed');
const floodAgencies = interpretInsuranceAskQuery('flood insurance agencies North Carolina');
if (floodAgencies.query.mode !== 'fail_closed') throw new Error('flood agencies fail closed');
const companies = interpretInsuranceAskQuery('licensed insurance companies North Carolina');
if (companies.query.mode !== 'fail_closed') throw new Error('companies stay research-cited');
if (companies.query.coverageState !== 'NOT_ACQUIRED') throw new Error('licensed companies OPEN_SEARCH_ONLY');
const hoCo = interpretInsuranceAskQuery('homeowners insurance companies North Carolina');
if (hoCo.query.mode !== 'fail_closed') throw new Error('homeowners companies');
if (!/199/.test(hoCo.query.failReason ?? '')) throw new Error('cite 199 homeowners rows');
const complaints = interpretInsuranceAskQuery('insurance complaints North Carolina');
if (complaints.query.mode !== 'fail_closed') throw new Error('complaints grain');
if (!/not zero|search-only/i.test(complaints.query.failReason ?? '')) throw new Error('complaints not zero');
const actions = interpretInsuranceAskQuery('insurance licensing actions North Carolina');
if (actions.query.mode !== 'fail_closed') throw new Error('actions grain');
if (!/2,874|2874/.test(actions.query.failReason ?? '')) throw new Error('cite 2874');
const mc = interpretInsuranceAskQuery('market conduct exam North Carolina');
if (mc.query.mode !== 'fail_closed') throw new Error('mc exam grain');
const fin = interpretInsuranceAskQuery('financial examination North Carolina');
if (fin.query.mode !== 'fail_closed') throw new Error('financial exam grain');
const recv = interpretInsuranceAskQuery('insurance company receivership North Carolina');
if (recv.query.mode !== 'fail_closed') throw new Error('receivership grain');
const surplus = interpretInsuranceAskQuery('surplus lines insurers North Carolina');
if (surplus.query.mode !== 'fail_closed') throw new Error('surplus grain');
const best = interpretInsuranceAskQuery('best insurance company North Carolina');
if (best.query.mode !== 'fail_closed') throw new Error('ranking');
const charlotte = interpretInsuranceAskQuery('insurance agency Charlotte');
if (charlotte.query.mode !== 'fail_closed') throw new Error('charlotte');
const raleigh = interpretInsuranceAskQuery('insurance company Raleigh');
if (raleigh.query.mode !== 'fail_closed') throw new Error('raleigh');
const npn = interpretInsuranceAskQuery('NPN 1234567 North Carolina');
if (npn.query.mode !== 'identifier') throw new Error('NPN identifier path');
const naic = interpretInsuranceAskQuery('NAIC 13735 North Carolina');
if (naic.query.mode !== 'identifier') throw new Error('NAIC identifier path');

console.log('assert:nc-ins-001 pass', snap.fingerprint.slice(0, 12));
