/**
 * INS-NAT-009 LOA observation tests (no production writes).
 *   npm run check:ins-nat-009
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  APPOINTMENT_TYCL_POLICY,
  CLASS_VS_LOA_POLICY,
  MARKETPLACE_INFERENCE_POLICY,
  MEDICARE_INFERENCE_POLICY,
  carrierAppointmentImpliesMarketplace,
  executeEligible,
  extractOfficialLoas,
  healthLoaImpliesMarketplace,
  healthOrLifeLoaImpliesMedicare,
  loaAppearsCurrent,
  loaChangesEntityClassification,
  loaCurrency,
  normalizeLoaStatus,
  observationKey,
  preserveOfficialText,
  sourceFieldRole,
} from '../lib/national/loa';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const script = join(root, 'scripts/national/backfill-loa-observations.ts');
assert(existsSync(script), 'backfill script present');
const src = readFileSync(script, 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'LOA14 no provider writes');
assert(!/national_entities['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'LOA13 no entity writes');
assert(!/license_credentials['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'LOA13 no credential writes');
assert(src.includes('source_record_links'), 'LOA10 lineage via source_record_links');
assert(src.includes('credential_id'), 'LOA10 credential linkage');
assert(!/matchCarrierByReportedName|compareLegalNames/.test(src), 'no name identity attach');
assert(src.includes('providerWritesPredicted: 0') || src.includes('providerWritesPredicted:0'), 'LOA14 predicted 0');

// LOA1 official source LOA → one observation
{
  const r = extractOfficialLoas({
    jurisdiction: 'TX',
    sourceDataset: 'texas_tdi',
    licenseTypes: ['General Lines Agency'],
    qualifications: ['Property and Casualty'],
  });
  assert(r.observations.length === 1, 'LOA1 one observation');
  assert(r.observations[0]!.officialText === 'Property and Casualty', 'LOA1 official text');
  assert(r.skipped.some((s) => s.reason === 'credential_class_not_loa'), 'LOA1 class skipped');
}

// LOA2 same observation reimport → idempotent key
{
  const a = observationKey('cred-1', 'texas_tdi', 'Property and Casualty');
  const b = observationKey('cred-1', 'texas_tdi', '  property and casualty ');
  assert(a === b, 'LOA2 idempotent key');
}

// LOA3 same official LOA in FL + TX → two jurisdiction-specific keys
{
  const fl = observationKey('fl-cred', 'florida_dfs', 'Life');
  const tx = observationKey('tx-cred', 'texas_tdi', 'Life');
  assert(fl !== tx, 'LOA3 two jurisdiction observations');
}

// LOA4 different state LOAs remain separate
{
  const rFl = extractOfficialLoas({
    jurisdiction: 'VT',
    sourceDataset: 'vermont_dfr',
    licenseTypes: ['Insurance Producer'],
    qualifications: ['Life'],
  });
  const rTx = extractOfficialLoas({
    jurisdiction: 'TX',
    sourceDataset: 'texas_tdi',
    licenseTypes: ['General Lines Agency'],
    qualifications: ['Property and Casualty'],
  });
  assert(rFl.observations[0]!.officialText !== rTx.observations[0]!.officialText, 'LOA4 separate terms');
  assert(rFl.observations[0]!.officialText === 'Life', 'LOA4 VT Life');
}

// LOA5 raw official terminology preserved
{
  const raw = 'Life, Accident, Health & HMO';
  const r = extractOfficialLoas({
    jurisdiction: 'TX',
    sourceDataset: 'texas_tdi',
    licenseTypes: ['Life Agency'],
    qualifications: [raw],
  });
  assert(r.observations[0]!.officialText === raw, 'LOA5 raw preserved');
  assert(preserveOfficialText(raw) === raw, 'LOA5 trim only');
}

// LOA6 consumer normalized category does not overwrite raw text
{
  const r = extractOfficialLoas({
    jurisdiction: 'TX',
    sourceDataset: 'texas_tdi',
    licenseTypes: ['Life Agency'],
    qualifications: ['Life, Accident, Health & HMO'],
  });
  assert(r.observations[0]!.officialText === 'Life, Accident, Health & HMO', 'LOA6 raw intact');
  assert(r.observations[0]!.consumerGroup !== r.observations[0]!.officialText, 'LOA6 derived separate');
  assert(r.observations[0]!.consumerGroup?.includes('LIFE'), 'LOA6 family derived');
  assert(r.observations[0]!.consumerGroup?.includes('HEALTH'), 'LOA6 health family');
}

// LOA7 appointment TYCL not treated as LOA
{
  const r = extractOfficialLoas({
    jurisdiction: 'FL',
    sourceDataset: 'florida_dfs_appointments',
    appointmentType: '2-20',
    appointmentTypeDesc: 'General Lines',
    linesOfAuthority: ['AGENCY LICENSE'],
  });
  assert(r.observations.length === 0, 'LOA7 no appointment LOA');
  assert(
    r.skipped.every((s) => s.fieldRole === 'APPOINTMENT_TYPE' || s.fieldRole === 'CREDENTIAL_CLASS'),
    'LOA7 roles'
  );
  assert(sourceFieldRole({
    jurisdiction: 'FL',
    sourceDataset: 'florida_dfs_appointments',
    field: 'appointment_type',
  }) === 'APPOINTMENT_TYPE', 'LOA7 field role');
  assert(APPOINTMENT_TYCL_POLICY.includes('not a line of authority'), 'LOA7 policy');
}

// FL TYCL class is not LOA
{
  const r = extractOfficialLoas({
    jurisdiction: 'FL',
    sourceDataset: 'florida_dfs',
    linesOfAuthority: ['AGENCY LICENSE', 'SERVICE WARRANTY'],
  });
  assert(r.observations.length === 0, 'FL class not LOA');
  assert(CLASS_VS_LOA_POLICY.includes('not an LOA'), 'class vs loa policy');
}

// LOA8 Health LOA does not imply Marketplace
{
  assert(healthLoaImpliesMarketplace('Health') === false, 'LOA8 false');
  assert(healthLoaImpliesMarketplace('Life, Accident, Health & HMO') === false, 'LOA8 combined');
  assert(MARKETPLACE_INFERENCE_POLICY.includes('does not imply'), 'LOA8 policy');
}

// LOA9 Health/Life LOA does not imply Medicare
{
  assert(healthOrLifeLoaImpliesMedicare('Life') === false, 'LOA9 life');
  assert(healthOrLifeLoaImpliesMedicare('Health') === false, 'LOA9 health');
  assert(MEDICARE_INFERENCE_POLICY.includes('does not imply'), 'LOA9 policy');
  assert(carrierAppointmentImpliesMarketplace() === false, 'LOA9 appointment not marketplace');
}

// LOA10 cannot attach without deterministic credential lineage (script-enforced)
{
  assert(src.includes('skippedNoLineage') || src.includes('skipReason'), 'LOA10 skip without lineage');
  assert(src.includes('credential_id') && src.includes('entity_id'), 'LOA10 both ids required');
}

// LOA11 expired/historical does not appear current
{
  assert(normalizeLoaStatus('expired') === 'expired', 'LOA11 expired token');
  assert(loaCurrency('expired') === 'HISTORICAL', 'LOA11 historical');
  assert(loaAppearsCurrent('expired') === false, 'LOA11 not current');
  assert(loaAppearsCurrent('inactive') === false, 'LOA11 inactive not current');
  assert(loaAppearsCurrent('terminated') === false, 'LOA11 terminated not current');
}

// LOA12 unknown status stays unknown
{
  assert(normalizeLoaStatus(null) === 'UNKNOWN', 'LOA12 null');
  assert(normalizeLoaStatus('') === 'UNKNOWN', 'LOA12 empty');
  assert(loaCurrency('UNKNOWN') === 'UNKNOWN', 'LOA12 currency');
  assert(loaAppearsCurrent('UNKNOWN') === false, 'LOA12 unknown is not current');
  assert(loaAppearsCurrent(null) === false, 'LOA12 null not current');
}

// LOA13 specialty LOA does not change entity classification
{
  assert(loaChangesEntityClassification() === false, 'LOA13 no class rewrite');
}

// LOA14 no provider writes — checked via script source above

// Execute gate
{
  const r = extractOfficialLoas({
    jurisdiction: 'TX',
    sourceDataset: 'texas_tdi',
    licenseTypes: ['General Lines Agency'],
    qualifications: ['Property and Casualty'],
  });
  assert(executeEligible(r.observations[0]!), 'execute CONFIRMED');
}

// Multi-state not unioned: two extracts stay jurisdiction-specific
{
  const vt = extractOfficialLoas({
    jurisdiction: 'VT',
    sourceDataset: 'vermont_dfr',
    licenseTypes: ['Insurance Producer'],
    qualifications: ['Life', 'Accident and Health or Sickness'],
  });
  const tx = extractOfficialLoas({
    jurisdiction: 'TX',
    sourceDataset: 'texas_tdi',
    licenseTypes: ['General Lines Agency'],
    qualifications: ['Property and Casualty'],
  });
  const families = new Set([
    ...vt.observations.flatMap((o) => o.families),
    ...tx.observations.flatMap((o) => o.families),
  ]);
  assert(vt.observations.length === 2, 'VT two LOAs');
  assert(tx.observations.length === 1, 'TX one LOA');
  assert(families.has('LIFE') && families.has('HEALTH') && families.has('PROPERTY_CASUALTY'), 'families present');
}

if (errors.length) {
  console.error('INS-NAT-009 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-009 PASS LOA1–LOA14');
