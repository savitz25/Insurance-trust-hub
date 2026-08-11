/**
 * Phase 4 — import Florida DFS bulk CSV into dfs_license_raw + dfs_producers.
 *
 *   npx tsx scripts/dfs/import-dfs-csv.ts --file path/to/AllValidLicensesBusiness.csv --type business
 *   npx tsx scripts/dfs/import-dfs-csv.ts --file path/to/AllValidLicensesIndividual.csv --type individual
 *   npx tsx scripts/dfs/import-dfs-csv.ts --file ... --type business --dry-run
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (not public anon).
 * Raw multi-hundred-MB files stay local under data/dfs-raw/ (gitignored).
 */

import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeDfsRow, type DfsEntityType } from '../../lib/dfs/normalize';

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
    // strip wrapping quotes
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    // Excel formula cells: ="12345"
    const m = v.match(/^=\s*"([^"]*)"\s*$/);
    if (m) return m[1].trim();
    const m2 = v.match(/^=\s*(.+)\s*$/);
    if (m2) return m2[1].replace(/^"|"$/g, '').trim();
    return v.trim();
  });
}

async function main() {
  const file = arg('file');
  const type = (arg('type') || 'business') as DfsEntityType;
  const dryRun = hasFlag('dry-run');
  const limit = Number(arg('limit') || '0') || 0;
  const launchOnly = hasFlag('launch-counties-only');

  if (!file) {
    console.error(
      'Usage: npx tsx scripts/dfs/import-dfs-csv.ts --file <csv> --type business|individual [--dry-run] [--limit N] [--launch-counties-only]'
    );
    process.exit(1);
  }
  if (type !== 'business' && type !== 'individual') {
    console.error('--type must be business or individual');
    process.exit(1);
  }

  const abs = resolve(file);
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    console.error('Download from https://licenseesearch.fldfs.com/BulkDownload');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dryRun && (!url || !key)) {
    console.error('Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase =
    !dryRun && url && key
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;

  const rl = createInterface({ input: createReadStream(abs, { encoding: 'utf8' }), crlfDelay: Infinity });

  let headers: string[] | null = null;
  let rowNum = 0;
  let normalized = 0;
  let skipped = 0;
  let launchHits = 0;
  const skipReasons: Record<string, number> = {};
  const batchRows: Record<string, unknown>[] = [];
  const producerUpserts: Record<string, unknown>[] = [];

  let batchId: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from('dfs_import_batches')
      .insert({
        source_file: abs,
        entity_type: type,
        notes: launchOnly ? 'launch-counties-only filter' : null,
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error('Failed to create batch:', error?.message);
      process.exit(1);
    }
    batchId = data.id as string;
    console.log('Batch', batchId);
  }

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!headers) {
      headers = parseCsvLine(line);
      console.log('Columns:', headers.slice(0, 12).join(' | '), headers.length > 12 ? '…' : '');
      continue;
    }
    rowNum++;
    if (limit && rowNum > limit) break;

    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });

    const n = normalizeDfsRow(row, type);
    if (n.skipReason) {
      skipped++;
      skipReasons[n.skipReason] = (skipReasons[n.skipReason] ?? 0) + 1;
      continue;
    }
    if (launchOnly && !n.launchCountyId) {
      skipped++;
      skipReasons['not_launch_county'] = (skipReasons['not_launch_county'] ?? 0) + 1;
      continue;
    }
    if (n.launchCountyId) launchHits++;
    normalized++;

    if (supabase && batchId) {
      batchRows.push({
        batch_id: batchId,
        source_file: abs,
        entity_type: type,
        row_number: rowNum,
        raw: row,
      });
      producerUpserts.push({
        entity_type: n.entityType,
        license_number: n.licenseNumber,
        npn: n.npn,
        legal_name: n.legalName,
        display_name: n.displayName,
        license_status: n.licenseStatus,
        lines_of_authority: n.linesOfAuthority,
        city: n.city,
        county: n.county,
        county_normalized: n.countyNormalized,
        state: n.state,
        zip: n.zip,
        phone: n.phone,
        email: n.email,
        resident_flag: n.residentFlag,
        source: 'florida_dfs',
        source_checked_at: new Date().toISOString(),
        raw_batch_id: batchId,
        identity_key: n.identityKey,
        updated_at: new Date().toISOString(),
      });

      if (batchRows.length >= 200) {
        await flush(supabase as never, batchRows, producerUpserts);
        batchRows.length = 0;
        producerUpserts.length = 0;
      }
    }
  }

  if (supabase && batchRows.length) {
    await flush(supabase as never, batchRows, producerUpserts);
  }

  if (supabase && batchId) {
    await supabase
      .from('dfs_import_batches')
      .update({ row_count: rowNum })
      .eq('id', batchId);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        file: abs,
        type,
        dataRows: rowNum,
        normalized,
        skipped,
        launchCountyHits: launchHits,
        skipReasons,
      },
      null,
      2
    )
  );
}

async function flush(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  raw: Record<string, unknown>[],
  producers: Record<string, unknown>[]
) {
  const { error: e1 } = await supabase.from('dfs_license_raw').insert(raw);
  if (e1) console.error('raw insert error:', e1.message);
  const { error: e2 } = await supabase.from('dfs_producers').upsert(producers, {
    onConflict: 'entity_type,license_number',
  });
  if (e2) console.error('producer upsert error:', e2.message);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
