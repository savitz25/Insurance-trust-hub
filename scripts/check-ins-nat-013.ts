/**
 * INS-NAT-013 Florida individual carrier appointment tests (no production writes).
 *   npm run check:ins-nat-013
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { NationalGraph } from '../lib/national/graph';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  appointmentImpliesEmployment,
  appointmentImpliesLoa,
  appointmentImpliesMarketplace,
  appointmentJoinUsesName,
  appointmentSourceRecordId,
  decidePersonAppointmentJoin,
  individualAppointmentCurrency,
  PERSON_AGENCY_ASSOCIATION_TYPE,
  PERSON_CARRIER_APPOINTMENT_TYPE,
  personCarrierRelationshipType,
} from '../lib/national/fl-individual-appointments';
import { carrierProvisionalKey, decideCarrierIdentity } from '../lib/national/carrier-identity';
import { extractOfficialLoas } from '../lib/national/loa';
import { cmsJoinExactNpn } from '../lib/national/cms-marketplace';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const script = join(root, 'scripts/national/backfill-fl-individual-appointments.ts');
assert(existsSync(script), 'backfill script');
const src = readFileSync(script, 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'FIA13 no provider writes');
assert(src.includes('providerWritesPredicted: 0'), 'FIA13 predicted 0');
assert(src.includes('APPOINTED_TO'), 'FIA6 APPOINTED_TO');
assert(!/relationship_type:\s*['"]WORKS_FOR['"]/.test(src), 'FIA6 no WORKS_FOR');
assert(!/relationship_type:\s*['"]ASSOCIATED_WITH['"]/.test(src), 'FIA14 not ASSOCIATED_WITH');
assert(src.includes('CMS_ROW_BASELINE') || src.includes('1300108'), 'FIA15 cms baseline');
assert(!/compareLegalNames/.test(src), 'FIA3 no name person join in backfill');

const personNpns = new Set(['55555', '66666']);
const agencyNpns = new Set(['90001']);
const uniqueFlLicenseToNpn = new Map([['A111', '55555']]);

// FIA1 Exact person NPN attaches appointment
{
  const j = decidePersonAppointmentJoin({
    npn: '55555',
    personByNpn: personNpns,
    agencyNpns,
  });
  assert(j.action === 'attach' && j.confidence === 'CONFIRMED' && j.path === 'exact_npn', 'FIA1');
}

// FIA2 Missing NPN does not create person
{
  const j = decidePersonAppointmentJoin({
    npn: null,
    personByNpn: personNpns,
    agencyNpns,
  });
  assert(j.action === 'skip' && j.confidence === 'UNRESOLVED', 'FIA2');
  assert(!src.includes('entity_kind: \'person\'') || !/\.insert\(payload\)/.test(src) || src.includes('personWritesPredicted: 0'), 'FIA2 no person insert');
}

// FIA3 Same name does not cause person join
assert(appointmentJoinUsesName() === false, 'FIA3');

// FIA4 Exact DFS carrier ID attaches correct carrier
{
  const d = decideCarrierIdentity({
    appointingEntityNumber: '02932',
    names: ['FIRST COMMUNITY INSURANCE COMPANY'],
  });
  assert(d.confidence === 'CONFIRMED' && carrierProvisionalKey(d.number!) === 'carrier:fl-dfs:02932', 'FIA4');
}

// FIA5 Carrier name variation does not create duplicate carrier
{
  const a = decideCarrierIdentity({
    appointingEntityNumber: '02932',
    names: ['FIRST COMMUNITY INSURANCE COMPANY'],
  });
  const b = decideCarrierIdentity({
    appointingEntityNumber: '02932',
    names: ['First Community Insurance Company'],
  });
  assert(carrierProvisionalKey(a.number!) === carrierProvisionalKey(b.number!), 'FIA5');
}

// FIA6 Person→carrier is APPOINTED_TO, not WORKS_FOR
assert(personCarrierRelationshipType() === 'APPOINTED_TO', 'FIA6 type');
assert(appointmentImpliesEmployment() === false, 'FIA6 not employment');
assert(PERSON_CARRIER_APPOINTMENT_TYPE !== PERSON_AGENCY_ASSOCIATION_TYPE, 'FIA6 vs ASSOCIATED_WITH');

// FIA7 Appointment is not an LOA
{
  const r = extractOfficialLoas({
    jurisdiction: 'FL',
    sourceDataset: 'florida_dfs_appointments',
    entityKind: 'person',
    appointmentType: '2-18',
    appointmentTypeDesc: 'LIFE INCLUDING VARIABLE ANNUITY & HEALTH',
  });
  assert(r.observations.length === 0, 'FIA7');
  assert(appointmentImpliesLoa() === false, 'FIA7 helper');
}

// FIA8 Appointment does not create Marketplace evidence
assert(appointmentImpliesMarketplace() === false, 'FIA8');
{
  const cms = cmsJoinExactNpn({ npn: '55555' });
  assert(cms.createPerson === false, 'FIA8 no cms person');
}

// FIA9 Multiple carriers may attach to one person
{
  const k1 = appointmentSourceRecordId({
    personNpn: '55555',
    appointingEntityNumber: '02932',
    appointmentType: '2-18',
    effectiveDate: '2020-01-01',
  });
  const k2 = appointmentSourceRecordId({
    personNpn: '55555',
    appointingEntityNumber: '19232',
    appointmentType: '2-18',
    effectiveDate: '2020-01-01',
  });
  assert(k1 !== k2, 'FIA9 two carriers');
}

// FIA10 Multiple people may attach to one carrier
{
  const k1 = appointmentSourceRecordId({
    personNpn: '55555',
    appointingEntityNumber: '02932',
    appointmentType: '2-18',
    effectiveDate: '2020-01-01',
  });
  const k2 = appointmentSourceRecordId({
    personNpn: '66666',
    appointingEntityNumber: '02932',
    appointmentType: '2-18',
    effectiveDate: '2020-01-01',
  });
  assert(k1 !== k2, 'FIA10 two people');
}

// FIA11 Source dates/status retained
{
  const cur = individualAppointmentCurrency({
    status: 'ACTIVE',
    expirationDate: '2028-06-30',
    sourceIsActiveFile: true,
  });
  assert(cur === 'CURRENT', 'FIA11 active current');
  const hist = individualAppointmentCurrency({
    status: 'TERMINATED',
    expirationDate: '2020-01-01',
  });
  assert(hist === 'HISTORICAL', 'FIA11 terminated historical');
}

// FIA12 Public person profiles remain disabled
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'FIA12');
assert(mayPublishEntityKind('person') === false, 'FIA12 mayPublish');

// FIA14 ASSOCIATED_WITH family stays separate
assert(PERSON_AGENCY_ASSOCIATION_TYPE === 'ASSOCIATED_WITH', 'FIA14');

// FIA16 idempotent key
assert(src.includes('appointmentSourceRecordId') || src.includes('source_record_id'), 'FIA16');

// License secondary path is deterministic, not fuzzy
{
  const j = decidePersonAppointmentJoin({
    npn: null,
    licenseNumber: 'A111',
    personByNpn: personNpns,
    agencyNpns,
    uniqueFlLicenseToNpn,
  });
  assert(j.action === 'attach' && j.path === 'exact_fl_license', 'secondary license');
}

{
  const g = new NationalGraph();
  g.ingest({
    entityKind: 'person',
    sourceDataset: 'florida_dfs',
    sourceRecordId: 'fl-1',
    jurisdiction: 'FL',
    licenseNumber: 'A111',
    npn: '55555',
    legalName: 'JANE SMITH',
    regulator: 'Florida DFS',
  });
  assert(g.entities.filter((e) => e.entityKind === 'person').length === 1, 'graph person');
}

if (errors.length) {
  console.error('INS-NAT-013 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-013 PASS FIA1–FIA16');
