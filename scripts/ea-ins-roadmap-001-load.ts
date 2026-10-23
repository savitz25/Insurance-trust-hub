/**
 * EA-INS-ROADMAP-001 loader.
 *
 *   npx tsx scripts/ea-ins-roadmap-001-load.ts
 *   npx tsx scripts/ea-ins-roadmap-001-load.ts --write
 *
 * Default is a dry run. --write is the only path that opens a database client.
 * This file does not apply migrations and does not read secrets during a dry run.
 */
import { resolve } from 'node:path';
import {
  applyEaInsRoadmapPlan,
  loadEaInsRoadmapFromRepo,
  writesEnabled,
  type RoadmapWriteClient,
} from '../lib/national/ea-ins-roadmap-001';

async function main(): Promise<void> {
  const root = resolve(__dirname, '..');
  const write = writesEnabled(process.argv);
  const plan = loadEaInsRoadmapFromRepo(root);
  if (!write) {
    console.log(JSON.stringify({ dryRun: true, wrote: false, summary: plan.summary }, null, 2));
    return;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const { loadLocalEnv, requireSupabaseOpsEnv } = await import('./lib/load-local-env');
  loadLocalEnv();
  const env = requireSupabaseOpsEnv();
  const supabase = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const client: RoadmapWriteClient = {
    async upsert(table, rows, onConflict) {
      const chunkSize = 400;
      for (let index = 0; index < rows.length; index += chunkSize) {
        const chunk = rows.slice(index, index + chunkSize);
        const { error } = await supabase.from(table).upsert(chunk, { onConflict });
        if (error) throw new Error(`${table} upsert failed: ${error.message}`);
      }
    },
  };
  const result = await applyEaInsRoadmapPlan(plan, client, { write: true });
  console.log(JSON.stringify({ dryRun: false, wrote: result.wrote, summary: plan.summary }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'EA-INS-ROADMAP-001 failed';
  console.error(message);
  process.exit(1);
});
