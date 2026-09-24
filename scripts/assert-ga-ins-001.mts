import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GEORGIA_INTELLIGENCE_GATE, CANONICAL_GA_SNAPSHOT_FINGERPRINT } from '../lib/georgia-intelligence/publication';
import { assertGeorgiaInsurance } from '../lib/georgia-intelligence/snapshot';
import { buildGeorgiaInsuranceJsonLd, gaJsonLdHasForbiddenRatings } from '../lib/georgia-intelligence/jsonld';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';
import { normalizedPublishedStatePath } from '../lib/seo/published-state-path';

const root = process.cwd();
const snap = assertGeorgiaInsurance();
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const footer = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');
const ui = readFileSync(join(root, 'components/georgia/ga-state-page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/georgia/page.tsx'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
const published = readFileSync(join(root, 'lib/seo/published-state-path.ts'), 'utf8');
const golden = readFileSync(join(root, 'lib/specialist-search/golden-questions.ts'), 'utf8');

if (!existsSync(join(root, 'app/georgia/page.tsx'))) throw new Error('missing /georgia');
if (snap.fingerprint !== CANONICAL_GA_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (GEORGIA_INTELLIGENCE_GATE.path !== '/georgia') throw new Error('path');
if (GEORGIA_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index');
if (!sitemap.includes("'/georgia'")) throw new Error('sitemap');
if ((sitemap.match(/'\/georgia'/g) || []).length !== 1) throw new Error('sitemap once');
if (sitemap.includes("'/georgia/")) throw new Error('nested georgia sitemap');
if (!footer.includes('/georgia')) throw new Error('footer');
if (ui.includes('/georgia/atlanta') || ui.includes('/georgia/savannah')) throw new Error('local routes');
if (/all Georgia (agents|agencies|companies)/i.test(ui)) throw new Error('completeness claim');
if (ui.match(/best insurer|worst insurer|Trust Score/i) && !/not a ranking, recommendation, or Trust Score/i.test(ui)) {
  throw new Error('ranking language');
}
if (!ui.toLowerCase().includes('trust score')) throw new Error('trust score guard');
if (!published.includes("'georgia'")) throw new Error('published-state registry');
if (!pkg.includes('assert:ga-ins-001')) throw new Error('package script');
if (!golden.includes('Georgia')) throw new Error('golden georgia');
if (gaJsonLdHasForbiddenRatings(buildGeorgiaInsuranceJsonLd(snap))) throw new Error('jsonld ratings');
if (page.includes('aggregateRating')) throw new Error('schema rating');
if (snap.complaints.count != null) throw new Error('complaint count');
if (snap.regulator.complaints_url !== 'https://oci.georgia.gov/file-consumer-insurance-complaint') {
  throw new Error('complaint url');
}
if (!snap.regulator.sircon_url.includes('/georgia/content.jsp')) throw new Error('sircon url');
if (normalizedPublishedStatePath('/Georgia') !== '/georgia') throw new Error('308 helper Georgia');
if (normalizedPublishedStatePath('/GEORGIA') !== '/georgia') throw new Error('GA caps');
if (normalizedPublishedStatePath('/gEoRgIa') !== '/georgia') throw new Error('GA mixed');
if (normalizedPublishedStatePath('/georgia') !== null) throw new Error('canonical no redirect');
if (normalizedPublishedStatePath('/Georgia/atlanta') !== null) throw new Error('no local normalize');
if (!existsSync(join(root, 'app/ohio/page.tsx'))) throw new Error('Ohio route missing');
if (!existsSync(join(root, 'app/north-carolina/page.tsx'))) throw new Error('North Carolina route missing');

const agencies = interpretInsuranceAskQuery('insurance agencies Georgia');
if (agencies.query.mode !== 'fail_closed') throw new Error('agencies must fail closed');
if (agencies.query.coverageState !== 'NOT_ACQUIRED') throw new Error('agencies not acquired');
if (!/search-only is not zero/i.test(agencies.query.failReason ?? '')) throw new Error('agencies search-only');
if (/\b\d{3,}\b/.test(agencies.query.failReason ?? '')) throw new Error('agencies must not cite a census');

const homeowners = interpretInsuranceAskQuery('homeowners insurance agencies Georgia');
if (homeowners.query.mode !== 'fail_closed') throw new Error('homeowners must fail closed');
if (!homeowners.query.requestedProduct?.includes('homeowners')) throw new Error('homeowners product retained');
if (homeowners.query.failReason === agencies.query.failReason) {
  throw new Error('homeowners must not silently become generic Georgia agencies');
}

const agents = interpretInsuranceAskQuery('Georgia insurance agents');
if (agents.query.mode !== 'fail_closed') throw new Error('agents grain');
if (agents.query.failReason === agencies.query.failReason) throw new Error('agents must not reuse the agency sentence when the class differs');

const companies = interpretInsuranceAskQuery('insurance companies Georgia');
if (companies.query.mode !== 'fail_closed') throw new Error('companies stay fail closed');
if (companies.query.entityClass !== 'insurer') throw new Error('company grain');
if (companies.query.coverageState !== 'NOT_ACQUIRED') throw new Error('companies not acquired');
if (/agency count|agencies:/i.test(companies.query.failReason ?? '')) throw new Error('company answer must not be an agency count');

const howMany = interpretInsuranceAskQuery('how many insurance companies in Georgia');
if (howMany.query.mode !== 'fail_closed') throw new Error('company count must not execute');

const complaints = interpretInsuranceAskQuery('Georgia insurance complaints');
if (complaints.query.mode !== 'fail_closed') throw new Error('complaints grain');
if (complaints.query.coverageState !== 'NOT_ACQUIRED') throw new Error('complaints not acquired');
if (!/not zero|intake/i.test(complaints.query.failReason ?? '')) throw new Error('complaints not zero');
if (/\b0 complaints\b/i.test(complaints.query.failReason ?? '')) throw new Error('no complaint-zero inference');

const receivership = interpretInsuranceAskQuery('Georgia insurance receivership');
if (receivership.query.coverageState !== 'PARTIAL') throw new Error('receivership partial');
if (!/7 companies/.test(receivership.query.failReason ?? '')) throw new Error('cite index 7');
if (!/Exact NAIC attachments: 0/.test(receivership.query.failReason ?? '')) throw new Error('no naic join');

const parity = interpretInsuranceAskQuery('Georgia mental health parity fines');
if (parity.query.coverageState !== 'PARTIAL') throw new Error('parity aggregate');
if (!/not acquired/i.test(parity.query.failReason ?? '')) throw new Error('parity orders not acquired');

const branch = interpretInsuranceAskQuery('Georgia branch agency licenses');
if (branch.query.coverageState !== 'UNSUPPORTED') throw new Error('branch census unsupported');
if (!/May 14, 2025/.test(branch.query.failReason ?? '')) throw new Error('hb410 date');

const atlanta = interpretInsuranceAskQuery('insurance agency Atlanta');
if (atlanta.query.coverageState !== 'UNSUPPORTED') throw new Error('atlanta local');
if (/\b\d{2,}\b/.test(atlanta.query.failReason ?? '')) throw new Error('atlanta is not a census');

const best = interpretInsuranceAskQuery('best insurance company Georgia');
if (best.query.mode !== 'fail_closed') throw new Error('ranking');

const npn = interpretInsuranceAskQuery('NPN 10391484 Georgia');
if (npn.query.mode !== 'identifier') throw new Error('NPN identifier path');
const naic = interpretInsuranceAskQuery('NAIC 10064 Georgia');
if (naic.query.mode !== 'identifier') throw new Error('NAIC identifier path');

console.log('assert:ga-ins-001 pass', snap.fingerprint.slice(0, 12));
