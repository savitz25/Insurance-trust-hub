/**
 * EA-INS-001 — live, read-only verification of activated public business-contact
 * evidence on Insurance Trust Reports.
 *
 * `lib/national/load-agency-trust-report.ts` is guarded by `import 'server-only'` and
 * cannot be imported from a plain Node script. This script therefore replicates its
 * exact query construction (bridge must be CONFIRMED + exact_npn; entity must be
 * entity_kind === 'agency'; contacts filtered to public_eligible = true; every graph
 * query scoped to the resolved entity_id) against the real database, read-only, to
 * verify the real data satisfies the same contract the loader enforces in production.
 *
 *   npm run verify:ea-ins-001
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from './lib/load-local-env';
import { resolve } from 'path';

const HIGH_CONTACT_SLUG = 'pscc-inc-1922586'; // 23 public_eligible contacts
const TYPICAL_SLUG = 'powell-meadows-insurance-agency-inc-1737612'; // 2 public_eligible contacts
const ZERO_CONTACT_SLUG = 'no-limits-powersports-llc-3425480'; // bridged, 0 contacts
const CORROBORATED_SLUG = 'power-insurance-financial-llc-3144058'; // same email, 2 source_datasets

let failed = false;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${label}`);
  if (!cond) failed = true;
}

type Contact = {
  contact_kind: string;
  value: string;
  source_dataset: string;
  source_observed_at: string | null;
  public_eligible: boolean;
};

async function loadForSlug(sb: SupabaseClient, slug: string) {
  const { data: provider, error: perr } = await sb
    .from('providers')
    .select('id,slug')
    .eq('slug', slug)
    .maybeSingle();
  if (perr) throw new Error(perr.message);
  if (!provider) return { provider: null, report: null };

  const { data: bridge, error: berr } = await sb
    .from('provider_entity_bridges')
    .select('entity_id,confidence,match_method')
    .eq('provider_id', provider.id)
    .maybeSingle();
  if (berr || !bridge?.entity_id) return { provider, report: null };
  if (bridge.confidence !== 'CONFIRMED') return { provider, report: null };
  if (bridge.match_method !== 'exact_npn') return { provider, report: null };

  const { data: entity, error: eerr } = await sb
    .from('national_entities')
    .select('id,entity_kind')
    .eq('id', bridge.entity_id)
    .maybeSingle();
  if (eerr || !entity || entity.entity_kind !== 'agency') return { provider, report: null };

  const { data: contacts, error: cerr } = await sb
    .from('contact_observations')
    .select('contact_kind,value,source_dataset,source_observed_at,public_eligible')
    .eq('entity_id', entity.id)
    .eq('public_eligible', true)
    .limit(40);
  if (cerr) throw new Error(cerr.message);

  return { provider, report: { entity, contacts: (contacts ?? []) as Contact[] } };
}

async function main() {
  loadLocalEnv(resolve(process.cwd()));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. High-contact profile
  {
    const t0 = Date.now();
    const { report } = await loadForSlug(sb, HIGH_CONTACT_SLUG);
    const ms = Date.now() - t0;
    check(`${HIGH_CONTACT_SLUG}: report resolves (agency, CONFIRMED exact_npn bridge)`, !!report);
    check(`${HIGH_CONTACT_SLUG}: entity_kind === 'agency'`, report?.entity.entity_kind === 'agency');
    check(`${HIGH_CONTACT_SLUG}: has contacts`, (report?.contacts.length ?? 0) > 0);
    check(
      `${HIGH_CONTACT_SLUG}: no named_contact/contact_title kinds leak through`,
      (report?.contacts ?? []).every((c) => c.contact_kind !== 'named_contact' && c.contact_kind !== 'contact_title')
    );
    console.log(`  (query latency: ${ms}ms, contacts returned: ${report?.contacts.length ?? 0})`);
  }

  // 2. Typical profile: exact count match against the live baseline
  {
    const t0 = Date.now();
    const { report } = await loadForSlug(sb, TYPICAL_SLUG);
    const ms = Date.now() - t0;
    check(`${TYPICAL_SLUG}: report resolves`, !!report);
    check(`${TYPICAL_SLUG}: exactly 2 public_eligible contacts`, report?.contacts.length === 2);
    console.log(`  (query latency: ${ms}ms)`);
  }

  // 3. Zero-contact profile: bridged and live, but no contacts -> empty array
  {
    const t0 = Date.now();
    const { report } = await loadForSlug(sb, ZERO_CONTACT_SLUG);
    const ms = Date.now() - t0;
    check(`${ZERO_CONTACT_SLUG}: report resolves (bridge exists independent of contacts)`, !!report);
    check(
      `${ZERO_CONTACT_SLUG}: contacts is an empty array, not null/undefined`,
      Array.isArray(report?.contacts) && report?.contacts.length === 0
    );
    console.log(`  (query latency: ${ms}ms)`);
  }

  // 4. Cross-source corroboration: same value from two source_datasets, both preserved
  {
    const { report } = await loadForSlug(sb, CORROBORATED_SLUG);
    check(`${CORROBORATED_SLUG}: report resolves`, !!report);
    const email = 'info@powerinsurancefinancial.com';
    const matches = (report?.contacts ?? []).filter((c) => c.value === email);
    check(`${CORROBORATED_SLUG}: both corroborating observations present (not deduped away)`, matches.length === 2);
    const datasets = matches.map((c) => c.source_dataset).sort();
    check(
      `${CORROBORATED_SLUG}: distinct sources cited (florida_dfs, florida_dfs_appointments)`,
      datasets[0] === 'florida_dfs' && datasets[1] === 'florida_dfs_appointments'
    );
    check(
      `${CORROBORATED_SLUG}: each corroborating observation carries its own source_observed_at`,
      matches.every((c) => typeof c.source_observed_at === 'string' && c.source_observed_at.length > 0)
    );
  }

  // 5. Wrong-entity / no cross-grain leakage: a provider with no CONFIRMED exact_npn bridge
  // must resolve to null, never fall back to a name/address guess.
  {
    const { data: bridgeSample } = await sb
      .from('provider_entity_bridges')
      .select('provider_id')
      .eq('confidence', 'CONFIRMED')
      .eq('match_method', 'exact_npn')
      .limit(2000);
    const bridgedIds = new Set((bridgeSample ?? []).map((r: any) => r.provider_id));
    const { data: someProviders } = await sb.from('providers').select('id,slug').limit(3000);
    const candidate = (someProviders ?? []).find((p: any) => !bridgedIds.has(p.id));
    if (candidate) {
      const { report } = await loadForSlug(sb, candidate.slug);
      check(`${candidate.slug}: unbridged provider resolves to null (fail-closed, no guess)`, report === null);
    } else {
      console.log('  (skipped: no unbridged provider sample found)');
    }
  }

  console.log(failed ? '\nEA-INS-001 VERIFY: FAIL' : '\nEA-INS-001 VERIFY: PASS');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
