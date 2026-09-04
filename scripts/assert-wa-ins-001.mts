import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WASHINGTON_INTELLIGENCE_GATE, CANONICAL_WA_SNAPSHOT_FINGERPRINT } from '../lib/washington-intelligence/publication';
import { assertWashingtonInsurance } from '../lib/washington-intelligence/snapshot';
import {
  buildWashingtonInsuranceJsonLd,
  waJsonLdHasForbiddenRatings,
} from '../lib/washington-intelligence/jsonld';

const root = process.cwd();
const snap = assertWashingtonInsurance();
const pub = readFileSync(join(root, 'lib/washington-intelligence/publication.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const footer = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');
const ui = readFileSync(join(root, 'components/washington/wa-state-page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/washington/page.tsx'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');

if (!existsSync(join(root, 'app/washington/page.tsx'))) throw new Error('missing /washington');
if (snap.fingerprint !== CANONICAL_WA_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (!pub.includes(snap.fingerprint)) throw new Error('fingerprint not gated');
if (WASHINGTON_INTELLIGENCE_GATE.path !== '/washington') throw new Error('path');
if (!page.includes('index') && WASHINGTON_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index');
if (!sitemap.includes("'/washington'")) throw new Error('sitemap');
if (sitemap.includes("'/washington/")) throw new Error('nested washington sitemap');
if (!footer.includes('/washington')) throw new Error('footer');
if (!pkg.includes('assert:wa-ins-001')) throw new Error('package script');
if (ui.includes('/washington/seattle') || ui.includes('/washington/king')) throw new Error('local routes');
if (!ui.includes('SOURCE_USE_RESTRICTED')) throw new Error('restriction copy');
if (!ui.includes('No Trust Score') && !ui.includes('Trust Score')) {
  /* page says "not a ranking, recommendation, or Trust Score" */
}
if (!ui.toLowerCase().includes('trust score')) throw new Error('trust score guard');
if (ui.match(/best insurer|worst insurer|safest/i)) throw new Error('ranking language');
if (snap.producer_roster.count != null) throw new Error('fake producer count');
if (snap.agency_roster.count != null) throw new Error('fake agency count');
if (snap.annual_aggregates.regulated_entities !== 2924) throw new Error('2924');
if (snap.annual_aggregates.domestic + snap.annual_aggregates.foreign + snap.annual_aggregates.alien !== 2924) {
  throw new Error('split');
}
if (snap.findings.length < 3) throw new Error('findings');
if (snap.expansion_ledger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) throw new Error('org growth');
if (snap.federal_overlay.cms_marketplace_washington_projection !== 'SOURCE_NOT_SPLIT / NOT_USED') {
  throw new Error('cms overlay');
}
const jsonld = buildWashingtonInsuranceJsonLd(snap);
if (waJsonLdHasForbiddenRatings(jsonld)) throw new Error('ratings');
if (!JSON.stringify(jsonld).includes('WebPage')) throw new Error('webpage');
if (!existsSync(join(root, 'app/texas/page.tsx'))) throw new Error('texas');
if (!existsSync(join(root, 'app/california/page.tsx'))) throw new Error('california');
if (!existsSync(join(root, 'app/new-jersey/page.tsx'))) throw new Error('nj');
if (!existsSync(join(root, 'app/florida/page.tsx'))) throw new Error('florida');
console.log('assert-wa-ins-001 PASS', snap.fingerprint);
