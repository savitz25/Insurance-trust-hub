/**
 * Phase 18 — consumer journey polish guards.
 *   npm run check:phase18-journey
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  PRIMARY_CONSUMER_JOBS,
  RECOMMENDED_FIRST_PATH,
  LIVE_LAUNCH_HUBS,
} from '../lib/product/research-ia';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

const REQUIRED = [
  'components/consumer-job-paths.tsx',
  'components/live-launch-hubs.tsx',
  'components/recommended-research-path.tsx',
  'docs/PHASE-18-CONSUMER-JOURNEY.md',
];
for (const rel of REQUIRED) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

if (PRIMARY_CONSUMER_JOBS.length !== 5) {
  errors.push('expected 5 primary consumer jobs');
}
const jobHrefs = PRIMARY_CONSUMER_JOBS.map((j) => j.href);
for (const href of [
  '/tools/marketplace-plan-research',
  '/medicare',
  '/tools/license-verification',
  '/directory?verified=true',
  '/calculators/aca-subsidy',
]) {
  if (!jobHrefs.includes(href)) errors.push(`missing job route ${href}`);
}

if (RECOMMENDED_FIRST_PATH.length < 4) {
  errors.push('recommended path should have 4 steps');
}
if (!LIVE_LAUNCH_HUBS.some((h) => h.href.includes('las-vegas'))) {
  errors.push('live hubs should include Las Vegas');
}
if (!LIVE_LAUNCH_HUBS.some((h) => h.href.includes('burlington'))) {
  errors.push('live hubs should include Burlington');
}

const CONSUMER = [
  'components/insurance-hero.tsx',
  'app/tools/page.tsx',
  'components/insurance-landing-sections.tsx',
  'components/hub-match-form.tsx',
  'components/guides/aca-marketplace-guide-view.tsx',
  'app/providers/[slug]/page.tsx',
];
const FORBIDDEN = [/get quotes/i, /free quotes/i, /850\+/i, /illustrative seed/i];
for (const rel of CONSUMER) {
  const text = read(rel);
  for (const re of FORBIDDEN) {
    if (re.test(text)) errors.push(`${rel} matches ${re}`);
  }
}

const hero = read('components/insurance-hero.tsx');
if (!/ConsumerJobPaths/.test(hero)) errors.push('hero must render consumer job paths');

const tools = read('app/tools/page.tsx');
if (!/RecommendedResearchPath/.test(tools)) errors.push('tools must show recommended path');
if (!/directory\?verified=true/.test(tools)) errors.push('tools directory CTA should stay verified');

const landing = read('components/insurance-landing-sections.tsx');
if (!/LiveLaunchHubs/.test(landing)) errors.push('homepage should deep-link live hubs');

const hubForm = read('components/hub-match-form.tsx');
if (!/cost-estimator/.test(hubForm) || !/marketplace-plan-research/.test(hubForm)) {
  errors.push('hubs must offer marketplace + cost research continuation');
}

const profile = read('app/providers/[slug]/page.tsx');
if (!/marketplace-plan-research/.test(profile) || !/plan-complaint-index/.test(profile)) {
  errors.push('profiles must continue into flagship research tools');
}

const guide = read('components/guides/aca-marketplace-guide-view.tsx');
if (!/guideHasVerifiedInventory/.test(guide)) {
  errors.push('guides must not invent agency CTAs in states without inventory');
}

const nav = read('lib/design/insurance-design-system.ts');
if (!/\/guides/.test(nav) || !/\/directory/.test(nav) || !/plan-complaint-index/.test(nav)) {
  errors.push('header nav should include Guides, Directory, and Data');
}

const pkg = read('package.json');
if (!/check:phase18-journey/.test(pkg)) {
  errors.push('package.json missing check:phase18-journey');
}

if (errors.length) {
  console.error('Phase 18 journey checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 18 consumer journey checks passed');
