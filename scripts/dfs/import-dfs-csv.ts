/**
 * Phase 4 — import Florida DFS bulk CSV into dfs_license_raw + dfs_producers.
 *
 *   npm run dfs:import -- --file data/dfs-raw/AllValidLicensesBusiness.csv --type business --launch-counties-only
 *   npx tsx scripts/dfs/import-dfs-csv.ts --file ... --type business --dry-run
 *
 * Loads .env / .env.local / .env.dfs.local via scripts/lib/load-local-env.ts
 * Requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 * Raw multi-hundred-MB files stay local under data/dfs-raw/ (gitignored).
 * See docs/LOCAL-ENV.md
 */

import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeDfsRow, type DfsEntityType } from '../../lib/dfs/normalize';
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
  const confirm = hasFlag('confirm');
  const limit = Number(arg('limit') || '0') || 0;
  const launchOnly = hasFlag('launch-counties-only');

  if (!dryRun && !confirm) {
    console.error('Refusing to write without --dry-run or --confirm');
    process.exit(1);
  }

  if (!file) {
    console.error(
      'Usage: npm run dfs:import -- --file <csv> --type business [--dry-run|--confirm] [--launch-counties-only]'
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

  loadLocalEnv(resolve(process.cwd()));
  // Untyped client: DFS tables are ops-only and not in generated Database types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = null;
  if (!dryRun) {
    const { url, serviceRoleKey } = requireSupabaseOpsEnv();
    supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const { size: fileSize } = await import('fs').then((fs) => fs.statSync(abs));
  console.log(`Reading ${abs} (${Math.round(fileSize / 1024 / 1024)} MB)`);

  let headers: string[] | null = null;
  let rowNum = 0;
  let normalized = 0;
  let skipped = 0;
  let launchHits = 0;
  let flushErrors = 0;
  let residentYes = 0;
  let residentNo = 0;
  let nonFlHq = 0;
  const skipReasons: Record<string, number> = {};
  const batchRows: Record<string, unknown>[] = [];
  const producerUpserts: Record<string, unknown>[] = [];

  // Create batch BEFORE opening the file stream so we don't lose stream data
  // while awaiting Supabase (stream must only start when the consumer is ready).
  let batchId: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from('dfs_import_batches')
      .insert({
        source_file: abs,
        entity_type: type,
        notes: launchOnly ? 'launch-counties-only filter' : 'fl2-statewide-business',
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

  const rl = createInterface({
    input: createReadStream(abs, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  function isHeaderRow(cols: string[]): boolean {
    // Official FL bulk header starts with License Number (do not match data rows
    // that merely contain the word "LICENSE" in LOA text).
    return /^license\s*number$/i.test((cols[0] ?? '').trim());
  }

  for await (const rawLine of rl) {
    // Strip UTF-8 BOM if present on first line
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;

    const cols = parseCsvLine(line);

    if (!headers) {
      if (!isHeaderRow(cols)) {
        // Keep scanning until we find the real header (skip junk preambles)
        continue;
      }
      headers = cols.map((h) => h.trim());
      console.log(
        'Columns:',
        headers.slice(0, 12).join(' | '),
        headers.length > 12 ? '…' : ''
      );
      if (!headers.some((h) => /license\s*number/i.test(h))) {
        console.error('Header row missing License Number column — aborting');
        process.exit(1);
      }
      continue;
    }

    // Skip accidental duplicate header rows mid-file
    if (isHeaderRow(cols)) continue;

    rowNum++;
    if (limit && rowNum > limit) break;

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
    if (n.residentFlag === true) residentYes++;
    else if (n.residentFlag === false) residentNo++;
    if (n.state && n.state !== 'FL') nonFlHq++;
    normalized++;

    if (supabase && batchId) {
      batchRows.push({
        batch_id: batchId,
        source_file: abs,
        entity_type: type,
        row_number: rowNum,
        raw: row,
      });
      // One license can appear on multiple CSV rows (one per LOA). Merge in-batch
      // so ON CONFLICT upsert does not see the same key twice.
      const existingIdx = producerUpserts.findIndex(
        (p) =>
          p.entity_type === n.entityType && p.license_number === n.licenseNumber
      );
      const producerRow = {
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
      };
      if (existingIdx >= 0) {
        const prev = producerUpserts[existingIdx] as typeof producerRow;
        const loas = Array.from(
          new Set([
            ...((prev.lines_of_authority as string[]) ?? []),
            ...n.linesOfAuthority,
          ])
        );
        producerUpserts[existingIdx] = {
          ...prev,
          ...producerRow,
          lines_of_authority: loas,
          // Prefer non-empty contact fields
          phone: producerRow.phone || prev.phone,
          email: producerRow.email || prev.email,
          city: producerRow.city || prev.city,
          county: producerRow.county || prev.county,
          zip: producerRow.zip || prev.zip,
        };
      } else {
        producerUpserts.push(producerRow);
      }

      if (batchRows.length >= 200) {
        const err = await flush(supabase, batchRows, producerUpserts);
        if (err) flushErrors++;
        batchRows.length = 0;
        producerUpserts.length = 0;
      }
    }
  }

  if (!headers) {
    console.error('Never found a License Number header row in CSV — aborting');
    process.exit(1);
  }

  if (supabase && batchRows.length) {
    const err = await flush(supabase, batchRows, producerUpserts);
    if (err) flushErrors++;
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
        launchCountiesOnly: launchOnly,
        dataRows: rowNum,
        normalized,
        skipped,
        launchCountyHits: launchHits,
        residentYes,
        residentNo,
        nonFlHq,
        flushErrors,
        skipReasons,
      },
      null,
      2
    )
  );

  if (flushErrors > 0) {
    console.error(`Completed with ${flushErrors} flush error batch(es)`);
    process.exit(1);
  }
}

async function flush(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  raw: Record<string, unknown>[],
  producers: Record<string, unknown>[]
): Promise<boolean> {
  let failed = false;
  const { error: e1 } = await supabase.from('dfs_license_raw').insert(raw);
  if (e1) {
    console.error('raw insert error:', e1.message);
    failed = true;
  }
  const { error: e2 } = await supabase.from('dfs_producers').upsert(producers, {
    onConflict: 'entity_type,license_number',
  });
  if (e2) {
    console.error('producer upsert error:', e2.message);
    failed = true;
  }
  return failed;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
