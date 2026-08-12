/**
 * Phase 9 — import NJ organization/agency CSV into nj_license_raw + nj_producers.
 *
 *   npm run nj:import -- --file data/nj-raw/agencies.csv --dry-run
 *   npm run nj:import -- --file data/nj-raw/agencies.csv --launch-regions-only
 *
 * There is no free bulk download like FL/TX — ops must supply the CSV
 * (see docs/NEW-JERSEY-DOBI-INVENTORY.md).
 */

import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  mergeNjProducers,
  normalizeNjAgencyRow,
  type NormalizedNjProducer,
} from '../../lib/nj/normalize';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) {
    const v = process.argv[i + 1];
    if (v && !v.startsWith('--')) return v;
    return 'true';
  }
  const pref = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (pref) return pref.split('=').slice(1).join('=');
  return undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.some(
    (a) => a === `--${name}` || a.startsWith(`--${name}=`)
  );
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
  return out.map((s) => s.trim().replace(/^"|"$/g, ''));
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const launchOnly = hasFlag('launch-regions-only');
  const limit = Number(arg('limit') || '0') || 0;
  const file = arg('file');

  if (!file) {
    console.error(
      'Usage: npm run nj:import -- --file data/nj-raw/agencies.csv [--launch-regions-only] [--dry-run] [--limit N]\n' +
        'Acquire organization export first — see docs/NEW-JERSEY-DOBI-INVENTORY.md'
    );
    process.exit(1);
  }

  const abs = resolve(file);
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    console.error(
      'No free bulk URL. Place an organization/agency CSV under data/nj-raw/ (gitignored).'
    );
    process.exit(1);
  }

  loadLocalEnv(resolve(process.cwd()));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = null;
  if (!dryRun) {
    const { url, serviceRoleKey } = requireSupabaseOpsEnv();
    supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  console.log(`Reading ${abs}`);

  let headers: string[] | null = null;
  let rowNum = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};
  const byLicense = new Map<string, NormalizedNjProducer[]>();

  let batchId: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from('nj_import_batches')
      .insert({
        source_file: abs,
        source_label: 'new_jersey_dobi_agencies',
        notes: launchOnly ? 'launch-regions-only filter' : null,
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error(
        'Failed to create batch (apply migration 20260813120000_new_jersey_dobi_inventory.sql):',
        error?.message
      );
      process.exit(1);
    }
    batchId = data.id as string;
    console.log('Batch', batchId);
  }

  const rawBuffer: Record<string, unknown>[] = [];
  const rl = createInterface({
    input: createReadStream(abs, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (!headers) {
      headers = cols.map((h) => h.trim());
      console.log('Columns:', headers.slice(0, 14).join(' | '));
      continue;
    }
    rowNum++;
    if (limit && rowNum > limit) break;

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });

    if (supabase && batchId) {
      rawBuffer.push({
        batch_id: batchId,
        source_file: abs,
        row_number: rowNum,
        raw: row,
      });
      if (rawBuffer.length >= 200) {
        const { error } = await supabase.from('nj_license_raw').insert(rawBuffer);
        if (error) console.warn('raw flush error', error.message);
        rawBuffer.length = 0;
      }
    }

    const n = normalizeNjAgencyRow(row);
    if (n.skipReason) {
      skipped++;
      skipReasons[n.skipReason] = (skipReasons[n.skipReason] ?? 0) + 1;
      continue;
    }
    if (n.state !== 'NJ') {
      skipped++;
      skipReasons['not_new_jersey'] = (skipReasons['not_new_jersey'] ?? 0) + 1;
      continue;
    }
    if (launchOnly && !n.launchRegionId) {
      skipped++;
      skipReasons['not_launch_region'] =
        (skipReasons['not_launch_region'] ?? 0) + 1;
      continue;
    }

    const key = n.licenseNumber.toUpperCase();
    const list = byLicense.get(key) ?? [];
    list.push(n);
    byLicense.set(key, list);
  }

  if (supabase && batchId && rawBuffer.length) {
    await supabase.from('nj_license_raw').insert(rawBuffer);
  }

  const merged: NormalizedNjProducer[] = [];
  for (const list of byLicense.values()) {
    const m = mergeNjProducers(list);
    if (!m) continue;
    if (launchOnly && !m.launchRegionId) {
      skipped++;
      skipReasons['not_launch_region_after_merge'] =
        (skipReasons['not_launch_region_after_merge'] ?? 0) + 1;
      continue;
    }
    merged.push(m);
  }

  const byRegion: Record<string, number> = {};
  for (const m of merged) {
    const k = m.launchRegionId ?? 'none';
    byRegion[k] = (byRegion[k] ?? 0) + 1;
  }

  let upserted = 0;
  if (supabase && batchId) {
    const chunk = 100;
    for (let i = 0; i < merged.length; i += chunk) {
      const slice = merged.slice(i, i + chunk).map((m) => ({
        entity_type: 'business',
        license_number: m.licenseNumber,
        npn: m.npn,
        legal_name: m.legalName,
        display_name: m.displayName,
        org_type: m.orgType,
        license_types: m.licenseTypes,
        qualifications: m.qualifications,
        license_status: m.licenseStatus,
        issue_date: m.issueDate,
        expiration_date: m.expirationDate,
        city: m.city,
        county: m.county,
        county_normalized: m.countyNormalized,
        state: m.state,
        zip: m.zip,
        launch_region_id: m.launchRegionId,
        source_checked_at: new Date().toISOString(),
        raw_batch_id: batchId,
        identity_key: m.identityKey,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('nj_producers')
        .upsert(slice, { onConflict: 'license_number' });
      if (error) {
        console.error('upsert error', error.message);
      } else {
        upserted += slice.length;
      }
    }
    await supabase
      .from('nj_import_batches')
      .update({ row_count: rowNum })
      .eq('id', batchId);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        launchRegionsOnly: launchOnly,
        sourceRows: rowNum,
        skipped,
        skipReasons,
        uniqueLicensesMerged: merged.length,
        byRegion,
        upserted: dryRun ? 0 : upserted,
        batchId,
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
