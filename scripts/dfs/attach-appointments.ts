/**
 * Phase 6A — attach appointment snapshots to promoted verified providers.
 *
 *   npm run dfs:attach-appointments -- --dry-run
 *   npm run dfs:attach-appointments -- --wave 2
 *   npm run dfs:attach-appointments -- --limit 50
 *
 * Only providers with dfs_provider_promotions rows receive snapshots.
 * Never creates providers. Never invents appointments.
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { buildAppointmentSnapshot } from '../../lib/dfs/appointments';
import {
  FL_LAUNCH_COUNTIES,
  countiesForWave,
  type FlLaunchWave,
} from '../../lib/dfs/launch-counties';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  return undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const limit = Number(arg('limit') || '0') || 0;
  const waveArg = arg('wave');
  const countyFilter = arg('county');

  let countyIds: string[] | null = null;
  if (waveArg) {
    const w = Number(waveArg) as FlLaunchWave;
    if (w !== 1 && w !== 2) {
      console.error('--wave must be 1 or 2');
      process.exit(1);
    }
    countyIds = countiesForWave(w).map((c) => c.id);
  }
  if (countyFilter) {
    countyIds = FL_LAUNCH_COUNTIES.filter((c) => c.id === countyFilter).map(
      (c) => c.id
    );
    if (!countyIds.length) {
      console.error('Unknown --county', countyFilter);
      process.exit(1);
    }
  }

  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Load promotions
  let promos: Array<{
    producer_id: string;
    provider_id: string;
    launch_county: string;
  }> = [];
  {
    let from = 0;
    const page = 1000;
    for (;;) {
      let q = supabase
        .from('dfs_provider_promotions')
        .select('producer_id, provider_id, launch_county')
        .range(from, from + page - 1);
      if (countyIds) {
        q = q.in('launch_county', countyIds);
      }
      const { data, error } = await q;
      if (error) {
        console.error(error.message);
        process.exit(1);
      }
      if (!data?.length) break;
      promos.push(...data);
      if (data.length < page) break;
      from += page;
    }
  }

  if (limit > 0) promos = promos.slice(0, limit);
  console.log(`Promotions loaded: ${promos.length}`);

  // Producer → provider map
  const producerToProvider = new Map<string, string>();
  for (const p of promos) {
    producerToProvider.set(p.producer_id, p.provider_id);
  }
  const producerIds = [...producerToProvider.keys()];

  // Load all appointments for these producers (batched)
  type ApptRow = {
    producer_id: string;
    appointing_entity_name?: string | null;
    carrier_name?: string | null;
    appointment_type?: string | null;
    appointment_status?: string | null;
    effective_date?: string | null;
    expiration_date?: string | null;
  };
  const byProducer = new Map<string, ApptRow[]>();

  const chunkSize = 200;
  for (let i = 0; i < producerIds.length; i += chunkSize) {
    const slice = producerIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('dfs_appointments')
      .select(
        'producer_id, appointing_entity_name, carrier_name, appointment_type, appointment_status, effective_date, expiration_date'
      )
      .in('producer_id', slice);
    if (error) {
      // base schema may lack appointing_entity_name
      const { data: data2, error: e2 } = await supabase
        .from('dfs_appointments')
        .select(
          'producer_id, carrier_name, appointment_type, appointment_status, effective_date, expiration_date'
        )
        .in('producer_id', slice);
      if (e2) {
        console.error('appointments load', e2.message);
        process.exit(1);
      }
      for (const row of data2 ?? []) {
        const list = byProducer.get(row.producer_id) ?? [];
        list.push(row);
        byProducer.set(row.producer_id, list);
      }
    } else {
      for (const row of data ?? []) {
        const list = byProducer.get(row.producer_id) ?? [];
        list.push(row);
        byProducer.set(row.producer_id, list);
      }
    }
    if ((i / chunkSize) % 10 === 0) {
      console.log(`  appointments loaded through promo ${Math.min(i + chunkSize, producerIds.length)}/${producerIds.length}`);
    }
  }

  console.log(`Producers with any appointments: ${byProducer.size}`);

  // Load provider contacts for those with appointments
  const providerIds = [
    ...new Set(
      [...byProducer.keys()]
        .map((pid) => producerToProvider.get(pid))
        .filter(Boolean) as string[]
    ),
  ];

  const contacts = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < providerIds.length; i += chunkSize) {
    const slice = providerIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('providers')
      .select('id, contact, verified')
      .in('id', slice)
      .eq('verified', true);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    for (const p of data ?? []) {
      contacts.set(p.id, (p.contact ?? {}) as Record<string, unknown>);
    }
  }

  let attached = 0;
  let updated = 0;
  let errors = 0;
  const asOf = new Date().toISOString();
  const noAppointments = promos.length - byProducer.size;

  for (const [producerId, appts] of byProducer) {
    const providerId = producerToProvider.get(producerId);
    if (!providerId) continue;
    const snapshot = buildAppointmentSnapshot(appts, asOf);
    if (!snapshot) continue;
    attached++;

    if (dryRun) continue;

    const prev = contacts.get(providerId);
    if (!prev) {
      errors++;
      continue;
    }
    const contact = {
      ...prev,
      appointment_snapshot: snapshot,
    };

    const { error: uerr } = await supabase
      .from('providers')
      .update({
        contact,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId)
      .eq('verified', true);

    if (uerr) {
      errors++;
    } else {
      updated++;
    }

    if (updated % 500 === 0 && updated > 0) {
      console.log(`  updated ${updated}/${attached}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        promotions: promos.length,
        withAppointments: attached,
        withoutAppointments: Math.max(0, noAppointments),
        providersUpdated: updated,
        errors,
        wave: waveArg ?? 'all',
        county: countyFilter ?? null,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
