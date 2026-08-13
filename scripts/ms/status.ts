/**
 * Phase 24 — MS pipeline status (no secrets).
 *   npm run ms:status
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { MS_LAUNCH_MARKETS, MS_MID_SEARCH_URL } from '../../lib/ms/launch-markets';
import { resolveMsSourceFile } from '../../lib/ms/parse-workbook';

const candidates = [
  'data/ms-raw/Mississippi_csv',
  'data/ms-raw/Mississippi_csv.csv',
];

let source: string | null = null;
for (const c of candidates) {
  try {
    source = resolveMsSourceFile(resolve(c));
    break;
  } catch {
    /* try next */
  }
}

console.log(
  JSON.stringify(
    {
      regulator: 'Mississippi Insurance Department (MID)',
      lookup: MS_MID_SEARCH_URL,
      sourceFile: source,
      sourcePresent: Boolean(source && existsSync(source)),
      migration: 'supabase/migrations/20260820120000_mississippi_mid_inventory.sql',
      markets: MS_LAUNCH_MARKETS.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        hub: `/hubs/mississippi/${m.hubSlugs[0]}`,
        promoteCap: m.promoteCap,
      })),
    },
    null,
    2
  )
);
