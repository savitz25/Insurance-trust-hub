import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PENNSYLVANIA_INTELLIGENCE_GATE, CANONICAL_PA_SNAPSHOT_FINGERPRINT } from '../lib/pennsylvania-intelligence/publication';
import { assertPennsylvaniaInsurance } from '../lib/pennsylvania-intelligence/snapshot';
import { buildPennsylvaniaInsuranceJsonLd, paJsonLdHasForbiddenRatings } from '../lib/pennsylvania-intelligence/jsonld';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';

const root = process.cwd();
const snap = assertPennsylvaniaInsurance();
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const footer = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');
const ui = readFileSync(join(root, 'components/pennsylvania/pa-state-page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/pennsylvania/page.tsx'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
const interpret = readFileSync(join(root, 'lib/insurance-ask/interpret.ts'), 'utf8');
const golden = readFileSync(join(root, 'lib/specialist-search/golden-questions.ts'), 'utf8');

if (!existsSync(join(root, 'app/pennsylvania/page.tsx'))) throw new Error('missing /pennsylvania');
if (snap.fingerprint !== CANONICAL_PA_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (PENNSYLVANIA_INTELLIGENCE_GATE.path !== '/pennsylvania') throw new Error('path');
if (PENNSYLVANIA_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index');
if (!sitemap.includes("'/pennsylvania'")) throw new Error('sitemap');
if (sitemap.includes("'/pennsylvania/")) throw new Error('nested pennsylvania sitemap');
if (!footer.includes('/pennsylvania')) throw new Error('footer');
if (ui.includes('/pennsylvania/philadelphia') || ui.includes('/pennsylvania/pittsburgh')) {
  throw new Error('local routes');
}
if (ui.includes('Oregon') || ui.includes('DFR') || ui.includes('IDOI') || ui.includes('Illinois')) {
  throw new Error('other-state residue');
}
if (!interpret.includes('pennsylvania')) throw new Error('ask pennsylvania');
if (!golden.includes('Pennsylvania')) throw new Error('golden pennsylvania');
if (!pkg.includes('assert:pa-ins-001')) throw new Error('package script');
if (paJsonLdHasForbiddenRatings(buildPennsylvaniaInsuranceJsonLd(snap))) throw new Error('jsonld ratings');
if (page.includes('aggregateRating')) throw new Error('schema rating');
if (!ui.toLowerCase().includes('trust score')) throw new Error('trust score guard');
if (ui.match(/best insurer|worst insurer|safest/i)) throw new Error('ranking language');
if (!existsSync(join(root, 'app/oregon/page.tsx'))) throw new Error('Oregon route missing');
if (!existsSync(join(root, 'app/illinois/page.tsx'))) throw new Error('Illinois route missing');

const howManyAgencies = interpretInsuranceAskQuery('insurance agencies Pennsylvania');
if (howManyAgencies.query.mode !== 'fail_closed') throw new Error('agencies must fail closed');
if (howManyAgencies.query.requestedProduct?.length) throw new Error('generic agencies must not carry product');
const homeowners = interpretInsuranceAskQuery('homeowners insurance agencies Pennsylvania');
if (homeowners.query.mode !== 'fail_closed') throw new Error('homeowners must fail closed');
if (!homeowners.query.requestedProduct?.includes('homeowners')) throw new Error('homeowners product retained');
if (homeowners.query.failReason === howManyAgencies.query.failReason) {
  throw new Error('SQA-009: homeowners must not silently become generic PA agencies');
}
const auto = interpretInsuranceAskQuery('auto insurance agencies Pennsylvania');
if (auto.query.mode !== 'fail_closed') throw new Error('auto must fail closed');
if (!auto.query.requestedProduct?.includes('auto')) throw new Error('auto product retained');
if (auto.query.failReason === howManyAgencies.query.failReason) {
  throw new Error('SQA-009: auto must not silently become generic PA agencies');
}
const licensedAgencies = interpretInsuranceAskQuery('licensed insurance agency Pennsylvania');
if (licensedAgencies.query.mode !== 'fail_closed') throw new Error('licensed agencies must fail closed');
const agents = interpretInsuranceAskQuery('insurance agent Pennsylvania');
if (agents.query.mode !== 'fail_closed') throw new Error('agents must fail closed');
const companies = interpretInsuranceAskQuery('licensed insurance companies Pennsylvania');
if (companies.query.mode !== 'fail_closed') throw new Error('companies stay research-cited, not executed as profiles');
if (companies.query.coverageState !== 'PARTIAL') throw new Error('licensed companies are acquired PARTIAL');
if (!/1,722|1722/.test(companies.query.failReason ?? '')) throw new Error('cite 1722 NAIC');
const life = interpretInsuranceAskQuery('life insurance companies Pennsylvania');
if (life.query.mode !== 'fail_closed') throw new Error('life companies are PID powers, not a product census');
if (!/Life and Annuities/.test(life.query.failReason ?? '')) throw new Error('cite Life and Annuities power');
const workers = interpretInsuranceAskQuery('workers compensation insurers Pennsylvania');
if (workers.query.mode !== 'fail_closed') throw new Error('workers comp is a PID power');
if (!/Workers Compensation/.test(workers.query.failReason ?? '')) throw new Error('cite workers compensation power');
const complaints = interpretInsuranceAskQuery('insurance complaints Pennsylvania');
if (complaints.query.mode !== 'fail_closed') throw new Error('complaints grain');
const namedComplaint = interpretInsuranceAskQuery('complaints against Aetna Pennsylvania');
if (namedComplaint.query.mode !== 'fail_closed') throw new Error('named complaints stay name-only');
const enforcement = interpretInsuranceAskQuery('insurance enforcement Pennsylvania');
if (enforcement.query.mode !== 'fail_closed') throw new Error('enforcement grain');
const mc = interpretInsuranceAskQuery('market conduct exam Pennsylvania');
if (mc.query.mode !== 'fail_closed') throw new Error('mc exam grain');
const fin = interpretInsuranceAskQuery('financial exam insurance Pennsylvania');
if (fin.query.mode !== 'fail_closed') throw new Error('financial exam grain');
const liq = interpretInsuranceAskQuery('insurance company liquidation Pennsylvania');
if (liq.query.mode !== 'fail_closed') throw new Error('liquidation grain');
const surplus = interpretInsuranceAskQuery('surplus lines companies Pennsylvania');
if (surplus.query.mode !== 'fail_closed') throw new Error('surplus grain');
const best = interpretInsuranceAskQuery('best insurance company Pennsylvania');
if (best.query.mode !== 'fail_closed') throw new Error('ranking');
const philly = interpretInsuranceAskQuery('insurance agency Philadelphia');
if (philly.query.mode !== 'fail_closed') throw new Error('philadelphia');
const pitt = interpretInsuranceAskQuery('insurance company Pittsburgh');
if (pitt.query.mode !== 'fail_closed') throw new Error('pittsburgh');
const npn = interpretInsuranceAskQuery('NPN 1234567 Pennsylvania');
if (npn.query.mode !== 'identifier') throw new Error('NPN identifier path');
if (npn.query.identifier?.value !== '1234567') throw new Error('NPN value');
const naic = interpretInsuranceAskQuery('NAIC 13735 Pennsylvania');
if (naic.query.mode !== 'identifier') throw new Error('NAIC identifier path');
if (naic.query.identifier?.value !== '13735') throw new Error('NAIC value');
const knownNaic = interpretInsuranceAskQuery('Find insurer NAIC code 13735');
if (knownNaic.query.mode !== 'identifier') throw new Error('NAIC identifier outranks geography');

console.log('assert:pa-ins-001 pass', snap.fingerprint.slice(0, 12));
