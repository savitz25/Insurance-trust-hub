/**
 * Phase 6A — import Florida DFS Active Appointments (Business) into dfs_appointments.
 *
 *   npm run dfs:import-appointments -- --file data/dfs-raw/AllActiveAppointmentsBusiness.csv
 *   npm run dfs:import-appointments -- --file ... --launch-counties-only --dry-run --limit 100
 *
 * Match rule: license number → dfs_producers (business). Unmatched rows skipped (counted).
 * Does not create public providers.
 */

import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  normalizeAppointmentRow,
  isActiveStatus,
} from '../../lib/dfs/appointments';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  return undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => {
    let v = s.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    const m = v.match(/^=\s*"([^"]*)"\s*$/);
    if (m) return m[1].trim();
    const m2 = v.match(/^=\s*(.+)\s*$/);
    if (m2) return m2[1].replace(/^"|"$/g, '').trim();
    return v.trim();
  });
}

function isHeaderRow(cols: string[]): boolean {
  const joined = cols.join(' ').toLowerCase();
  return joined.includes('license number') && joined.includes('appoint');
}

async function main() {
  const file = arg('file');
  const dryRun = hasFlag('dry-run');
  const limit = Number(arg('limit') || '0') || 0;
  const launchOnly = hasFlag('launch-counties-only');
  const activeOnly = !hasFlag('include-inactive');

  if (!file) {
    console.error(
      'Usage: npm run dfs:import-appointments -- --file data/dfs-raw/AllActiveAppointmentsBusiness.csv [--launch-counties-only] [--dry-run] [--limit N]'
    );
    console.error(
      'Download: https://www.myfloridacfo.com/downloads/AAS/LicenseeSearch/AllActiveAppointmentsBusiness.csv'
    );
    process.exit(1);
  }

  const abs = resolve(file);
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    console.error(
      'Download All Active Appointments - Business from https://licenseesearch.fldfs.com/BulkDownload'
    );
    process.exit(1);
  }

  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let batchId: string | null = null;

  if (!dryRun) {
    const { data: batch, error } = await supabase
      .from('dfs_import_batches')
      .insert({
        source_file: abs,
        entity_type: 'appointment',
        row_count: 0,
        notes: launchOnly ? 'appointments launch-counties-only' : 'appointments full business',
      })
      .select('id')
      .single();
    if (error || !batch) {
      console.error('Failed to create batch', error?.message);
      process.exit(1);
    }
    batchId = batch.id;
    console.log('Batch', batchId);
  }

  // License → producer_id cache for business entities
  const producerByLicense = new Map<string, string>();
  {
    let from = 0;
    const page = 1000;
    for (;;) {
      const { data, error } = await supabase
        .from('dfs_producers')
        .select('id, license_number')
        .eq('entity_type', 'business')
        .range(from, from + page - 1);
      if (error) {
        console.error('producer load', error.message);
        break;
      }
      if (!data?.length) break;
      for (const r of data) {
        if (r.license_number) {
          producerByLicense.set(String(r.license_number).toUpperCase(), r.id);
        }
      }
      if (data.length < page) break;
      from += page;
    }
    console.log(`Cached ${producerByLicense.size} business producers for match`);
  }

  let headers: string[] = [];
  let dataRows = 0;
  let inserted = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let buffer: any[] = [];

  const bump = (k: string) => {
    skipped++;
    skipReasons[k] = (skipReasons[k] ?? 0) + 1;
  };

  // Prefer extended columns; fall back to base schema if migration not applied yet
  // (probe before opening the file stream so we don't lose buffered lines)
  let useExtended = true;
  {
    const probe = await supabase
      .from('dfs_appointments')
      .select('license_number, appointing_entity_name')
      .limit(1);
    if (probe?.error) {
      useExtended = false;
      console.log(
        'Using base dfs_appointments columns (apply phase6a migration for license_number etc.)'
      );
    }
  }

  const rl = createInterface({
    input: createReadStream(abs, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  const flush = async () => {
    if (!buffer.length) {
      buffer = [];
      return;
    }
    if (dryRun) {
      inserted += buffer.length;
      buffer = [];
      return;
    }
    const chunk = buffer;
    buffer = [];
    const payloads = chunk.map((row) =>
      useExtended
        ? row
        : {
            producer_id: row.producer_id,
            carrier_name: row.carrier_name,
            appointment_type: row.appointment_type,
            appointment_status: row.appointment_status,
            effective_date: row.effective_date,
            expiration_date: row.expiration_date,
            raw: row.raw,
            source_checked_at: row.source_checked_at,
          }
    );

    const { error } = await supabase.from('dfs_appointments').insert(payloads);
    if (!error) {
      inserted += payloads.length;
      return;
    }

    // Fallback row-by-row (duplicates / partial schema)
    for (const payload of payloads) {
      const { error: e2 } = await supabase.from('dfs_appointments').insert(payload);
      if (e2) {
        if (/duplicate|unique/i.test(e2.message)) {
          bump('duplicate');
        } else {
          bump('insert_failed');
          if ((skipReasons.insert_failed ?? 0) < 3) {
            console.error('insert sample', e2.message);
          }
        }
      } else {
        inserted++;
      }
    }
  };

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (!headers.length) {
      if (!isHeaderRow(cols)) continue;
      headers = cols;
      console.log('Columns:', headers.slice(0, 10).join(' | '), '…');
      continue;
    }
    if (isHeaderRow(cols)) continue;

    dataRows++;
    if (limit && dataRows > limit) break;

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });

    const n = normalizeAppointmentRow(row, 'business');
    if (n.skipReason) {
      bump(n.skipReason);
      continue;
    }
    if (activeOnly && !isActiveStatus(n.appointmentStatus)) {
      bump('not_active');
      continue;
    }
    if (launchOnly && !n.launchCountyId) {
      bump('not_launch_county');
      continue;
    }

    const producerId = producerByLicense.get(n.licenseNumber.toUpperCase());
    if (!producerId) {
      bump('no_producer_match');
      continue;
    }

    buffer.push({
      producer_id: producerId,
      license_number: n.licenseNumber,
      appointing_entity_number: n.appointingEntityNumber,
      appointing_entity_name: n.appointingEntityName,
      carrier_name: n.appointingEntityName,
      appointment_type: n.appointmentTypeDesc || n.appointmentType,
      appointment_status: n.appointmentStatus,
      effective_date: n.effectiveDate,
      expiration_date: n.expirationDate,
      county: n.county,
      county_normalized: n.countyNormalized,
      entity_type: 'business',
      batch_id: batchId,
      raw: row,
      source_checked_at: new Date().toISOString(),
      source: 'florida_dfs',
      source_url: 'https://licenseesearch.fldfs.com/BulkDownload',
    });

    if (buffer.length >= 100) await flush();
  }

  await flush();

  if (batchId) {
    await supabase
      .from('dfs_import_batches')
      .update({ row_count: dataRows })
      .eq('id', batchId);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        file: abs,
        dataRows,
        inserted,
        skipped,
        skipReasons,
        producersCached: producerByLicense.size,
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
