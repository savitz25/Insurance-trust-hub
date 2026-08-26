/**
 * INS-NAT-008 — official-regulator contact observations for confirmed graph agencies.
 *
 *   npx tsx scripts/national/backfill-contact-observations.ts
 *   npx tsx scripts/national/backfill-contact-observations.ts --execute
 *
 * Default dry-run. Never writes public.providers. Never creates entities.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  classifyEmailContext,
  normalizeAddressValue,
  normalizeEmail,
  observationLabel,
  parsePhone,
  type ContactKind,
} from '../../lib/national/contact-normalize';

const OUTDIR =
  process.env.INS_NAT_008_OUTDIR ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-008-manifest';
const execute = process.argv.includes('--execute');
const SOURCE_CLASS = 'OFFICIAL_REGULATOR';

type Link = { source_table: string; source_record_id: string; entity_id: string; source_dataset: string };
type Obs = {
  entity_id: string;
  contact_kind: ContactKind;
  value: string;
  label: string;
  source_dataset: string;
  source_record_id: string;
  source_observed_at: string | null;
  attribution_confidence: 'CONFIRMED';
  public_eligible: boolean;
};

async function fetchAll<T>(sb: SupabaseClient, table: string, select: string, eq?: [string, string]): Promise<T[]> {
  const rows: T[] = [];
  const page = 1000;
  let from = 0;
  for (;;) {
    let q = sb.from(table).select(select).range(from, from + page - 1);
    if (eq) q = q.eq(eq[0], eq[1]);
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

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function addObs(bucket: Map<string, Obs>, o: Obs) {
  if (!o.entity_id || !o.value) return;
  const k = `${o.entity_id}|${o.contact_kind}|${o.source_dataset}|${o.value.toUpperCase()}`;
  if (!bucket.has(k)) bucket.set(k, o);
}

function publicEligible(kind: ContactKind): boolean {
  return kind !== 'named_contact' && kind !== 'contact_title';
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

  const graphAgencyTotal = await count(sb, 'national_entities', ['entity_kind', 'agency']);
  const existingObs = await count(sb, 'contact_observations');

  const links = await fetchAll<Link>(
    sb,
    'source_record_links',
    'source_table,source_record_id,entity_id,source_dataset'
  );
  const agencyBySource = new Map<string, string>();
  for (const l of links) {
    if (!l.entity_id || !l.source_record_id) continue;
    agencyBySource.set(`${l.source_table}|${l.source_record_id}`, l.entity_id);
  }

  const obs = new Map<string, Obs>();
  let skippedNoLineage = 0;

  const fl = await fetchAll<{
    id: string;
    phone: string | null;
    email: string | null;
    source_checked_at: string | null;
  }>(sb, 'dfs_producers', 'id,phone,email,source_checked_at');
  for (const r of fl) {
    const entity = agencyBySource.get(`dfs_producers|${r.id}`);
    if (!entity) {
      skippedNoLineage += 1;
      continue;
    }
    const em = normalizeEmail(r.email);
    if (em) {
      addObs(obs, {
        entity_id: entity,
        contact_kind: 'email',
        value: em,
        label: observationLabel({
          raw: String(r.email),
          emailContext: classifyEmailContext(em),
          sourceClass: SOURCE_CLASS,
        }),
        source_dataset: 'florida_dfs',
        source_record_id: r.id,
        source_observed_at: r.source_checked_at,
        attribution_confidence: 'CONFIRMED',
        public_eligible: publicEligible('email'),
      });
    }
    const ph = parsePhone(r.phone);
    if (ph) {
      addObs(obs, {
        entity_id: entity,
        contact_kind: 'phone',
        value: ph.e164,
        label: observationLabel({
          raw: ph.original,
          extension: ph.extension,
          sourceClass: SOURCE_CLASS,
        }),
        source_dataset: 'florida_dfs',
        source_record_id: r.id,
        source_observed_at: r.source_checked_at,
        attribution_confidence: 'CONFIRMED',
        public_eligible: publicEligible('phone'),
      });
    }
  }

  const appts = await fetchAll<{
    id: string;
    producer_id: string;
    raw: Record<string, string> | null;
    source_checked_at: string | null;
  }>(sb, 'dfs_appointments', 'id,producer_id,raw,source_checked_at');
  for (const a of appts) {
    const entity = agencyBySource.get(`dfs_producers|${a.producer_id}`);
    if (!entity) continue;
    const raw = a.raw || {};
    const em = normalizeEmail(raw['Email Address']);
    if (em) {
      addObs(obs, {
        entity_id: entity,
        contact_kind: 'email',
        value: em,
        label: observationLabel({
          raw: String(raw['Email Address']),
          emailContext: classifyEmailContext(em),
          sourceClass: SOURCE_CLASS,
        }),
        source_dataset: 'florida_dfs_appointments',
        source_record_id: a.producer_id,
        source_observed_at: a.source_checked_at,
        attribution_confidence: 'CONFIRMED',
        public_eligible: publicEligible('email'),
      });
    }
    const ph = parsePhone(raw['Business Phone']);
    if (ph) {
      addObs(obs, {
        entity_id: entity,
        contact_kind: 'phone',
        value: ph.e164,
        label: observationLabel({
          raw: ph.original,
          extension: ph.extension,
          sourceClass: SOURCE_CLASS,
        }),
        source_dataset: 'florida_dfs_appointments',
        source_record_id: a.producer_id,
        source_observed_at: a.source_checked_at,
        attribution_confidence: 'CONFIRMED',
        public_eligible: publicEligible('phone'),
      });
    }
    const phys = normalizeAddressValue({
      street: raw['Business Address1'],
      city: raw['Business City'],
      state: raw['Business State'],
      zip: raw['Business Zip'],
    });
    if (phys) {
      addObs(obs, {
        entity_id: entity,
        contact_kind: 'physical_address',
        value: phys,
        label: observationLabel({
          raw: [raw['Business Address1'], raw['Business City'], raw['Business State'], raw['Business Zip']]
            .filter(Boolean)
            .join(', '),
          addressClass: 'physical',
          sourceClass: SOURCE_CLASS,
        }),
        source_dataset: 'florida_dfs_appointments',
        source_record_id: a.producer_id,
        source_observed_at: a.source_checked_at,
        attribution_confidence: 'CONFIRMED',
        public_eligible: publicEligible('physical_address'),
      });
    }
    const mail = normalizeAddressValue({
      street: raw['Mailing Address'],
      city: raw['Mailing City'],
      state: raw['Mailing State'],
      zip: raw['Mailing Zip'],
    });
    if (mail) {
      addObs(obs, {
        entity_id: entity,
        contact_kind: 'mailing_address',
        value: mail,
        label: observationLabel({
          raw: [raw['Mailing Address'], raw['Mailing City'], raw['Mailing State'], raw['Mailing Zip']]
            .filter(Boolean)
            .join(', '),
          addressClass: 'mailing',
          sourceClass: SOURCE_CLASS,
        }),
        source_dataset: 'florida_dfs_appointments',
        source_record_id: a.producer_id,
        source_observed_at: a.source_checked_at,
        attribution_confidence: 'CONFIRMED',
        public_eligible: publicEligible('mailing_address'),
      });
    }
    const named = String(raw['AIC Full Name'] || '').replace(/\s+/g, ' ').trim();
    if (named) {
      addObs(obs, {
        entity_id: entity,
        contact_kind: 'named_contact',
        value: named.toUpperCase(),
        label: observationLabel({ raw: named, sourceClass: SOURCE_CLASS }),
        source_dataset: 'florida_dfs_appointments',
        source_record_id: a.producer_id,
        source_observed_at: a.source_checked_at,
        attribution_confidence: 'CONFIRMED',
        public_eligible: publicEligible('named_contact'),
      });
    }
  }

  const vt = await fetchAll<{
    id: string;
    address: string | null;
    city: string | null;
    zip: string | null;
    hq_state: string | null;
    source_checked_at: string | null;
  }>(sb, 'vt_producers', 'id,address,city,zip,hq_state,source_checked_at');
  for (const r of vt) {
    const entity = agencyBySource.get(`vt_producers|${r.id}`);
    if (!entity) {
      skippedNoLineage += 1;
      continue;
    }
    const mail = normalizeAddressValue({
      street: r.address,
      city: r.city,
      state: r.hq_state,
      zip: r.zip,
    });
    if (mail) {
      addObs(obs, {
        entity_id: entity,
        contact_kind: 'mailing_address',
        value: mail,
        label: observationLabel({
          raw: [r.address, r.city, r.hq_state, r.zip].filter(Boolean).join(', '),
          addressClass: 'mailing',
          sourceClass: SOURCE_CLASS,
        }),
        source_dataset: 'vermont_dfr',
        source_record_id: r.id,
        source_observed_at: r.source_checked_at,
        attribution_confidence: 'CONFIRMED',
        public_eligible: publicEligible('mailing_address'),
      });
    }
  }

  const odi = await fetchAll<{ id: string; npn: string | null; source_checked_at: string | null }>(
    sb,
    'odi_producers',
    'id,npn,source_checked_at'
  );
  const odiByNpn = new Map<string, { id: string; source_checked_at: string | null }>();
  for (const r of odi) if (r.npn) odiByNpn.set(String(r.npn), r);
  const ohRaw = await fetchAll<{ raw: Record<string, string> }>(sb, 'odi_license_raw', 'raw');
  for (const row of ohRaw) {
    const raw = row.raw || {};
    const npn = String(raw.NATIONALPROVIDERNUMBER || '').trim();
    const prod = odiByNpn.get(npn);
    if (!prod) continue;
    const entity = agencyBySource.get(`odi_producers|${prod.id}`);
    if (!entity) continue;
    const mail = normalizeAddressValue({
      street: raw.address_line1,
      city: raw.city,
      state: raw.state_province_name,
      zip: raw.postal_code,
    });
    if (mail) {
      addObs(obs, {
        entity_id: entity,
        contact_kind: 'mailing_address',
        value: mail,
        label: observationLabel({
          raw: [raw.address_line1, raw.city, raw.state_province_name, raw.postal_code]
            .filter(Boolean)
            .join(', '),
          addressClass: 'mailing',
          sourceClass: SOURCE_CLASS,
        }),
        source_dataset: 'ohio_odi',
        source_record_id: prod.id,
        source_observed_at: prod.source_checked_at,
        attribution_confidence: 'CONFIRMED',
        public_eligible: publicEligible('mailing_address'),
      });
    }
  }

  const list = [...obs.values()];
  const fingerprint = createHash('sha256')
    .update(
      list
        .map((o) => `${o.entity_id}|${o.contact_kind}|${o.source_dataset}|${o.value}`)
        .sort()
        .join('\n')
    )
    .digest('hex');

  const byKind: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const coveredAgencies = new Set(list.map((o) => o.entity_id));
  const emailsByEnt = new Map<string, Set<string>>();
  const phonesByEnt = new Map<string, Set<string>>();
  const srcByEnt = new Map<string, Set<string>>();
  for (const o of list) {
    byKind[o.contact_kind] = (byKind[o.contact_kind] ?? 0) + 1;
    bySource[o.source_dataset] = (bySource[o.source_dataset] ?? 0) + 1;
    const ss = srcByEnt.get(o.entity_id) ?? new Set();
    ss.add(o.source_dataset);
    srcByEnt.set(o.entity_id, ss);
    if (o.contact_kind === 'email') {
      const s = emailsByEnt.get(o.entity_id) ?? new Set();
      s.add(o.value);
      emailsByEnt.set(o.entity_id, s);
    }
    if (o.contact_kind === 'phone') {
      const s = phonesByEnt.get(o.entity_id) ?? new Set();
      s.add(o.value);
      phonesByEnt.set(o.entity_id, s);
    }
  }

  const existingKeys = new Set<string>();
  {
    const page = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await sb
        .from('contact_observations')
        .select('entity_id,contact_kind,source_dataset,value')
        .range(from, from + page - 1);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      for (const r of rows) {
        existingKeys.add(
          `${r.entity_id}|${r.contact_kind}|${r.source_dataset}|${String(r.value).toUpperCase()}`
        );
      }
      if (rows.length < page) break;
      from += page;
    }
  }
  const toInsert = list.filter(
    (o) => !existingKeys.has(`${o.entity_id}|${o.contact_kind}|${o.source_dataset}|${o.value.toUpperCase()}`)
  );

  const summary = {
    task: 'INS-NAT-008',
    execute,
    providers,
    graphAgencyCount: graphAgencyTotal,
    existingObservations: existingObs,
    sourceRecordsLinked: agencyBySource.size,
    skippedProducerRowsWithoutLineage: skippedNoLineage,
    observations: list.length,
    fingerprint,
    byKind,
    bySource,
    agenciesWithObservation: coveredAgencies.size,
    emails: byKind.email ?? 0,
    phones: byKind.phone ?? 0,
    websites: byKind.website ?? 0,
    physical: byKind.physical_address ?? 0,
    mailing: byKind.mailing_address ?? 0,
    named: byKind.named_contact ?? 0,
    titles: byKind.contact_title ?? 0,
    dryRun: {
      insert: toInsert.length,
      existing: list.length - toInsert.length,
      providerWritesPredicted: 0,
    },
    nvMs: 'inspected; not attached (no confirmed national identity)',
    txCityZipOnly: 'not stored as physical/mailing office (no street)',
  };
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(resolve(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (!execute) {
    console.log('DRY-RUN only. Re-run with --execute to write observations.');
    return;
  }

  let inserted = 0;
  for (const part of chunk(toInsert, 150)) {
    const payload = part.map((o) => ({
      entity_id: o.entity_id,
      contact_kind: o.contact_kind,
      value: o.value,
      label: o.label,
      source_dataset: o.source_dataset,
      source_record_id: o.source_record_id,
      source_observed_at: o.source_observed_at,
      attribution_confidence: o.attribution_confidence,
      public_eligible: o.public_eligible,
    }));
    const { data, error } = await sb.from('contact_observations').insert(payload).select('id');
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        continue;
      }
      console.error('insert fail', error.message);
      process.exit(1);
    }
    inserted += data?.length ?? 0;
  }

  const after = {
    executed: true,
    insertedThisRun: inserted,
    contact_observations: await count(sb, 'contact_observations'),
    agencies: await count(sb, 'national_entities', ['entity_kind', 'agency']),
    providers: await count(sb, 'providers'),
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
