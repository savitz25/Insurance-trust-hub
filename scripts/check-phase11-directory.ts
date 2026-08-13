/**
 * Phase 11A — fail if consumer-facing seed jargon remains on public listing surfaces.
 *   npm run check:phase11-directory
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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
if (!/verifiedOnly: true/.test(dir) && !/verified: true/.test(dir)) {
  // directory should force verified query
  if (!/verifiedOnly: true/.test(dir)) {
    errors.push('directory should force verified inventory');
  }
}

const queries = read('lib/providers/queries.ts');
if (!/\.eq\('verified', true\)/.test(queries)) {
  errors.push('public provider query must filter verified=true');
}

if (errors.length) {
  console.error('Phase 11A directory checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 11A directory checks passed');
