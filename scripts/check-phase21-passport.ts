/**
 * Phase 21 — My Insurance research passport guards.
 *   npm run check:phase21-passport
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { allowsRegulatorLeadForm } from '../lib/regulators/labels';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

for (const rel of [
  'supabase/migrations/20260818120000_research_sessions.sql',
  'lib/my-insurance/session-storage.ts',
  'components/my-insurance/save-research-session-button.tsx',
  'components/my-insurance/research-sessions-panel.tsx',
  'components/my-insurance/freshness-attention.tsx',
  'docs/MY-INSURANCE.md',
]) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

const sql = read('supabase/migrations/20260818120000_research_sessions.sql');
if (!/ENABLE ROW LEVEL SECURITY/.test(sql) || !/research_sessions_all_own/.test(sql)) {
  errors.push('research_sessions must enable RLS for own rows');
}

const types = read('lib/my-insurance/types.ts');
if (!/research_session/.test(types) || !/ResearchSessionInput/.test(types)) {
  errors.push('pending save must include research_session');
}

const actions = read('actions/my-insurance.ts');
if (!/saveResearchSessionAction/.test(actions) || !/freshnessItems/.test(actions)) {
  errors.push('actions must save sessions and compute freshness');
}
if (!/sendResearchSessionEmail/.test(actions)) {
  errors.push('session save should offer best-effort email');
}

const dash = read('components/my-insurance/my-insurance-dashboard.tsx');
if (!/ResearchSessionsPanel/.test(dash) || !/FreshnessAttention/.test(dash)) {
  errors.push('HQ must list sessions and freshness');
}

const profile = read('app/providers/[slug]/page.tsx');
if (!/SaveResearchSessionButton/.test(profile)) {
  errors.push('profiles must offer save research session');
}

const hubMod = read('components/research-this-market.tsx');
if (!/SaveResearchSessionButton/.test(hubMod)) {
  errors.push('priority hubs must offer save session');
}

if (allowsRegulatorLeadForm('NV') || allowsRegulatorLeadForm('VT')) {
  errors.push('NV/VT must remain lead-form free');
}

const FORBIDDEN = [/we will contact you/i, /get quotes/i, /outbound sales/i, /lead capture/i];
for (const rel of [
  'components/my-insurance/save-research-session-button.tsx',
  'lib/my-insurance/emails.ts',
  'components/my-insurance/research-sessions-panel.tsx',
]) {
  const text = read(rel);
  for (const re of FORBIDDEN) {
    if (re.test(text)) errors.push(`${rel} matches ${re}`);
  }
}

const docs = read('docs/MY-INSURANCE.md');
if (!/research_sessions/.test(docs) || !/research passport/.test(docs)) {
  errors.push('MY-INSURANCE.md must document sessions');
}

const pkg = read('package.json');
if (!/check:phase21-passport/.test(pkg)) {
  errors.push('package.json missing check:phase21-passport');
}

if (errors.length) {
  console.error('Phase 21 passport checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 21 My Insurance passport checks passed');
