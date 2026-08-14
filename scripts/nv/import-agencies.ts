/**
 * Phase 14 / NV-1 — import NV DOI firm workbooks (license type + qualifications).
 *
 *   npm run nv:import-firms -- --dir data/nv-raw --dry-run
 *   npm run nv:import -- --file data/nv-raw/nv_raw_Firms_License.xlsx --confirm
 * Individual producer lists are skipped.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  isNvIndividualProducerFile,
  listNvFirmFiles,
  parseNvFirmsFile,
} from '../../lib/nv/parse-workbook';
import {
  mergeNvProducers,
  normalizeNvFirmRow,
  type NormalizedNvProducer,
} from '../../lib/nv/normalize';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { NV_DOI_REPORTS_URL } from '../../lib/nv/launch-markets';

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

async function main() {
  const dryRun = hasFlag('dry-run');
  const confirm = hasFlag('confirm');
  const launchOnly = hasFlag('launch-markets-only');
  const limit = Number(arg('limit') || '0') || 0;
  const file = arg('file');
  const dir = arg('dir');

  if (!dryRun && !confirm) {
    console.error('Refusing to write without --dry-run or --confirm');
    process.exit(1);
  }

  const files: string[] = [];
  if (file) {
    const absOne = resolve(file);
    if (isNvIndividualProducerFile(absOne)) {
      console.error(`Refusing individual producer list: ${absOne}`);
      process.exit(1);
    }
    files.push(absOne);
  }
  if (dir) files.push(...listNvFirmFiles(resolve(dir)));

  if (!files.length) {
    console.error(
      'Usage: npm run nv:import-firms -- --dir data/nv-raw [--dry-run|--confirm]\n' +
        `Ops export: ${NV_DOI_REPORTS_URL} → Firms by License Type / Firms by Qualification`
    );
    process.exit(1);
  }

  const abs = files.join('; ');
  loadLocalEnv(resolve(process.cwd()));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = null;
  if (!dryRun) {
    const { url, serviceRoleKey } = requireSupabaseOpsEnv();
    supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  let parsed: Awaited<ReturnType<typeof parseNvFirmsFile>> = [];
  for (const one of files) {
    console.log(`Reading ${one}`);
    try {
      const part = await parseNvFirmsFile(one);
      parsed = parsed.concat(part);
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    }
  }
  if (limit) parsed = parsed.slice(0, limit);

  const skipReasons: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byLicense = new Map<string, NormalizedNvProducer[]>();
  let skipped = 0;
  let phones = 0;
  let emails = 0;
  let nvAddress = 0;
  let outOfStateHq = 0;

  for (const raw of parsed) {
    byType[raw.firmLicenseType || '(none)'] =
      (byType[raw.firmLicenseType || '(none)'] || 0) + 1;
    const n = normalizeNvFirmRow(raw);
    if (n.skipReason) {
      skipped++;
      skipReasons[n.skipReason] = (skipReasons[n.skipReason] ?? 0) + 1;
      continue;
    }
    if (n.phone) phones++;
    if (n.email) emails++;
    if (n.nvAddress) nvAddress++;
    else outOfStateHq++;
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

  const merged: NormalizedNvProducer[] = [];
  for (const list of byLicense.values()) {
    const m = mergeNvProducers(list);
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
  const promoteEligible = { yes: 0, no: 0 };
  const samples: Array<{
    name: string;
    license: string;
    type: string;
    city: string;
    phone: string | null;
    email: string | null;
  }> = [];
  for (const m of merged) {
    const k = m.launchMarketId ?? 'none';
    byMarket[k] = (byMarket[k] ?? 0) + 1;
    if (m.promoteEligible) promoteEligible.yes++;
    else promoteEligible.no++;
    if (samples.length < 8 && m.phone && m.email && m.nvAddress) {
      samples.push({
        name: m.displayName,
        license: m.licenseNumber,
        type: m.firmLicenseType,
        city: m.city || '',
        phone: m.phone,
        email: m.email,
      });
    }
  }

  let batchId: string | null = null;
  let upserted = 0;
  if (supabase) {
    const { data, error } = await supabase
      .from('nv_import_batches')
      .insert({
        source_file: abs,
        source_label: 'nv_doi_firms',
        notes: [launchOnly ? 'launch-markets-only' : null, `files=${files.length}`]
          .filter(Boolean)
          .join(',') || null,
        row_count: parsed.length,
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error(
        'Failed to create batch (apply migration 20260816120000_nevada_doi_inventory.sql):',
        error?.message
      );
      process.exit(1);
    }
    batchId = data.id as string;
    const rawBuffer = parsed.slice(0, 2000).map((r, i) => ({
      batch_id: batchId,
      source_file: abs,
      row_number: r.rowNumber || i + 1,
      raw: r,
    }));
    for (let i = 0; i < rawBuffer.length; i += 200) {
      const { error: rawErr } = await supabase
        .from('nv_license_raw')
        .insert(rawBuffer.slice(i, i + 200));
      if (rawErr) console.warn('raw flush error', rawErr.message);
    }

    const chunk = 100;
    for (let i = 0; i < merged.length; i += chunk) {
      const slice = merged.slice(i, i + chunk).map((m) => ({
        entity_type: 'business',
        license_number: m.licenseNumber,
        legal_name: m.legalName,
        display_name: m.displayName,
        firm_license_type: m.firmLicenseType,
        license_types: m.licenseTypes,
        qualifications: m.qualifications,
        license_status: m.licenseStatus,
        issue_date: m.issueDate,
        expiration_date: m.expirationDate,
        address: m.address,
        city: m.city,
        hq_state: m.hqState,
        zip: m.zip,
        phone: m.phone,
        email: m.email,
        nv_address: m.nvAddress,
        launch_market_id: m.launchMarketId,
        source_checked_at: new Date().toISOString(),
        raw_batch_id: batchId,
        identity_key: m.identityKey,
        updated_at: new Date().toISOString(),
      }));
      const { error: upErr } = await supabase
        .from('nv_producers')
        .upsert(slice, { onConflict: 'license_number' });
      if (upErr) console.error('upsert error', upErr.message);
      else upserted += slice.length;
    }
  }

  const residentSplit = { resident: 0, non_resident: 0 };
  for (const m of merged) {
    residentSplit[m.residency]++;
  }

  const report = {
        dryRun,
        launchMarketsOnly: launchOnly,
        files,
        sourceRows: parsed.length,
        skipped,
        skipReasons,
        uniqueLicensesMerged: merged.length,
        nvAddress,
        outOfStateHq,
        residentSplit,
        phonesPreserved: phones,
        emailsPreserved: emails,
        byFirmLicenseType: byType,
        byMarket,
        promoteEligible,
        samples,
        upserted: dryRun ? 0 : upserted,
        batchId,
      };

  try {
    mkdirSync(resolve('scripts/output'), { recursive: true });
    writeFileSync(
      resolve(`scripts/output/nv-import-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );
  } catch {
    /* ignore log write */
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
