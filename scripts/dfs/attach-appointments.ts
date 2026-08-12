/**
 * Phase 6A/6B — attach appointment snapshots to promoted verified providers.
 *
 *   npm run dfs:attach-appointments -- --dry-run
 *   npm run dfs:attach-appointments -- --wave 2
 *   npm run dfs:attach-appointments -- --refresh   # also clear snapshot when no longer matched
 *
 * Only providers with dfs_provider_promotions rows receive snapshots.
 * Never creates providers. Never invents appointments.
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  buildAppointmentSnapshot,
  isActiveStatus,
} from '../../lib/dfs/appointments';
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
  /** When set, strip appointment_snapshot from promoted agencies with no match */
  const refresh = hasFlag('refresh') || hasFlag('clear-stale');

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

  const producerToProvider = new Map<string, string>();
  const allProviderIds = new Set<string>();
  for (const p of promos) {
    producerToProvider.set(p.producer_id, p.provider_id);
    allProviderIds.add(p.provider_id);
  }
  const producerIds = [...producerToProvider.keys()];

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
      console.log(
        `  appointments loaded through promo ${Math.min(i + chunkSize, producerIds.length)}/${producerIds.length}`
      );
    }
  }

  console.log(`Producers with any appointments: ${byProducer.size}`);

  // Prefer active rows when building snapshot inputs (keep inactive only if no active)
  for (const [pid, rows] of byProducer) {
    const active = rows.filter((r) => isActiveStatus(r.appointment_status));
    if (active.length) byProducer.set(pid, active);
  }

  const providerIdsWithAppts = [
    ...new Set(
      [...byProducer.keys()]
        .map((pid) => producerToProvider.get(pid))
        .filter(Boolean) as string[]
    ),
  ];

  // Load contacts for all promoted providers when refreshing stale snapshots
  const contactTargetIds = refresh
    ? [...allProviderIds]
    : providerIdsWithAppts;

  const contacts = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < contactTargetIds.length; i += chunkSize) {
    const slice = contactTargetIds.slice(i, i + chunkSize);
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
  let cleared = 0;
  let errors = 0;
  const asOf = new Date().toISOString();

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
      contacts.set(providerId, contact);
    }

    if (updated % 500 === 0 && updated > 0) {
      console.log(`  updated ${updated}/${attached}`);
    }
  }

  // Clear stale snapshots when refreshing
  if (refresh) {
    const withAppt = new Set(providerIdsWithAppts);
    for (const providerId of allProviderIds) {
      if (withAppt.has(providerId)) continue;
      const prev = contacts.get(providerId);
      if (!prev || !prev.appointment_snapshot) continue;
      if (dryRun) {
        cleared++;
        continue;
      }
      const { appointment_snapshot: _drop, ...rest } = prev;
      const { error: uerr } = await supabase
        .from('providers')
        .update({
          contact: rest,
          updated_at: new Date().toISOString(),
        })
        .eq('id', providerId)
        .eq('verified', true);
      if (uerr) errors++;
      else cleared++;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        refresh,
        promotions: promos.length,
        withAppointments: attached,
        withoutAppointments: Math.max(0, promos.length - byProducer.size),
        providersUpdated: updated,
        snapshotsCleared: cleared,
        errors,
        wave: waveArg ?? 'all',
        county: countyFilter ?? null,
        snapshotSchemaVersion: 2,
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
