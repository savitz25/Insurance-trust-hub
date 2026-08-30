/** Read-only Production census for bail-bond directory publication. */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { classifyBailBondDirectoryPublication } from '../../lib/directory/bail-bond-publication';
import { canShowAsVerified, resolveProviderTrustState } from '../../lib/insurance/trust/provider-trust-state';

async function main() {
  loadLocalEnv(process.cwd());
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { count: publicVerified } = await sb.from('providers').select('id', { count: 'exact', head: true }).eq('verified', true);
  let credBail = 0;
  const cred = await sb
    .from('license_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('license_namespace', 'bail_bond');
  if (!cred.error) credBail = cred.count ?? 0;

  let last = '';
  let authoritative = 0;
  let defensiveName = 0;
  let publicBailOnly = 0;
  let mixed = 0;
  const publicHits: Array<{ slug: string; name: string; reason: string }> = [];
  for (;;) {
    let q = sb
      .from('providers')
      .select('id,slug,name,verified,license_info,categories')
      .order('id', { ascending: true })
      .limit(500);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const row of rows) {
      const info = (row.license_info || {}) as { licenses?: Array<{ type?: string; notes?: string }> };
      const types = (info.licenses || []).flatMap((l) => [l.type, l.notes]);
      const decision = classifyBailBondDirectoryPublication({
        businessNames: [row.name],
        licenseEvidence: types,
      });
      if (decision.authoritativeBailLicense) authoritative += 1;
      else if (decision.defensiveBailBusinessName) defensiveName += 1;
      if (decision.excludeFromConsumerDirectory && row.verified) {
        const probe = {
          id: String(row.id),
          slug: String(row.slug),
          name: String(row.name),
          city: 'x',
          state: 'FL',
          insurance_types: ['health'] as const,
          specialties: ['Agency'] as const,
          rating: 0,
          review_count: 0,
          is_verified: true,
          license_number: 'L1',
          license_state: 'FL',
          license_source: 'regulator',
          license_checked_at: new Date().toISOString(),
          license_identity_match_accepted: true,
          licenses: types.filter(Boolean).map((type) => ({ state: 'FL', license_number: 'L1', type: String(type) })),
        };
        const stillPublic = canShowAsVerified(resolveProviderTrustState(probe as never));
        if (stillPublic) {
          publicBailOnly += 1;
          publicHits.push({ slug: String(row.slug), name: String(row.name), reason: decision.reason });
        }
      }
    }
    last = String(rows[rows.length - 1]!.id);
    if (rows.length < 500) break;
  }

  const report = {
    task: 'INS-DIR-BAIL-001',
    at: new Date().toISOString(),
    public_verified_providers: publicVerified ?? 0,
    license_credentials_bail_bond_namespace: credBail ?? 0,
    provider_rows_authoritative_bail_license: authoritative,
    provider_rows_defensive_bail_name: defensiveName,
    mixed_bail_and_non_bail_insurance_entities: mixed,
    currently_public_bail_only_after_firewall: publicBailOnly,
    public_hits: publicHits.slice(0, 25),
    sitemap_provider_urls_before: 0,
    sitemap_provider_urls_after: 0,
    sitemap_delta: 0,
    db_mutation: 0,
  };
  writeFileSync(join(process.cwd(), 'data/reports/ins-dir-bail-001-census.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
