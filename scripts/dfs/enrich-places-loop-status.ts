/**
 * Print Places loop progress without calling Google.
 *   npm run dfs:enrich-places-loop:status
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const path = resolve(process.cwd(), 'scripts/output/places-loop-progress.json');
if (!existsSync(path)) {
  console.log(
    JSON.stringify(
      { ok: false, reason: 'no_progress_file', path },
      null,
      2
    )
  );
  process.exit(0);
}

const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
const cum = (raw.cumulative ?? {}) as Record<string, number>;
const processed = Number(cum.processed ?? 0);
const matched = Number(cum.matched ?? 0);
console.log(
  JSON.stringify(
    {
      ok: true,
      path,
      status: raw.status,
      stopReason: raw.stopReason,
      scope: raw.scope,
      county: raw.county,
      strict: raw.strict,
      batchesCompleted: raw.batchesCompleted,
      nextOffset: raw.nextOffset,
      lastCompletedOffset: raw.lastCompletedOffset,
      cumulative: {
        ...cum,
        matchRate: processed > 0 ? Number((matched / processed).toFixed(4)) : 0,
      },
      updatedAt: raw.updatedAt,
    },
    null,
    2
  )
);
