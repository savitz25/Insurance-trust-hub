/**
 * Phase 10 — import Ohio ODI agencies CSV into odi_license_raw + odi_producers.
 *
 *   npm run odi:import -- --file data/ohio-raw/agencies.csv --dry-run
 *   npm run odi:import -- --file data/ohio-raw/agencies.csv --launch-markets-only
 *   npm run odi:import -- --file scripts/odi/fixtures/odi-agencies-sample.csv --launch-markets-only --dry-run
 *
 * There is no stable public bulk CSV URL. Ops: export business entities from
 * ODI Mailing List and save under data/ohio-raw/agencies.csv (gitignored).
 */

import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  mergeOdiProducers,
  normalizeOdiAgencyRow,
  type NormalizedOdiProducer,
} from '../../lib/odi/normalize';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { OH_ODI_MAILING_LIST_URL } from '../../lib/odi/launch-markets';

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
  return process.argv.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
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
  const launchOnly = hasFlag('launch-markets-only');
  const limit = Number(arg('limit') || '0') || 0;
  const file = arg('file');

  if (!file) {
    console.error(
      'Usage: npm run odi:import -- --file data/ohio-raw/agencies.csv [--launch-markets-only] [--dry-run] [--limit N]\n' +
        `Ops export: ${OH_ODI_MAILING_LIST_URL} (business entity / agency list)`
    );
    process.exit(1);
  }

  const abs = resolve(file);
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    console.error(`Export agencies from: ${OH_ODI_MAILING_LIST_URL}`);
    console.error('Save as data/ohio-raw/agencies.csv (gitignored).');
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
  const byLicense = new Map<string, NormalizedOdiProducer[]>();

  let batchId: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from('odi_import_batches')
      .insert({
        source_file: abs,
        source_label: 'ohio_odi_agencies',
        notes: launchOnly ? 'launch-markets-only filter' : null,
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error(
        'Failed to create batch (apply migration 20260814120000_ohio_odi_inventory.sql):',
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
        const { error } = await supabase.from('odi_license_raw').insert(rawBuffer);
        if (error) console.warn('raw flush error', error.message);
        rawBuffer.length = 0;
      }
    }

    const n = normalizeOdiAgencyRow(row);
    if (n.skipReason) {
      skipped++;
      skipReasons[n.skipReason] = (skipReasons[n.skipReason] ?? 0) + 1;
      continue;
    }
    if (n.state !== 'OH') {
      skipped++;
      skipReasons['not_ohio'] = (skipReasons['not_ohio'] ?? 0) + 1;
      continue;
    }
    if (launchOnly && !n.launchMarketId) {
      skipped++;
      skipReasons['not_launch_market'] = (skipReasons['not_launch_market'] ?? 0) + 1;
      continue;
    }

    const key = n.licenseNumber.toUpperCase();
    const list = byLicense.get(key) ?? [];
    list.push(n);
    byLicense.set(key, list);
  }

  if (supabase && batchId && rawBuffer.length) {
    await supabase.from('odi_license_raw').insert(rawBuffer);
  }

  const merged: NormalizedOdiProducer[] = [];
  for (const list of byLicense.values()) {
    const m = mergeOdiProducers(list);
    if (!m) continue;
    if (launchOnly && !m.launchMarketId) {
      skipped++;
      skipReasons['not_launch_market_after_merge'] =
        (skipReasons['not_launch_market_after_merge'] ?? 0) + 1;
      continue;
    }
    merged.push(m);
  }

  const byMarket: Record<string, number> = {};
  for (const m of merged) {
    const k = m.launchMarketId ?? 'none';
    byMarket[k] = (byMarket[k] ?? 0) + 1;
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
        launch_market_id: m.launchMarketId,
        source_checked_at: new Date().toISOString(),
        raw_batch_id: batchId,
        identity_key: m.identityKey,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('odi_producers')
        .upsert(slice, { onConflict: 'license_number' });
      if (error) {
        console.error('upsert error', error.message);
      } else {
        upserted += slice.length;
      }
    }
    await supabase
      .from('odi_import_batches')
      .update({ row_count: rowNum })
      .eq('id', batchId);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        launchMarketsOnly: launchOnly,
        sourceRows: rowNum,
        skipped,
        skipReasons,
        uniqueLicensesMerged: merged.length,
        byMarket,
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
