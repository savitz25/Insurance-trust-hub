/** Read-only dump of legal-insurer CoCode → legal_name for PDF validation. */
import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';

async function main() {
  const ROOT = resolve(process.cwd());
  loadLocalEnv(ROOT);
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows: Array<{ cocode: string; legal_name: string; entity_id: string }> = [];
  let last = '';
  for (;;) {
    let q = sb
      .from('national_entities')
      .select('id,legal_name,provisional_key')
      .eq('entity_kind', 'legal_insurer')
      .order('id', { ascending: true })
      .limit(1000);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const batch = data || [];
    if (!batch.length) break;
    for (const r of batch) {
      const key = String(r.provisional_key || '');
      const cocode = key.startsWith('legal-insurer:naic:') ? key.slice('legal-insurer:naic:'.length) : '';
      if (/^\d{5}$/.test(cocode)) {
        rows.push({ cocode, legal_name: String(r.legal_name), entity_id: String(r.id) });
      }
    }
    last = String(batch[batch.length - 1]!.id);
    if (batch.length < 1000) break;
  }
  mkdirSync(join(ROOT, 'data/reports'), { recursive: true });
  writeFileSync(join(ROOT, 'data/reports/ins-insurer-004-spine.json'), JSON.stringify(rows, null, 2));
  console.log(JSON.stringify({ n: rows.length, unique: new Set(rows.map((r) => r.cocode)).size }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
