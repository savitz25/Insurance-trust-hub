/**
 * Phase 6A appointment enrichment guards.
 *   npm run check:phase6a-appointments
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
mustExist('scripts/dfs/import-appointments.ts');
mustExist('scripts/dfs/attach-appointments.ts');
mustExist('components/provider-appointment-snapshot.tsx');
mustExist('supabase/migrations/20260812120000_phase6a_appointments.sql');
mustExist('docs/PHASE-6A-APPOINTMENTS.md');

const appt = read('lib/dfs/appointments.ts');
if (!/Not an endorsement/.test(appt)) {
  errors.push('appointments.ts missing endorsement honesty');
}
if (/medicare/i.test(appt) && /infer/i.test(appt)) {
  // ok if warning text only
}

const page = read('app/providers/[slug]/page.tsx');
if (!/ProviderAppointmentSnapshotSection/.test(page)) {
  errors.push('provider profile missing appointment section wiring');
}

const importScript = read('scripts/dfs/import-appointments.ts');
if (!/no_producer_match/.test(importScript)) {
  errors.push('import-appointments must skip unmatched licenses');
}
if (/insert.*providers/i.test(importScript) && !/dfs_appointments/.test(importScript)) {
  errors.push('import-appointments must not create public providers');
}

const attach = read('scripts/dfs/attach-appointments.ts');
if (!/dfs_provider_promotions/.test(attach)) {
  errors.push('attach-appointments must require promotions bridge');
}
if (!/appointment_snapshot/.test(attach)) {
  errors.push('attach-appointments must write appointment_snapshot');
}

if (errors.length) {
  console.error('Phase 6A appointment checks FAILED:');
  errors.forEach((e) => console.error(' ', e));
  process.exit(1);
}
console.log('Phase 6A appointment checks passed');
