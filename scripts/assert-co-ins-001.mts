import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COLORADO_INTELLIGENCE_GATE, CANONICAL_CO_SNAPSHOT_FINGERPRINT } from '../lib/colorado-intelligence/publication';
import { assertColoradoInsurance } from '../lib/colorado-intelligence/snapshot';
import {
  buildColoradoInsuranceJsonLd,
  coJsonLdHasForbiddenRatings,
} from '../lib/colorado-intelligence/jsonld';
import { interpretInsuranceAskQuery } from '../lib/insurance-ask/interpret';

const root = process.cwd();
const snap = assertColoradoInsurance();
const pub = readFileSync(join(root, 'lib/colorado-intelligence/publication.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const footer = readFileSync(join(root, 'lib/design/insurance-design-system.ts'), 'utf8');
const ui = readFileSync(join(root, 'components/colorado/co-state-page.tsx'), 'utf8');
const page = readFileSync(join(root, 'app/colorado/page.tsx'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
const interpret = readFileSync(join(root, 'lib/insurance-ask/interpret.ts'), 'utf8');
const golden = readFileSync(join(root, 'lib/specialist-search/golden-questions.ts'), 'utf8');

if (!existsSync(join(root, 'app/colorado/page.tsx'))) throw new Error('missing /colorado');
if (snap.fingerprint !== CANONICAL_CO_SNAPSHOT_FINGERPRINT) throw new Error('fingerprint gate');
if (!pub.includes(snap.fingerprint)) throw new Error('fingerprint not gated');
if (COLORADO_INTELLIGENCE_GATE.path !== '/colorado') throw new Error('path');
if (COLORADO_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index');
if (!page.includes('index') && COLORADO_INTELLIGENCE_GATE.robotsIndex !== true) throw new Error('index copy');
if (!sitemap.includes("'/colorado'")) throw new Error('sitemap');
if (sitemap.includes("'/colorado/")) throw new Error('nested colorado sitemap');
if (!footer.includes('/colorado')) throw new Error('footer');
if (!pkg.includes('assert:co-ins-001')) throw new Error('package script');
if (ui.includes('/colorado/denver') || ui.includes('/colorado/denver')) throw new Error('local routes');
if (!ui.toLowerCase().includes('trust score')) throw new Error('trust score guard');
if (ui.match(/best insurer|worst insurer|safest/i)) throw new Error('ranking language');
if (snap.producer_roster.count != null) throw new Error('fake producer count');
if (snap.agency_roster.count != null) throw new Error('fake agency count');
if (snap.statistical_report.naic_companies_tab.company_directory_rows !== 1839) throw new Error('1839');
if (snap.surplus_lines.eligible_identities !== 259) throw new Error('259');
if (snap.surplus_lines.effective_through !== '2027-06-30') throw new Error('current surplus through');
if (snap.surplus_lines.prior_2025_2026_list.effective_through !== '2026-06-30') throw new Error('historical surplus through');
if (snap.complaints.complaint_index_is_not_trusthub_score !== true) throw new Error('index != score');
if (snap.complaints.standard_ratio_index.company_line_rows !== 415) throw new Error('415');
if (snap.naic_crosswalk.CROSSWALK_STATUS !== 'EXECUTED') throw new Error('crosswalk');
if (snap.expansion_ledger.EXISTING_ORGANIZATIONS_ENRICHED !== 0) throw new Error('no enrichment write');
if (snap.domestic_certificates.named_company_entries !== 49) throw new Error('49 entries');
if (snap.domestic_certificates.total_list_item_hrefs !== 50) throw new Error('50 hrefs');
if (snap.domestic_certificates.named_company_entries === snap.domestic_certificates.total_list_item_hrefs) {
  throw new Error('entry count collapsed into href total');
}
if (snap.findings.length < 3) throw new Error('findings');
if (snap.expansion_ledger.NET_NEW_CANONICAL_LEGAL_INSURERS !== 0) throw new Error('org growth');
if (snap.federal_overlays.cms_marketplace_colorado_projection !== 'SOURCE_NOT_SPLIT / NOT_USED') {
  throw new Error('cms overlay');
}
if (!interpret.includes('colorado')) throw new Error('search must know Colorado');
if (!golden.includes('licensed insurance agencies in Colorado')) throw new Error('golden Colorado agency fail-closed');
if (!golden.includes('Colorado insurance agents')) throw new Error('golden Colorado producer fail-closed');
if (interpretInsuranceAskQuery('licensed insurance agencies in Colorado').query.mode !== 'fail_closed') {
  throw new Error('Colorado agencies must fail closed');
}
if (interpretInsuranceAskQuery('Colorado insurance agents').query.mode !== 'fail_closed') {
  throw new Error('Colorado agents must fail closed');
}
if (interpretInsuranceAskQuery('licensed insurance companies in Colorado').query.coverageState !== 'NOT_ACQUIRED') {
  throw new Error('Colorado authorized companies must be NOT_ACQUIRED');
}
const jsonld = buildColoradoInsuranceJsonLd(snap);
if (coJsonLdHasForbiddenRatings(jsonld)) throw new Error('ratings');
if (!JSON.stringify(jsonld).includes('WebPage')) throw new Error('webpage');
if (!existsSync(join(root, 'app/texas/page.tsx'))) throw new Error('texas');
if (!existsSync(join(root, 'app/california/page.tsx'))) throw new Error('california');
if (!existsSync(join(root, 'app/new-jersey/page.tsx'))) throw new Error('nj');
if (!existsSync(join(root, 'app/florida/page.tsx'))) throw new Error('florida');
if (!existsSync(join(root, 'app/washington/page.tsx'))) throw new Error('washington');
console.log('assert-co-ins-001 PASS', snap.fingerprint);
