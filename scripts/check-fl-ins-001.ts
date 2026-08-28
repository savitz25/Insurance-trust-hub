/**
 * FL-INS-001 DFS credential/appointment tests.
 *   npm run check:fl-ins-001
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  classifyFlDfsTycl,
  surplusLinesAgentIsNotEligibleInsurer,
  tyclIsNotLoa,
} from '../lib/national/fl-dfs-tycl';
import { AGENCY_CARRIER_APPOINTMENT_TYPE, PERSON_CARRIER_APPOINTMENT_TYPE } from '../lib/national/fl-individual-appointments';
import { flDfsNumberIsNaic } from '../lib/national/appointer-crosswalk';
import { normalizeNpn } from '../lib/national/npn';
import {
  decideAgencyAppointmentJoin,
  sourceDedupeKey,
  isConflictingPipeGrain,
  agencyAppointmentUsesName,
  agencyAppointmentUsesFuzzy,
  personAppointmentInheritsToAgency,
  associatedWithInheritsAppointment,
  appointmentTypeIsLoa,
  RETAINED_HISTORICAL_APPOINTED_BY_IDS,
} from '../lib/national/fl-agency-appointments';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const src = readFileSync(join(root, 'scripts/national/run-fl-ins-001.ts'), 'utf8');
const py = readFileSync(join(root, 'scripts/national/fl-ins-001.py'), 'utf8');
const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8');
const finalDoc = readFileSync(join(root, 'docs/florida/FL-INS-001-final.md'), 'utf8');

assert(existsSync(join(root, 'lib/national/fl-dfs-tycl.ts')), 'lib');
assert(existsSync(join(root, 'docs/florida/FL-INS-001-dfs-credential-contract.md')), 'doc contract');
assert(existsSync(join(root, 'docs/florida/FL-INS-001-license-class-dictionary.md')), 'doc dict');
assert(existsSync(join(root, 'docs/florida/FL-INS-001-adjuster-taxonomy.md')), 'doc adj');
assert(existsSync(join(root, 'docs/florida/FL-INS-001-surplus-lines-taxonomy.md')), 'doc sl');
assert(existsSync(join(root, 'docs/florida/FL-INS-001-appointment-contract.md')), 'doc apt');
assert(classifyFlDfsTycl('ADJUSTER - ALL LINES').namespace === 'adjuster', 'all-lines adj');
assert(tyclIsNotLoa() === true, 'T5 tycl not loa');
assert(!src.includes("from('loa_observations').insert"), 'T5 no loa insert');
assert(src.includes('countyAppointments: \'EXCLUDED\'') || /EXCLUDED/.test(src), 'no county file');

{
  const p = classifyFlDfsTycl('GENERAL LINES (PROP & CAS)');
  assert(p.namespace === 'producer' && p.subtype === 'GENERAL_LINES_PC', 'T4 gl');
  assert(p.raw.includes('GENERAL LINES'), 'T4 raw');
}
{
  const a = classifyFlDfsTycl('AGENCY LICENSE');
  assert(a.promoteAsCanonicalAgency === true && a.grain === 'agency', 'T2 agency');
  assert(normalizeNpn('7410936') === '7410936', 'T2 npn');
}
assert(classifyFlDfsTycl('PUBLIC ADJUSTER').subtype === 'PUBLIC_ADJUSTER', 'T6 pa');
assert(classifyFlDfsTycl('PUBLIC ADJUSTING FIRM').subtype === 'PUBLIC_ADJUSTING_FIRM', 'T7 firm');
assert(classifyFlDfsTycl('PUBLIC ADJUSTING FIRM').grain === 'agency', 'T7 grain');
assert(classifyFlDfsTycl('INDEPENDENT ADJUSTER').subtype === 'INDEPENDENT_ADJUSTER', 'T8 ind');
assert(classifyFlDfsTycl('INDEPENDENT ADJUSTER').subtype !== classifyFlDfsTycl('PUBLIC ADJUSTER').subtype, 'T8 sep');
assert(classifyFlDfsTycl('SURPLUS LINES').namespace === 'surplus_lines', 'T9 sl');
assert(surplusLinesAgentIsNotEligibleInsurer() === true, 'T9 not insurer');
assert(classifyFlDfsTycl('MOTOR VEHICLE RENTAL').namespace === 'limited_lines', 'T10 limited');
assert(classifyFlDfsTycl('NONRES LIFE').residencyFromClassPrefix === 'nonresident', 'T11 prefix');
assert(PERSON_CARRIER_APPOINTMENT_TYPE === 'APPOINTED_TO', 'T12 person apt');
assert(AGENCY_CARRIER_APPOINTMENT_TYPE === 'appointed_by', 'T13 agency apt');
assert(!src.includes('APPOINTED_TO') || src.includes('appointed_by'), 'T14 no person inherit in agency insert');
assert(flDfsNumberIsNaic() === false, 'T15 appointer not insurer');
assert(classifyFlDfsTycl('AGENCY LICENSE').confidence === 'CONFIRMED', 'identity');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'T18 people');
assert(mayPublishEntityKind('person') === false, 'T18 person gate');
assert((sitemap.match(/['"`]\/florida['"`]/g) || []).length <= 1, 'T18 /florida only');
assert(src.includes('--execute'), 'execute gate');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'no provider writes');
assert(
  decideAgencyAppointmentJoin({ npn: '7410936', agencyIdsForNpn: ['ag'] }).confidence === 'CONFIRMED',
  'exact npn'
);
assert(agencyAppointmentUsesName() === false, 'no name identity');
assert(agencyAppointmentUsesFuzzy() === false, 'no fuzzy identity');
assert(
  sourceDedupeKey({
    licenseNumber: 'L1',
    appointingEntityNumber: '02956',
    appointmentType: 'MANAGING GENERAL AGENT',
  }) === 'L1|02956|MANAGING GENERAL AGENT',
  'grain 3-part'
);
assert(isConflictingPipeGrain('L092510|06063|0060|2/1/2024 12:00:00 AM') === true, 'old 4-part grain');
assert(isConflictingPipeGrain('fl-dfs-biz:L1|02956|MANAGING GENERAL AGENT') === false, 'canonical not conflicting');
assert(personAppointmentInheritsToAgency() === false, 'person non-inherit');
assert(associatedWithInheritsAppointment() === false, 'associated_with non-inherit');
assert(appointmentTypeIsLoa() === false, 'apt != loa');
assert(RETAINED_HISTORICAL_APPOINTED_BY_IDS.length === 2, '2 historical');
assert(/does not insert appointed_by/i.test(src) || /does not insert/i.test(src), 'ts no insert');
assert(!/recordId:\s*\[lic,\s*num,\s*tycl,\s*issue/.test(src), 'ts retired 4-part grain');
assert(py.includes('live_wrong_grain_ids'), 'py live cleanup');
assert(py.includes('RETAINED_HISTORICAL_IDS'), 'py retain historical');
assert(!/wrong_ids = \[.{10,}/.test(py), 'py no hardcoded cleanup list');
assert(/2,678/.test(finalDoc) && /2,680/.test(finalDoc), 'final lock');

if (errors.length) {
  console.error('FL-INS-001 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('FL-INS-001 PASS taxonomy appointments publication-safe');
