/**
 * Apply Phase 6A appointment column upgrades via Supabase if missing.
 * Preferred: run supabase/migrations/20260812120000_phase6a_appointments.sql in SQL Editor.
 *
 * This script only probes and prints guidance (no arbitrary DDL via REST).
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

  const full = await sb
    .from('dfs_appointments')
    .select(
      'id, producer_id, license_number, appointing_entity_name, carrier_name, appointment_type, appointment_status'
    )
    .limit(1);

  if (!full.error) {
    console.log('Phase 6A columns present on dfs_appointments');
    process.exit(0);
  }

  console.warn('Extended columns missing or table issue:', full.error.message);
  console.warn(
    'Apply migration in Supabase SQL Editor:\n  supabase/migrations/20260812120000_phase6a_appointments.sql'
  );

  const base = await sb
    .from('dfs_appointments')
    .select('id, producer_id, carrier_name, appointment_type, appointment_status')
    .limit(1);

  if (base.error) {
    console.error('Base dfs_appointments unavailable:', base.error.message);
    process.exit(1);
  }

  console.log(
    'Base dfs_appointments OK — import script will use carrier_name + raw JSON fallback.'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
