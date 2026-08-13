/**
 * Phase 16 — multi-state inventory hardening guards.
 *   npm run check:phase16-hardening
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  allowsRegulatorLeadForm,
  formatHubPopulation,
  getDirectoryStateIntro,
  getMedicareNonClaim,
  getRegulatorLabel,
  getRegulatorShortLabel,
  getVerificationExplanation,
} from '../lib/regulators/labels';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}
function must(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

const CONSUMER_FILES = [
  'app/directory/page.tsx',
  'app/page.tsx',
  'app/providers/[slug]/page.tsx',
  'app/hubs/[state]/page.tsx',
  'app/tools/license-verification/page.tsx',
  'components/provider-card.tsx',
  'components/hub-page-view.tsx',
  'components/insurance-landing-sections.tsx',
  'components/insurance-hero.tsx',
  'components/directory-live-counts.tsx',
  'components/directory-specialty-chips.tsx',
  'components/hub-match-form.tsx',
];

const FORBIDDEN = [
  /illustrative seed listing/i,
  /not independently verified research/i,
  /no seed listings/i,
  /pipeline ready/i,
  /Score suppressed/i,
  /CMS Data Verified/i,
  /Florida agency research profile/,
  /get quotes/i,

];

must('lib/regulators/labels.ts');
must('docs/MULTI-STATE-INVENTORY.md');

for (const rel of CONSUMER_FILES) {
  if (!existsSync(resolve(root, rel))) {
    errors.push(`missing ${rel}`);
    continue;
  }
  const text = read(rel);
  for (const re of FORBIDDEN) {
    if (re.test(text)) errors.push(`${rel} matches ${re}`);
  }
}

const expectedLabels: Record<string, string> = {
  FL: 'Florida Department of Financial Services (DFS)',
  TX: 'Texas Department of Insurance (TDI)',
  OH: 'Ohio Department of Insurance (ODI)',
  NV: 'Nevada Division of Insurance (NV DOI)',
  VT: 'Vermont Department of Financial Regulation (VT DFR)',
};
for (const [code, label] of Object.entries(expectedLabels)) {
  if (getRegulatorLabel(code) !== label) {
    errors.push(`getRegulatorLabel(${code}) expected ${label}`);
  }
}
if (getRegulatorShortLabel('NV') !== 'NV DOI') errors.push('NV short label');
if (getRegulatorShortLabel('VT') !== 'VT DFR') errors.push('VT short label');
if (!/Vermont Department of Financial Regulation \(VT DFR\) is the license source/.test(
  getVerificationExplanation('VT')
)) {
  errors.push('VT verification explanation');
}
if (!/Nevada Division of Insurance \(NV DOI\) is the license source/.test(
  getVerificationExplanation('NV')
)) {
  errors.push('NV verification explanation');
}
if (!/never inferred from VT DFR/.test(getMedicareNonClaim('VT'))) {
  errors.push('VT Medicare non-claim');
}
if (!/never inferred from NV DOI/.test(getMedicareNonClaim('NV'))) {
  errors.push('NV Medicare non-claim');
}
if (allowsRegulatorLeadForm('NV') || allowsRegulatorLeadForm('VT')) {
  errors.push('NV/VT must not allow lead forms');
}
if (!allowsRegulatorLeadForm('FL') || !allowsRegulatorLeadForm('TX')) {
  errors.push('FL/TX lead-form policy should stay unchanged');
}
if (formatHubPopulation(30_000) === '0.0M') {
  errors.push('small-market population must not render 0.0M');
}
if (!/VT DFR/.test(getDirectoryStateIntro('VT'))) {
  errors.push('directory VT intro');
}
if (/when promoted/.test(getDirectoryStateIntro('VT'))) {
  errors.push('VT directory intro should not say when promoted');
}

const dir = read('app/directory/page.tsx');
if (!/vtTotal > 0/.test(dir) || !/nvTotal > 0/.test(dir)) {
  errors.push('directory must gate NV/VT chips on live verified count');
}
if (!/getDirectoryStateIntro/.test(dir)) {
  errors.push('directory should use shared state intro helper');
}

const chips = read('components/directory-live-counts.tsx');
if (!/Vermont \(VT DFR\)/.test(chips) || !/Nevada \(NV DOI\)/.test(chips)) {
  errors.push('homepage chips missing NV/VT labels');
}
if (!/\.filter\(\(row\) => row\.total > 0\)/.test(chips)) {
  errors.push('homepage chips must hide zero-count states');
}

const profile = read('app/providers/[slug]/page.tsx');
if (!/getVerificationExplanation/.test(profile) || !/getMedicareNonClaim/.test(profile)) {
  errors.push('profile must use shared regulator helpers');
}
if (!/canShowAsVerified/.test(profile) || !/resolveProviderTrustState/.test(profile)) {
  errors.push('profile must keep Phase 1 trust gates');
}
if (!/allowsRegulatorLeadForm/.test(profile)) {
  errors.push('profile must gate lead forms by regulator policy');
}

const hub = read('components/hub-page-view.tsx');
if (!/getRegulatorLabel/.test(hub) || !/formatHubPopulation/.test(hub)) {
  errors.push('hub view must use shared regulator/population helpers');
}
if (!/EMPTY_MARKET_COPY/.test(hub)) {
  errors.push('hub view must keep honest empty-market copy');
}

const pkg = read('package.json');
if (!/check:phase16-hardening/.test(pkg)) {
  errors.push('package.json missing check:phase16-hardening');
}

if (errors.length) {
  console.error('Phase 16 hardening checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 16 multi-state hardening checks passed');
