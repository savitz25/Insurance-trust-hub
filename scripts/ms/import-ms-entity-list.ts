/**
 * Phase 24 — import Mississippi MID Insurance Producer Entity list.
 *
 *   npm run ms:import -- --file data/ms-raw/Mississippi_csv --firms-only --dry-run
 *   npm run ms:import -- --file data/ms-raw/Mississippi_csv --firms-only --confirm
 */

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  listMsRawFiles,
  parseMsLicenseFile,
  resolveMsSourceFile,
} from '../../lib/ms/parse-workbook';
import {
  mergeMsProducers,
  normalizeMsLicenseRow,
  type NormalizedMsProducer,
} from '../../lib/ms/normalize';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { MS_MID_SEARCH_URL } from '../../lib/ms/launch-markets';

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
  const launchOnly = hasFlag('launch-markets-only');
  const firmsOnly = hasFlag('firms-only');
  const msOnly = hasFlag('ms-only');
  const confirm = hasFlag('confirm');
  const limit = Number(arg('limit') || '0') || 0;
  const file = arg('file');
  const dir = arg('dir');

  if (!dryRun && !confirm) {
    console.error('Refusing to write without --dry-run or --confirm');
    process.exit(1);
  }

  const files: string[] = [];
  if (file) files.push(resolveMsSourceFile(resolve(file)));
  if (dir) files.push(...listMsRawFiles(resolve(dir)));

  if (!files.length) {
    console.error(
      'Usage: npm run ms:import -- --file data/ms-raw/Mississippi_csv [--firms-only] [--launch-markets-only] [--dry-run]\n' +
        `Ops source: ${MS_MID_SEARCH_URL}`
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

  const skipReasons: Record<string, number> = {};
  const byClass: Record<string, number> = {};
  const byLicense = new Map<string, NormalizedMsProducer[]>();
  let sourceRows = 0;
  let skipped = 0;
  let firms = 0;
  let individuals = 0;
  let msAddress = 0;
  let outOfStateHq = 0;

  for (const abs of files) {
    console.log(`Reading ${abs}`);
    let parsed;
    try {
      parsed = await parseMsLicenseFile(abs);
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    }
    if (limit) parsed = parsed.slice(0, limit);
    sourceRows += parsed.length;

    for (const raw of parsed) {
      const cls = raw.licenseType || '(none)';
      byClass[cls] = (byClass[cls] || 0) + 1;
      const n = normalizeMsLicenseRow(raw);
      if (n.skipReason) {
        skipped++;
        skipReasons[n.skipReason] = (skipReasons[n.skipReason] ?? 0) + 1;
        continue;
      }
      if (n.entityType === 'business') firms++;
      else individuals++;
      if (n.msAddress) msAddress++;
      else outOfStateHq++;
      if (firmsOnly && n.entityType !== 'business') {
        skipped++;
        skipReasons['individual_excluded'] = (skipReasons['individual_excluded'] ?? 0) + 1;
        continue;
      }
      if (msOnly && !n.msAddress) {
        skipped++;
        skipReasons['out_of_state_hq'] = (skipReasons['out_of_state_hq'] ?? 0) + 1;
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
  }

  const merged: NormalizedMsProducer[] = [];
  for (const list of byLicense.values()) {
    const m = mergeMsProducers(list);
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
  const entityMerged = { business: 0, individual: 0 };
  for (const m of merged) {
    byMarket[m.launchMarketId ?? 'none'] = (byMarket[m.launchMarketId ?? 'none'] ?? 0) + 1;
    if (m.promoteEligible) promoteEligible.yes++;
    else promoteEligible.no++;
    entityMerged[m.entityType]++;
  }

  let batchId: string | null = null;
  let upserted = 0;
  if (supabase) {
    const { data, error } = await supabase
      .from('ms_import_batches')
      .insert({
        source_file: files.join('; '),
        source_label: 'ms_mid_entities',
        notes:
          [launchOnly ? 'launch-markets-only' : null, firmsOnly ? 'firms-only' : null, msOnly ? 'ms-only' : null]
            .filter(Boolean)
            .join(',') || null,
        row_count: sourceRows,
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error(
        'Failed to create batch (apply migration 20260820120000_mississippi_mid_inventory.sql):',
        error?.message
      );
      process.exit(1);
    }
    batchId = data.id as string;

    const chunk = 100;
    for (let i = 0; i < merged.length; i += chunk) {
      const slice = merged.slice(i, i + chunk).map((m) => ({
        entity_type: m.entityType,
        license_number: m.licenseNumber,
        npn: m.npn,
        legal_name: m.legalName,
        display_name: m.displayName,
        license_types: m.licenseTypes,
        qualifications: m.qualifications,
        license_status: m.licenseStatus,
        issue_date: m.issueDate,
        expiration_date: m.expirationDate,
        address: m.address,
        city: m.city,
        hq_state: m.hqState,
        zip: m.zip,
        county: m.county,
        phone: m.phone,
        ms_address: m.msAddress,
        launch_market_id: m.launchMarketId,
        source_checked_at: new Date().toISOString(),
        raw_batch_id: batchId,
        identity_key: m.identityKey,
        updated_at: new Date().toISOString(),
      }));
      const { error: upErr } = await supabase
        .from('ms_producers')
        .upsert(slice, { onConflict: 'license_number' });
      if (upErr) console.error('upsert error', upErr.message);
      else upserted += slice.length;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        launchMarketsOnly: launchOnly,
        firmsOnly,
        msOnly,
        files,
        sourceRows,
        skipped,
        skipReasons,
        uniqueLicensesMerged: merged.length,
        entityRows: { firms, individuals },
        entityMerged,
        msAddress,
        outOfStateHq,
        byLicenseClass: byClass,
        byMarket,
        promoteEligible,
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
