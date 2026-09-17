import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OREGON_INTELLIGENCE_GATE, CANONICAL_OR_SNAPSHOT_FINGERPRINT } from '../lib/oregon-intelligence/publication';
import { assertOregonInsurance } from '../lib/oregon-intelligence/snapshot';
import { buildOregonInsuranceJsonLd, orJsonLdHasForbiddenRatings } from '../lib/oregon-intelligence/jsonld';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';

const root = process.cwd();
const snap = assertOregonInsurance();
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const footer = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');
const ui = readFileSync(join(root, 'components/oregon/or-state-page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/oregon/page.tsx'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
const interpret = readFileSync(join(root, 'lib/insurance-ask/interpret.ts'), 'utf8');
const golden = readFileSync(join(root, 'lib/specialist-search/golden-questions.ts'), 'utf8');

if (!existsSync(join(root, 'app/oregon/page.tsx'))) throw new Error('missing /oregon');
if (snap.fingerprint !== CANONICAL_OR_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (OREGON_INTELLIGENCE_GATE.path !== '/oregon') throw new Error('path');
if (OREGON_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index');
if (!sitemap.includes("'/oregon'")) throw new Error('sitemap');
if (sitemap.includes("'/oregon/")) throw new Error('nested oregon sitemap');
if (!footer.includes('/oregon')) throw new Error('footer');
if (ui.includes('/oregon/portland') || ui.includes('/oregon/multnomah')) throw new Error('local routes');
if (ui.includes('Illinois') || ui.includes('IDOI') || page.includes('illinois')) throw new Error('Illinois residue');
if (!interpret.includes('oregon')) throw new Error('ask oregon');
if (!golden.includes('Oregon')) throw new Error('golden oregon');
if (!pkg.includes('assert:or-ins-001')) throw new Error('package script');
if (orJsonLdHasForbiddenRatings(buildOregonInsuranceJsonLd(snap))) throw new Error('jsonld ratings');

const howMany = interpretInsuranceAskQuery('how many insurance agencies in Oregon');
if (howMany.query.mode !== 'fail_closed') throw new Error('how many agencies must fail closed');
const licensedAgencies = interpretInsuranceAskQuery('licensed insurance agency Oregon');
if (licensedAgencies.query.mode !== 'fail_closed') throw new Error('licensed agencies must fail closed');
const licensedCompanies = interpretInsuranceAskQuery('licensed insurance company Oregon');
if (licensedCompanies.query.mode !== 'fail_closed' && licensedCompanies.query.mode !== 'entity') {
  throw new Error('licensed companies must not invent a census');
}
const complaints = interpretInsuranceAskQuery('Oregon auto insurance complaints');
if (complaints.query.mode !== 'fail_closed') throw new Error('complaint grain must be explicit');
const orders = interpretInsuranceAskQuery('Oregon insurance enforcement');
if (orders.query.mode !== 'fail_closed') throw new Error('orders must fail closed');
const dfrCase = interpretInsuranceAskQuery('Oregon DFR case INS-24-0023');
if (dfrCase.query.mode !== 'fail_closed') throw new Error('DFR case must remain a matter');
const mc = interpretInsuranceAskQuery('market conduct exam Oregon');
if (mc.query.mode !== 'fail_closed') throw new Error('mc exam grain');
const fin = interpretInsuranceAskQuery('financial examination insurer Oregon');
if (fin.query.mode !== 'fail_closed') throw new Error('financial exam grain');
const recv = interpretInsuranceAskQuery('insurance company receivership Oregon');
if (recv.query.mode !== 'fail_closed') throw new Error('receivership');
const best = interpretInsuranceAskQuery('best insurance company in Oregon');
if (best.query.mode !== 'fail_closed') throw new Error('ranking');
const portland = interpretInsuranceAskQuery('safest insurance company in Portland');
if (portland.query.mode !== 'fail_closed') throw new Error('portland ranking');
const npn = interpretInsuranceAskQuery('NPN 1234567 Oregon');
if (npn.query.mode !== 'identifier') throw new Error('NPN identifier path');
if (npn.query.identifier?.value !== '1234567') throw new Error('NPN value');
const naic = interpretInsuranceAskQuery('Find insurer NAIC code 10064');
if (naic.query.mode !== 'identifier') throw new Error('NAIC identifier path');
if (naic.query.identifier?.value !== '10064') throw new Error('NAIC value');

console.log('assert:or-ins-001 pass', snap.fingerprint.slice(0, 12));
