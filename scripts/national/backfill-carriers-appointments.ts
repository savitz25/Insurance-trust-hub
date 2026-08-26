/**
 * INS-NAT-007 — carrier spine + Florida DFS appointment relationships.
 *
 *   npx tsx scripts/national/backfill-carriers-appointments.ts
 *   npx tsx scripts/national/backfill-carriers-appointments.ts --execute
 *
 * Default dry-run. Never writes public.providers.
 * Persists only CONFIRMED carriers and CONFIRMED appointment relationships.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  appointmentCurrency,
  carrierProvisionalKey,
  decideCarrierIdentity,
  CARRIER_IDENTITY_SCHEME,
} from '../../lib/national/carrier-identity';
import { classifyAppointmentTypeGroup } from '../../lib/dfs/appointments';

const OUTDIR =
  process.env.INS_NAT_007_OUTDIR ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-007-manifest';
const execute = process.argv.includes('--execute');

type ApptRow = {
  id: string;
  producer_id: string;
  carrier_name: string | null;
  appointing_entity_number: string | null;
  appointing_entity_name: string | null;
  appointment_type: string | null;
  appointment_status: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  source_checked_at: string | null;
};

type LinkRow = { source_record_id: string; entity_id: string };

async function fetchAll<T>(
  sb: SupabaseClient,
  table: string,
  select: string
): Promise<T[]> {
  const rows: T[] = [];
  const page = 1000;
  let from = 0;
  for (;;) {
    let q = sb.from(table).select(select).range(from, from + page - 1);
    if (table === 'source_record_links') {
      q = sb
        .from(table)
        .select(select)
        .eq('source_table', 'dfs_producers')
        .range(from, from + page - 1);
    }
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return rows;
}

async function count(sb: SupabaseClient, table: string, eq?: [string, string]): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  if (eq) q = q.eq(eq[0], eq[1]);
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

async function existingCarrierKeys(sb: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const page = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('national_entities')
      .select('id,provisional_key')
      .eq('entity_kind', 'carrier')
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      if (r.provisional_key) map.set(String(r.provisional_key), String(r.id));
    }
    if (rows.length < page) break;
    from += page;
  }
  return map;
}

async function existingRels(sb: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  const page = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('national_relationships')
      .select('from_entity_id,to_entity_id,relationship_type,source_dataset,source_record_id')
      .eq('relationship_type', 'appointed_by')
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      set.add(
        `${r.from_entity_id}|${r.to_entity_id}|${r.relationship_type}|${r.source_dataset}|${r.source_record_id}`
      );
    }
    if (rows.length < page) break;
    from += page;
  }
  return set;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const providers = await count(sb, 'providers');
  if (providers !== 170499) {
    console.error(JSON.stringify({ halt: 'providers_count_unexpected', providers }));
    process.exit(1);
  }

  const appts = await fetchAll<ApptRow>(
    sb,
    'dfs_appointments',
    'id,producer_id,carrier_name,appointing_entity_number,appointing_entity_name,appointment_type,appointment_status,effective_date,expiration_date,source_checked_at'
  );
  const links = await fetchAll<LinkRow>(
    sb,
    'source_record_links',
    'source_record_id,entity_id'
  );
  const agencyByProducer = new Map(links.map((l) => [l.source_record_id, l.entity_id]));

  const namesByNumber = new Map<string, string[]>();
  for (const a of appts) {
    const n = String(a.appointing_entity_number || '').trim();
    const name = (a.appointing_entity_name || a.carrier_name || '').replace(/\s+/g, ' ').trim();
    if (!n) continue;
    const list = namesByNumber.get(n) ?? [];
    if (name) list.push(name);
    namesByNumber.set(n, list);
  }

  type Rel = {
    appointmentId: string;
    agencyEntityId: string;
    carrierKey: string;
    carrierNumber: string;
    carrierName: string;
    appointmentType: string | null;
    status: string | null;
    effectiveDate: string | null;
    expirationDate: string | null;
    currency: ReturnType<typeof appointmentCurrency>;
    observedAt: string | null;
    confidence: 'CONFIRMED';
  };

  let attachedAgency = 0;
  let outsideGraph = 0;
  let unresolvedCarrier = 0;
  let reviewCarrier = 0;
  const rels: Rel[] = [];
  const confirmedCarriers = new Map<
    string,
    { number: string; legalName: string; key: string }
  >();

  for (const a of appts) {
    const agencyId = agencyByProducer.get(a.producer_id);
    if (!agencyId) {
      outsideGraph += 1;
      continue;
    }
    attachedAgency += 1;
    const num = String(a.appointing_entity_number || '').trim();
    const decision = decideCarrierIdentity({
      appointingEntityNumber: num,
      names: namesByNumber.get(num) ?? [
        a.appointing_entity_name || a.carrier_name || '',
      ],
    });
    if (decision.confidence === 'UNRESOLVED') {
      unresolvedCarrier += 1;
      continue;
    }
    if (decision.confidence === 'REVIEW_REQUIRED') {
      reviewCarrier += 1;
      continue;
    }
    if (decision.confidence !== 'CONFIRMED' || !decision.number) {
      unresolvedCarrier += 1;
      continue;
    }
    const key = carrierProvisionalKey(decision.number);
    confirmedCarriers.set(key, {
      number: decision.number,
      legalName: decision.legalName,
      key,
    });
    rels.push({
      appointmentId: a.id,
      agencyEntityId: agencyId,
      carrierKey: key,
      carrierNumber: decision.number,
      carrierName: decision.legalName,
      appointmentType: a.appointment_type,
      status: a.appointment_status,
      effectiveDate: a.effective_date,
      expirationDate: a.expiration_date,
      currency: appointmentCurrency({
        status: a.appointment_status,
        expirationDate: a.expiration_date,
      }),
      observedAt: a.source_checked_at,
      confidence: 'CONFIRMED',
    });
  }

  const currencyCounts = { CURRENT: 0, HISTORICAL: 0, UNKNOWN: 0 };
  for (const r of rels) currencyCounts[r.currency] += 1;

  const agenciesWithRels = new Set(rels.map((r) => r.agencyEntityId));
  const carriersPerAgency = new Map<string, Set<string>>();
  for (const r of rels) {
    const s = carriersPerAgency.get(r.agencyEntityId) ?? new Set();
    s.add(r.carrierKey);
    carriersPerAgency.set(r.agencyEntityId, s);
  }
  const breadth = { 1: 0, '2-5': 0, '6-10': 0, '11+': 0 };
  for (const set of carriersPerAgency.values()) {
    const n = set.size;
    if (n === 1) breadth[1] += 1;
    else if (n <= 5) breadth['2-5'] += 1;
    else if (n <= 10) breadth['6-10'] += 1;
    else breadth['11+'] += 1;
  }

  const existingC = await existingCarrierKeys(sb);
  const existingR = await existingRels(sb);
  const carrierInsert = [...confirmedCarriers.keys()].filter((k) => !existingC.has(k)).length;
  const relInsert = rels.filter((r) => {
    const id = existingC.get(r.carrierKey);
    if (!id) return true;
    return !existingR.has(
      `${r.agencyEntityId}|${id}|appointed_by|florida_dfs_appointments|${r.appointmentId}`
    );
  }).length;

  const summary = {
    task: 'INS-NAT-007',
    execute,
    providers,
    sourceAppointments: appts.length,
    dfsProducerLinks: agencyByProducer.size,
    agencyAttachment: {
      attachedToNationalAgency: attachedAgency,
      producerNotInCoreGraph: outsideGraph,
    },
    carrierDecisions: {
      confirmedDistinct: confirmedCarriers.size,
      reviewRequiredRows: reviewCarrier,
      unresolvedRows: unresolvedCarrier,
      identifierScheme: CARRIER_IDENTITY_SCHEME,
      naicClaimed: false,
    },
    relationshipsConfirmed: rels.length,
    currency: currencyCounts,
    agenciesWithAtLeastOne: agenciesWithRels.size,
    carrierBreadth: breadth,
    dryRun: {
      carrierInsert,
      carrierExisting: confirmedCarriers.size - carrierInsert,
      relationshipInsert: relInsert,
      relationshipExisting: rels.length - relInsert,
      providerWritesPredicted: 0,
    },
  };
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(
    resolve(OUTDIR, 'carriers.jsonl'),
    [...confirmedCarriers.values()].map((c) => JSON.stringify(c)).join('\n')
  );
  writeFileSync(
    resolve(OUTDIR, 'appointments.jsonl'),
    rels.map((r) => JSON.stringify(r)).join('\n')
  );
  console.log(JSON.stringify(summary, null, 2));

  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute to write CONFIRMED carriers/relationships.');
    return;
  }

  const nowKeys = await existingCarrierKeys(sb);
  for (const part of chunk([...confirmedCarriers.values()], 100)) {
    const fresh = part.filter((c) => !nowKeys.has(c.key));
    if (!fresh.length) continue;
    const payload = fresh.map((c) => ({
      entity_kind: 'carrier',
      identity_kind: 'provisional',
      npn: null,
      provisional_key: c.key,
      legal_name: c.legalName,
      display_name: c.legalName,
      identity_confidence: 'CONFIRMED',
      identity_notes: JSON.stringify({
        scheme: CARRIER_IDENTITY_SCHEME,
        appointingEntityNumber: c.number,
        notClaimedAsNaic: true,
        task: 'INS-NAT-007',
      }),
    }));
    const { data, error } = await sb.from('national_entities').insert(payload).select('id,provisional_key');
    if (error) {
      console.error('carrier insert fail', error.message);
      process.exit(1);
    }
    for (const row of data ?? []) {
      if (row.provisional_key) nowKeys.set(String(row.provisional_key), String(row.id));
    }
  }

  const nowRels = await existingRels(sb);
  let insertedR = 0;
  for (const part of chunk(rels, 100)) {
    const payload = [];
    for (const r of part) {
      const carrierId = nowKeys.get(r.carrierKey);
      if (!carrierId) {
        console.error('missing carrier', r.carrierKey);
        process.exit(1);
      }
      const k = `${r.agencyEntityId}|${carrierId}|appointed_by|florida_dfs_appointments|${r.appointmentId}`;
      if (nowRels.has(k)) continue;
      payload.push({
        from_entity_id: r.agencyEntityId,
        to_entity_id: carrierId,
        relationship_type: 'appointed_by',
        status: r.currency,
        effective_date: r.effectiveDate,
        termination_date: r.expirationDate,
        source_dataset: 'florida_dfs_appointments',
        source_record_id: r.appointmentId,
        source_observed_at: r.observedAt,
        raw: {
          jurisdiction: 'FL',
          appointmentType: r.appointmentType,
          appointmentTypeGroup: classifyAppointmentTypeGroup(r.appointmentType),
          appointmentStatus: r.status,
          appointingEntityNumber: r.carrierNumber,
          appointingEntityName: r.carrierName,
          currency: r.currency,
          confidence: 'CONFIRMED',
          task: 'INS-NAT-007',
        },
      });
      nowRels.add(k);
    }
    if (!payload.length) continue;
    const { error, data } = await sb.from('national_relationships').insert(payload).select('id');
    if (error) {
      console.error('relationship insert fail', error.message);
      process.exit(1);
    }
    insertedR += data?.length ?? 0;
  }

  const after = {
    executed: true,
    carriers: await count(sb, 'national_entities', ['entity_kind', 'carrier']),
    agencies: await count(sb, 'national_entities', ['entity_kind', 'agency']),
    relationships: await count(sb, 'national_relationships'),
    providers: await count(sb, 'providers'),
    bridges: await count(sb, 'provider_entity_bridges'),
    insertedRelationshipsThisRun: insertedR,
  };
  writeFileSync(resolve(OUTDIR, 'execution.json'), JSON.stringify(after, null, 2));
  console.log(JSON.stringify(after, null, 2));
  if (after.providers !== 170499) {
    console.error('providers changed');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
