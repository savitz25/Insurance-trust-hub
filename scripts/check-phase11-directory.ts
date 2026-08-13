/**
 * Phase 11A/11B — fail if consumer directory trust / polish regressions land.
 *   npm run check:phase11-directory
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  buildDirectoryHref,
  DIRECTORY_PAGE_SIZE,
} from '../lib/directory/params';

const root = resolve(process.cwd());
const errors: string[] = [];

const CONSUMER_FILES = [
  'app/directory/page.tsx',
  'app/page.tsx',
  'app/providers/page.tsx',
  'components/provider-card.tsx',
  'components/hub-page-view.tsx',
  'components/insurance-landing-sections.tsx',
  'components/insurance-hero.tsx',
  'components/search-filters.tsx',
  'components/directory-controls.tsx',
  'components/directory-specialty-chips.tsx',
  'components/directory-pagination.tsx',
  'components/directory-live-counts.tsx',
  'components/specialty-topic-page.tsx',
  'lib/providers/queries.ts',
  'lib/product/research-ia.ts',
  'app/methodology/page.tsx',
  'app/tools/page.tsx',
];

const FORBIDDEN = [
  /illustrative seed listing/i,
  /not independently verified research/i,
  /no seed listings/i,
  /no seed inventory/i,
  /backfill with seed/i,
  /never seed or illustrative/i,
  /badgeLabel:\s*['"]Listing only['"]/i,
  /pipeline ready/i,
];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

for (const rel of CONSUMER_FILES) {
  if (!existsSync(resolve(root, rel))) {
    errors.push(`missing ${rel}`);
    continue;
  }
  const text = read(rel);
  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      errors.push(`${rel} matches ${re}`);
    }
  }
}

const dir = read('app/directory/page.tsx');
if (!/state=OH&verified=true/.test(dir)) {
  errors.push('directory missing Ohio verified chip');
}
if (!/state=FL&verified=true/.test(dir) || !/state=TX&verified=true/.test(dir)) {
  errors.push('directory missing FL/TX verified chips');
}
if (!/verifiedOnly: true/.test(dir)) {
  errors.push('directory should force verified inventory');
}
if (!/DirectoryPagination/.test(dir) || !/DIRECTORY_PAGE_SIZE/.test(dir)) {
  errors.push('directory missing server pagination');
}
if (!/njTotal > 0/.test(dir)) {
  errors.push('directory should gate NJ UI on live inventory');
}

const filters = read('components/search-filters.tsx');
if (/Florida DFS capability/i.test(filters)) {
  errors.push('search filters still use Florida-only specialty framing');
}
if (!/state === 'FL'/.test(filters)) {
  errors.push('appointment snapshot should be Florida-only');
}

const queries = read('lib/providers/queries.ts');
if (!/\.eq\('verified', true\)/.test(queries)) {
  errors.push('public provider query must filter verified=true');
}
if (!/\.range\(offset/.test(queries)) {
  errors.push('public provider query must use offset pagination');
}

if (DIRECTORY_PAGE_SIZE < 12 || DIRECTORY_PAGE_SIZE > 48) {
  errors.push(`DIRECTORY_PAGE_SIZE ${DIRECTORY_PAGE_SIZE} outside 12–48`);
}

const paged = buildDirectoryHref(
  { state: 'TX', specialty: 'Health' },
  { page: '2' }
);
if (!paged.includes('state=TX') || !paged.includes('specialty=Health') || !paged.includes('page=2')) {
  errors.push(`pagination href lost filters: ${paged}`);
}
if (!paged.includes('verified=true')) {
  errors.push('pagination href must stay verified=true');
}
const flAppointments = buildDirectoryHref(
  { state: 'OH', appointments: 'true' },
  { page: '2' }
);
if (flAppointments.includes('appointments=')) {
  errors.push('appointment snapshot leaked onto non-FL directory URL');
}

const landing = read('components/insurance-landing-sections.tsx');
if (!/DirectoryLiveCounts/.test(landing) || !/directory\?verified=true/.test(landing)) {
  errors.push('homepage should keep verified directory CTA + live counts');
}

if (errors.length) {
  console.error('Phase 11 directory checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 11A/11B directory checks passed');
