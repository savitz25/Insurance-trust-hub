/**
 * Probe appointment schema readiness (Phase 6A/6B).
 *
 *   npm run dfs:ensure-appointments-schema
 *
 * Does not run DDL via REST. Apply migrations in Supabase SQL Editor when missing.
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const report: Record<string, unknown> = {
    host: (() => {
      try {
        return new URL(url).host;
      } catch {
        return null;
      }
    })(),
  };

  const base = await sb
    .from('dfs_appointments')
    .select('id, producer_id, carrier_name, appointment_type, appointment_status')
    .limit(1);
  report.baseTable = !base.error;
  report.baseError = base.error?.message ?? null;

  const ext = await sb
    .from('dfs_appointments')
    .select(
      'license_number, appointing_entity_name, appointing_entity_number, license_key, county_normalized'
    )
    .limit(1);
  report.extendedColumns = !ext.error;
  report.extendedError = ext.error?.message ?? null;

  const { count: apptCount } = await sb
    .from('dfs_appointments')
    .select('id', { count: 'exact', head: true });
  report.appointmentRows = apptCount;

  const { count: withSnap } = await sb
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('verified', true)
    .not('contact->appointment_snapshot', 'is', null);
  report.providersWithSnapshot = withSnap;

  const ok = report.baseTable === true;
  report.ok = ok;
  report.applyMigrations = ok
    ? report.extendedColumns
      ? 'Extended columns present (6A/6B applied or compatible)'
      : 'Apply supabase/migrations/20260812120000_phase6a_appointments.sql and 20260812130000_phase6b_appointments_hardening.sql in SQL Editor'
    : 'dfs_appointments missing — run Phase 4 repair migration first';

  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
