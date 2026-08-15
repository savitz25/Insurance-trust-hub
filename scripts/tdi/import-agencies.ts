/**
 * Phase 8 / TX-2 — import Texas TDI agencies CSV into tdi_license_raw + tdi_producers.
 *
 *   npm run tdi:import -- --file data/tdi-raw/tdi-agencies.csv --dry-run
 *   npm run tdi:import -- --file data/tdi-raw/tdi-agencies.csv --confirm
 *   npm run tdi:import -- --file data/tdi-raw/tdi-agencies.csv --launch-markets-only --confirm
 *
 * Default stages every active TX-licensed agency (any HQ). `--launch-markets-only`
 * still limits to TX-address launch metros. Writes require --dry-run or --confirm.
 *
 * Source: https://data.texas.gov/dataset/.../3yqc-fcdt
 */

import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  mergeTdiProducers,
  normalizeTdiAgencyRow,
  type NormalizedTdiProducer,
} from '../../lib/tdi/normalize';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { TX_TDI_SODA_URL } from '../../lib/tdi/launch-markets';

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

async function downloadCsv(dest: string): Promise<void> {
  mkdirSync(dirname(dest), { recursive: true });
  console.log('Downloading TDI agencies CSV from Socrata…');
  const res = await fetch(TX_TDI_SODA_URL);
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }
  const text = await res.text();
  writeFileSync(dest, text, 'utf8');
  console.log(`Saved ${dest} (${Math.round(text.length / 1024)} KB)`);
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const confirm = hasFlag('confirm');
  const launchOnly = hasFlag('launch-markets-only');
  const limit = Number(arg('limit') || '0') || 0;
  let file = arg('file');

  if (!dryRun && !confirm) {
    console.error('Refusing to write without --dry-run or --confirm');
    process.exit(1);
  }

  if (hasFlag('download')) {
    const dest = resolve(
      process.cwd(),
      file || 'data/tdi-raw/agencies.csv'
    );
    await downloadCsv(dest);
    file = dest;
  }

  if (!file) {
    console.error(
      'Usage: npm run tdi:import -- --file data/tdi-raw/tdi-agencies.csv [--dry-run|--confirm] [--launch-markets-only] [--limit N]\n' +
        '   or: npm run tdi:import -- --download --dry-run'
    );
    process.exit(1);
  }

  const abs = resolve(file);
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    console.error(
      'Download: https://data.texas.gov/api/views/3yqc-fcdt/rows.csv?accessType=DOWNLOAD'
    );
    console.error('Or: npm run tdi:import -- --download');
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
  /** license → partial rows to merge */
  const byLicense = new Map<string, NormalizedTdiProducer[]>();

  let batchId: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from('tdi_import_batches')
      .insert({
        source_file: abs,
        source_label: 'texas_tdi_agencies',
        notes: launchOnly ? 'launch-markets-only filter' : 'tx2-statewide',
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error(
        'Failed to create batch (apply migration 20260812200000_texas_tdi_inventory.sql):',
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
        const { error } = await supabase.from('tdi_license_raw').insert(rawBuffer);
        if (error) console.warn('raw flush error', error.message);
        rawBuffer.length = 0;
      }
    }

    const n = normalizeTdiAgencyRow(row);
    if (n.skipReason) {
      skipped++;
      skipReasons[n.skipReason] = (skipReasons[n.skipReason] ?? 0) + 1;
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
    await supabase.from('tdi_license_raw').insert(rawBuffer);
  }

  const merged: NormalizedTdiProducer[] = [];
  for (const list of byLicense.values()) {
    const m = mergeTdiProducers(list);
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
  const hq = { tx: 0, nonTx: 0, blank: 0 };
  for (const m of merged) {
    const k = m.launchMarketId ?? 'none';
    byMarket[k] = (byMarket[k] ?? 0) + 1;
    if (m.state === 'TX') hq.tx++;
    else if (m.state) hq.nonTx++;
    else hq.blank++;
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
        .from('tdi_producers')
        .upsert(slice, { onConflict: 'license_number' });
      if (error) {
        console.error('upsert error', error.message);
      } else {
        upserted += slice.length;
      }
    }
    await supabase
      .from('tdi_import_batches')
      .update({ row_count: rowNum })
      .eq('id', batchId);
  }

  const summary = {
    dryRun,
    confirm,
    launchMarketsOnly: launchOnly,
    notes: launchOnly ? 'launch-markets-only filter' : 'tx2-statewide',
    sourceRows: rowNum,
    skipped,
    skipReasons,
    uniqueLicensesMerged: merged.length,
    hq,
    byMarket,
    upserted: dryRun ? 0 : upserted,
    batchId,
  };

  const outDir = resolve(process.cwd(), 'scripts/output');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(
    resolve(outDir, `tdi-import-${dryRun ? 'dry-run' : 'confirm'}-${stamp}.json`),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
