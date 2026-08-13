/**
 * Phase 12 — My Insurance depth: save entry points + HQ passport surfaces.
 *   npm run check:phase12-my-insurance
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

const REQUIRED = [
  'components/provider-card.tsx',
  'components/my-insurance/save-provider-button.tsx',
  'components/my-insurance/save-calculator-button.tsx',
  'components/my-insurance/saved-research-panel.tsx',
  'components/my-insurance/guest-insurance-hq.tsx',
  'components/my-insurance/my-insurance-dashboard.tsx',
  'components/marketplace/flagship-plan-research.tsx',
  'components/calculators/aca-coverage-savings-planner.tsx',
  'components/tools/cost-coverage-planner.tsx',
  'components/tools/coverage-compass-tool.tsx',
  'app/providers/[slug]/page.tsx',
  'app/my-insurance/page.tsx',
];

for (const rel of REQUIRED) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

const card = read('components/provider-card.tsx');
if (!/SaveProviderButton/.test(card) || !/defaultStatus="researching"/.test(card)) {
  errors.push('directory cards must save agencies as researching');
}
if (!/city=\{provider\.city\}/.test(card)) {
  errors.push('directory cards must pass city/state onto save');
}

const profile = read('app/providers/[slug]/page.tsx');
if (!/SaveProviderButton/.test(profile)) {
  errors.push('provider profile missing save CTA');
}

const marketplace = read('components/marketplace/flagship-plan-research.tsx');
if (!/SaveCalculatorButton/.test(marketplace) || !/marketplace_research/.test(marketplace)) {
  errors.push('Marketplace Plan Research must save as marketplace_research');
}

const aca = read('components/calculators/aca-coverage-savings-planner.tsx');
if (!/SaveCalculatorButton/.test(aca) || !/aca_subsidy/.test(aca)) {
  errors.push('ACA planner missing save CTA');
}

const cost = read('components/tools/cost-coverage-planner.tsx');
if (!/SaveCalculatorButton/.test(cost) || !/cost_estimator/.test(cost)) {
  errors.push('Cost planner missing save CTA');
}

const compass = read('components/tools/coverage-compass-tool.tsx');
if (!/SaveCalculatorButton/.test(compass) || !/needs_assessment/.test(compass)) {
  errors.push('Coverage Compass must save into My Insurance');
}

const calcBtn = read('components/my-insurance/save-calculator-button.tsx');
if (!/requireSignInForCloud = false/.test(calcBtn)) {
  errors.push('tool save must stay guest-usable (no default auth wall)');
}
if (/lead|quote request|get a quote/i.test(calcBtn)) {
  errors.push('save calculator CTA has lead-gen language');
}

const hq = read('components/my-insurance/my-insurance-dashboard.tsx');
if (!/SavedResearchPanel/.test(hq) || !/GuestInsuranceHq/.test(hq)) {
  errors.push('HQ must show saved agencies + saved research');
}

const guest = read('components/my-insurance/guest-insurance-hq.tsx');
if (!/directory\?verified=true/.test(guest)) {
  errors.push('HQ empty agency state should route to verified directory');
}

const provider = read('components/my-insurance/my-insurance-provider.tsx');
if (!/mergeGuestCalculatorSnapshotsAction/.test(provider)) {
  errors.push('sign-in must merge guest research snapshots');
}

const types = read('lib/my-insurance/types.ts');
if (!/marketplace_research/.test(types)) {
  errors.push('CalculatorToolId missing marketplace_research');
}

if (errors.length) {
  console.error('Phase 12 My Insurance checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 12 My Insurance checks passed');
