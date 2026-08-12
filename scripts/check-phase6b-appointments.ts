/**
 * Phase 6B appointment hardening guards.
 *   npm run check:phase6b-appointments
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const errors: string[] = [];

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
}
function mustExist(rel: string) {
  if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
}

mustExist('lib/dfs/appointments.ts');
mustExist('supabase/migrations/20260812130000_phase6b_appointments_hardening.sql');
mustExist('docs/PHASE-6B-APPOINTMENTS.md');
mustExist('scripts/dfs/ensure-appointments-schema.ts');

const appt = read('lib/dfs/appointments.ts');
if (!/appointmentLicenseKeys/.test(appt)) {
  errors.push('missing appointmentLicenseKeys');
}
if (!/schemaVersion:\s*2/.test(appt)) {
  errors.push('snapshot schemaVersion 2 expected');
}
if (!/normalizeCarrierName/.test(appt)) {
  errors.push('missing carrier name dedupe helper');
}
if (!/classifyAppointmentTypeGroup/.test(appt)) {
  errors.push('missing neutral type grouping');
}
if (!/Not an endorsement/.test(appt)) {
  errors.push('honesty copy missing');
}

const attach = read('scripts/dfs/attach-appointments.ts');
if (!/clear-stale|refresh/.test(attach)) {
  errors.push('attach must support refresh/clear-stale');
}

const filters = read('components/search-filters.tsx');
if (!/appointments/.test(filters) || !/not a quality rank/i.test(filters)) {
  errors.push('directory filter must label research-only / not quality rank');
}

if (errors.length) {
  console.error('Phase 6B appointment checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 6B appointment checks passed');
