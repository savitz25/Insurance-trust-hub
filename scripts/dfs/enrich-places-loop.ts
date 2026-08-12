/**
 * Phase 6C — Auto-batch Places enrichment loop (South Florida pilot).
 *
 *   npm run dfs:enrich-places-loop -- --dry-run --batch-size 25 --max-batches 3
 *   npm run dfs:enrich-places-loop -- --confirm --batch-size 100 --delay-ms 300
 *   npm run dfs:enrich-places-loop -- --confirm --start-offset 250
 *
 * Quality gates stop the run if match rate collapses or errors spike.
 * Progress: scripts/output/places-loop-progress.json
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  isGooglePlacesConfigured,
} from '../../lib/enrichment/google-places';
import type { SflCountyId } from '../../lib/enrichment/places-pilot';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import {
  loadSflEligibleProviders,
  runPlacesBatch,
  type PlacesBatchResult,
} from './lib/places-batch-core';

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
function num(name: string, def: number): number {
  const v = arg(name);
  if (v == null || v === 'true') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

type BatchSummary = {
  batchIndex: number;
  offset: number;
  processed: number;
  matched: number;
  no_match: number;
  ambiguous: number;
  errors: number;
  written: number;
  matchRate: number;
  errorRate: number;
  ambiguousRate: number;
  authFailures: number;
  softWarningCount: number;
  at: string;
};

type ProgressFile = {
  scope: string;
  county: string;
  batchSize: number;
  delayMs: number;
  onlyMissing: boolean;
  confirm: boolean;
  dryRun: boolean;
  minMatchRate: number;
  maxErrorRate: number;
  maxAmbiguousRate: number;
  lastCompletedOffset: number;
  nextOffset: number;
  batchesCompleted: number;
  cumulative: {
    processed: number;
    matched: number;
    no_match: number;
    ambiguous: number;
    errors: number;
    written: number;
    softWarnings: number;
  };
  perBatch: BatchSummary[];
  stopReason: string | null;
  startedAt: string;
  updatedAt: string;
  status: 'running' | 'completed' | 'stopped';
};

const PROGRESS_PATH = () =>
  resolve(process.cwd(), 'scripts/output/places-loop-progress.json');

function emptyProgress(cfg: Omit<ProgressFile, 'perBatch' | 'cumulative' | 'lastCompletedOffset' | 'nextOffset' | 'batchesCompleted' | 'stopReason' | 'startedAt' | 'updatedAt' | 'status'>): ProgressFile {
  const now = new Date().toISOString();
  return {
    ...cfg,
    lastCompletedOffset: -1,
    nextOffset: cfg.batchSize ? 0 : 0,
    batchesCompleted: 0,
    cumulative: {
      processed: 0,
      matched: 0,
      no_match: 0,
      ambiguous: 0,
      errors: 0,
      written: 0,
      softWarnings: 0,
    },
    perBatch: [],
    stopReason: null,
    startedAt: now,
    updatedAt: now,
    status: 'running',
  };
}

function writeProgress(p: ProgressFile) {
  const outDir = resolve(process.cwd(), 'scripts/output');
  mkdirSync(outDir, { recursive: true });
  p.updatedAt = new Date().toISOString();
  writeFileSync(PROGRESS_PATH(), JSON.stringify(p, null, 2), 'utf8');
}

function loadProgress(path: string): ProgressFile | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ProgressFile;
  } catch {
    return null;
  }
}

function rateOk(
  batch: PlacesBatchResult,
  minMatch: number,
  maxErr: number,
  maxAmb: number,
  failOnEmpty: boolean
): { ok: boolean; reason?: string } {
  if (batch.stats.authFailures > 0) {
    return {
      ok: false,
      reason: `auth_failure: ${batch.stats.authFailures} Places auth/key failures in batch`,
    };
  }
  if (failOnEmpty && batch.stats.processed === 0) {
    return { ok: false, reason: 'empty_batch: processed=0 while gate fail-on-empty-batch set' };
  }
  if (batch.stats.processed === 0) {
    return { ok: true }; // natural end of pool
  }
  if (batch.matchRate < minMatch) {
    return {
      ok: false,
      reason: `match_rate_breach: ${(batch.matchRate * 100).toFixed(1)}% < min ${(minMatch * 100).toFixed(1)}%`,
    };
  }
  if (batch.errorRate > maxErr) {
    return {
      ok: false,
      reason: `error_rate_breach: ${(batch.errorRate * 100).toFixed(1)}% > max ${(maxErr * 100).toFixed(1)}%`,
    };
  }
  if (batch.ambiguousRate > maxAmb) {
    return {
      ok: false,
      reason: `ambiguous_rate_breach: ${(batch.ambiguousRate * 100).toFixed(1)}% > max ${(maxAmb * 100).toFixed(1)}%`,
    };
  }
  return { ok: true };
}

async function main() {
  const confirm = hasFlag('confirm');
  const dryRun = hasFlag('dry-run') || !confirm;
  const batchSize = Math.min(Math.max(num('batch-size', 100), 1), 500);
  const maxBatches = num('max-batches', 0); // 0 = unlimited
  const delayMs = Math.max(num('delay-ms', 300), 0);
  const minMatchRate = num('min-match-rate', 0.15);
  const maxErrorRate = num('max-error-rate', 0.05);
  const maxAmbiguousRate = num('max-ambiguous-rate', 0.1);
  const failOnEmpty = hasFlag('fail-on-empty-batch');
  const countyRaw = (arg('county') || 'all').toLowerCase() as SflCountyId;
  const onlyMissing =
    arg('only-missing') !== 'false' && !hasFlag('include-enriched');

  if (!['all', 'miami_dade', 'broward', 'palm_beach'].includes(countyRaw)) {
    console.error('--county must be miami_dade | broward | palm_beach | all');
    process.exit(1);
  }

  let startOffset = Math.max(num('start-offset', 0), 0);
  const resumeLog = arg('resume-from-log');
  if (resumeLog) {
    const prev = loadProgress(resolve(process.cwd(), resumeLog));
    if (prev && typeof prev.nextOffset === 'number') {
      startOffset = prev.nextOffset;
      console.log(`Resuming from log nextOffset=${startOffset}`);
    } else if (prev && typeof prev.lastCompletedOffset === 'number' && prev.lastCompletedOffset >= 0) {
      startOffset = prev.lastCompletedOffset + (prev.batchSize || batchSize);
      console.log(`Resuming after lastCompletedOffset → startOffset=${startOffset}`);
    }
  } else if (!hasFlag('start-offset') && existsSync(PROGRESS_PATH())) {
    const prev = loadProgress(PROGRESS_PATH());
    if (prev?.status === 'running' && typeof prev.nextOffset === 'number') {
      // only auto-hint, don't auto-resume unless --resume
      if (hasFlag('resume')) {
        startOffset = prev.nextOffset;
        console.log(`--resume: continuing at offset ${startOffset}`);
      }
    }
  }

  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const placesReady = isGooglePlacesConfigured();
  if (!placesReady && confirm && !dryRun) {
    console.error('GOOGLE_PLACES_API_KEY required for live --confirm runs');
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun || !confirm ? 'dry-run' : 'live',
        confirm,
        placesConfigured: placesReady,
        county: countyRaw,
        onlyMissing,
        batchSize,
        startOffset,
        maxBatches: maxBatches || 'unlimited',
        delayMs,
        gates: { minMatchRate, maxErrorRate, maxAmbiguousRate, failOnEmpty },
      },
      null,
      2
    )
  );

  const eligible = await loadSflEligibleProviders(
    supabase,
    countyRaw,
    onlyMissing
  );
  console.log(`Eligible pool size: ${eligible.length}`);

  const progress = emptyProgress({
    scope: 'south_florida',
    county: countyRaw,
    batchSize,
    delayMs,
    onlyMissing,
    confirm,
    dryRun: dryRun || !confirm,
    minMatchRate,
    maxErrorRate,
    maxAmbiguousRate,
  });
  progress.nextOffset = startOffset;
  writeProgress(progress);

  const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const batchLogPath = resolve(
    process.cwd(),
    'scripts/output',
    `places-loop-${runStamp}.json`
  );
  const batchLog: {
    startedAt: string;
    config: Record<string, unknown>;
    batches: PlacesBatchResult[];
    stopReason: string | null;
    completed: boolean;
  } = {
    startedAt: progress.startedAt,
    config: {
      batchSize,
      startOffset,
      maxBatches,
      delayMs,
      county: countyRaw,
      onlyMissing,
      minMatchRate,
      maxErrorRate,
      maxAmbiguousRate,
      dryRun: progress.dryRun,
    },
    batches: [],
    stopReason: null,
    completed: false,
  };

  let offset = startOffset;
  let batchIndex = 0;
  let stopReason: string | null = null;

  while (offset < eligible.length) {
    if (maxBatches > 0 && batchIndex >= maxBatches) {
      stopReason = `max_batches_reached: ${maxBatches}`;
      break;
    }

    console.log(
      `\n=== Batch ${batchIndex + 1} offset=${offset} size=${batchSize} remaining=${Math.max(0, eligible.length - offset)} ===`
    );

    const result = await runPlacesBatch({
      supabase,
      providers: eligible,
      offset,
      limit: batchSize,
      confirm,
      dryRun: dryRun || !confirm,
      delayMs,
    });

    batchLog.batches.push(result);

    const summary: BatchSummary = {
      batchIndex,
      offset,
      processed: result.stats.processed,
      matched: result.stats.matched,
      no_match: result.stats.no_match,
      ambiguous: result.stats.ambiguous,
      errors: result.stats.errors,
      written: result.stats.written,
      matchRate: result.matchRate,
      errorRate: result.errorRate,
      ambiguousRate: result.ambiguousRate,
      authFailures: result.stats.authFailures,
      softWarningCount: result.softWarningMatched.length,
      at: new Date().toISOString(),
    };

    progress.perBatch.push(summary);
    progress.batchesCompleted++;
    progress.lastCompletedOffset = offset;
    progress.nextOffset = offset + batchSize;
    progress.cumulative.processed += result.stats.processed;
    progress.cumulative.matched += result.stats.matched;
    progress.cumulative.no_match += result.stats.no_match;
    progress.cumulative.ambiguous += result.stats.ambiguous;
    progress.cumulative.errors += result.stats.errors;
    progress.cumulative.written += result.stats.written;
    progress.cumulative.softWarnings += result.softWarningMatched.length;
    writeProgress(progress);

    console.log(
      JSON.stringify(
        {
          batch: batchIndex + 1,
          offset,
          processed: result.stats.processed,
          matched: result.stats.matched,
          matchRate: `${(result.matchRate * 100).toFixed(1)}%`,
          errorRate: `${(result.errorRate * 100).toFixed(1)}%`,
          ambiguousRate: `${(result.ambiguousRate * 100).toFixed(1)}%`,
          written: result.stats.written,
          softWarnings: result.softWarningMatched.length,
          acceptedSample: result.acceptedSample.slice(0, 5).map((a) => a.slug),
        },
        null,
        2
      )
    );

    if (result.stats.processed === 0) {
      stopReason = 'pool_exhausted: no more eligible agencies in remaining offsets';
      break;
    }

    if (
      !placesReady &&
      result.stats.skipped === result.stats.processed &&
      result.stats.processed > 0
    ) {
      stopReason =
        'places_api_unconfigured: GOOGLE_PLACES_API_KEY missing — all rows skipped';
      console.error(`\nSTOP: ${stopReason}`);
      break;
    }

    const gate = rateOk(
      result,
      minMatchRate,
      maxErrorRate,
      maxAmbiguousRate,
      failOnEmpty
    );
    if (!gate.ok) {
      stopReason = gate.reason ?? 'quality_gate_failed';
      console.error(`\nSTOP: ${stopReason}`);
      break;
    }

    offset += batchSize;
    batchIndex++;
  }

  if (!stopReason && offset >= eligible.length) {
    stopReason = null;
    progress.status = 'completed';
    batchLog.completed = true;
  } else if (stopReason) {
    progress.status = 'stopped';
    progress.stopReason = stopReason;
    batchLog.stopReason = stopReason;
    batchLog.completed = false;
  } else {
    progress.status = 'completed';
    batchLog.completed = true;
  }

  writeProgress(progress);
  mkdirSync(resolve(process.cwd(), 'scripts/output'), { recursive: true });
  writeFileSync(batchLogPath, JSON.stringify(batchLog, null, 2), 'utf8');

  const cum = progress.cumulative;
  const cumMatch =
    cum.processed > 0 ? ((cum.matched / cum.processed) * 100).toFixed(1) : '0.0';

  console.log('\n========== LOOP SUMMARY ==========');
  console.log(
    JSON.stringify(
      {
        status: progress.status,
        stopReason: progress.stopReason,
        batchesCompleted: progress.batchesCompleted,
        lastCompletedOffset: progress.lastCompletedOffset,
        nextOffset: progress.nextOffset,
        poolEligible: eligible.length,
        cumulative: {
          ...cum,
          matchRate: `${cumMatch}%`,
        },
        progressFile: PROGRESS_PATH(),
        batchLogFile: batchLogPath,
        resumeHint:
          progress.status === 'stopped' || progress.nextOffset < eligible.length
            ? `npm run dfs:enrich-places-loop -- --confirm --start-offset ${progress.nextOffset} --batch-size ${batchSize} --delay-ms ${delayMs}`
            : null,
      },
      null,
      2
    )
  );

  if (progress.status === 'stopped') {
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error(e);
  // Best-effort progress update
  try {
    const p = loadProgress(PROGRESS_PATH());
    if (p) {
      p.status = 'stopped';
      p.stopReason = e instanceof Error ? e.message : String(e);
      writeProgress(p);
    }
  } catch {
    /* ignore */
  }
  process.exit(1);
});
