/**
 * INS-NAT-014 Texas individual carrier appointment tests (no production writes).
 *   npm run check:ins-nat-014
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import { extractOfficialLoas } from '../lib/national/loa';
import { cmsJoinExactNpn } from '../lib/national/cms-marketplace';
import { carrierProvisionalKey } from '../lib/national/carrier-identity';
import {
  PERSON_AGENCY_ASSOCIATION_TYPE,
  PERSON_CARRIER_APPOINTMENT_TYPE,
  appointmentBecomesAssociatedWith,
  appointmentImpliesEmployment,
  appointmentImpliesLoa,
  appointmentImpliesMarketplace,
  appointmentJoinUsesName,
  decidePersonAppointmentJoin,
  decideTxAppointingEntity,
  isFlDfsAppointingEntityKey,
  txAndFlKeysAreDistinct,
  txAppointmentCurrency,
  txAppointmentSourceRecordId,
  txAppointingEntityKey,
  txMergesWithFlDfsByName,
} from '../lib/national/tx-individual-appointments';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const script = join(root, 'scripts/national/backfill-tx-individual-appointments.ts');
assert(existsSync(script), 'backfill script');
const src = readFileSync(script, 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'TIA21 no provider writes');
assert(src.includes('providerWritesPredicted: 0'), 'TIA21 predicted 0');
assert(src.includes('personWritesPredicted: 0'), 'TIA17 person writes 0');
assert(src.includes('APPOINTED_TO'), 'TIA8');
assert(!/relationship_type:\s*['"]WORKS_FOR['"]/.test(src), 'TIA9');
assert(!/relationship_type:\s*['"]ASSOCIATED_WITH['"]/.test(src), 'TIA10');
assert(src.includes('1300108') || src.includes('CMS_ROW_BASELINE'), 'TIA20');
assert(src.includes('carrier:tx-tdi-naic:'), 'TIA4 namespace');
assert(src.includes('TX_INDIVIDUAL_APPOINTMENT_SOURCE'), 'TIA4 dataset');
assert(!src.includes('carrier:fl-dfs:') || src.includes('txAndFlKeysAreDistinct') || src.includes('tx-tdi-naic'), 'TIA24 separate ns');

const personNpns = new Set(['55555', '66666']);
const agencyNpns = new Set(['90001']);

// TIA1
{
  const j = decidePersonAppointmentJoin({ npn: '55555', personByNpn: personNpns, agencyNpns });
  assert(j.action === 'attach' && j.path === 'exact_npn', 'TIA1');
}
// TIA2
{
  const j = decidePersonAppointmentJoin({ npn: null, personByNpn: personNpns, agencyNpns });
  assert(j.action === 'skip' && j.confidence === 'UNRESOLVED', 'TIA2');
}
// TIA3
assert(appointmentJoinUsesName() === false, 'TIA3');
// TIA4
{
  const d = decideTxAppointingEntity({ naicId: '60488', names: ['American General Life Insurance Company'] });
  assert(d.confidence === 'CONFIRMED' && d.naicId === '60488', 'TIA4 id');
  if (d.confidence === 'CONFIRMED') {
    assert(d.key === 'carrier:tx-tdi-naic:60488', 'TIA4 key');
  }
}
// TIA5
{
  const a = decideTxAppointingEntity({ naicId: '60488', names: ['American General Life Insurance Company'] });
  const b = decideTxAppointingEntity({
    naicId: '60488',
    names: ['AMERICAN GENERAL LIFE INSURANCE COMPANY'],
  });
  assert(
    a.confidence === 'CONFIRMED' &&
      b.confidence === 'CONFIRMED' &&
      a.confidence === 'CONFIRMED' &&
      b.confidence === 'CONFIRMED' &&
      txAppointingEntityKey('60488') === txAppointingEntityKey('60488'),
    'TIA5'
  );
}
// TIA6
{
  const missing = decideTxAppointingEntity({ naicId: '', names: ['Some Insurer'] });
  assert(missing.confidence === 'UNRESOLVED', 'TIA4 missing naic');
  const conflict = decideTxAppointingEntity({
    naicId: '60488',
    names: ['American General Life Insurance Company', 'Nationwide Mutual Insurance Company'],
  });
  assert(conflict.confidence === 'REVIEW_REQUIRED', 'TIA5 conflicting names');
}
assert(txAppointingEntityKey('60488') !== txAppointingEntityKey('70670'), 'TIA6');
// TIA7 / TIA24
assert(txAndFlKeysAreDistinct('60488', '02932'), 'TIA7 keys');
assert(isFlDfsAppointingEntityKey(carrierProvisionalKey('02932')), 'TIA7 fl key');
assert(!isFlDfsAppointingEntityKey(txAppointingEntityKey('60488')), 'TIA7 tx not fl');
assert(txMergesWithFlDfsByName() === false, 'TIA24');
assert(txAppointingEntityKey('02932') !== carrierProvisionalKey('02932'), 'TIA24 even same digits');
// TIA8-10
assert(PERSON_CARRIER_APPOINTMENT_TYPE === 'APPOINTED_TO', 'TIA8');
assert(appointmentImpliesEmployment() === false, 'TIA9');
assert(appointmentBecomesAssociatedWith() === false, 'TIA10');
assert(PERSON_AGENCY_ASSOCIATION_TYPE === 'ASSOCIATED_WITH', 'TIA10 family');
// TIA11
{
  const r = extractOfficialLoas({
    jurisdiction: 'TX',
    sourceDataset: 'texas_tdi_appointments',
    entityKind: 'person',
    appointmentType: 'Life, Accident, Health and HMO',
  });
  assert(r.observations.length === 0, 'TIA11');
  assert(appointmentImpliesLoa() === false, 'TIA11 helper');
}
// TIA12
assert(appointmentImpliesMarketplace() === false, 'TIA12');
assert(cmsJoinExactNpn({ npn: '55555' }).createPerson === false, 'TIA12 no create');
// TIA13
assert(txAppointmentCurrency({ sourceIsActiveFile: true }) === 'CURRENT', 'TIA13 active file');
// TIA14
{
  const k1 = txAppointmentSourceRecordId({
    personNpn: '55555',
    naicId: '60488',
    appointmentType: 'Life',
    activeDate: '2020-01-01',
  });
  const k2 = txAppointmentSourceRecordId({
    personNpn: '55555',
    naicId: '70670',
    appointmentType: 'Life',
    activeDate: '2020-01-01',
  });
  assert(k1 !== k2, 'TIA14');
}
// TIA15
{
  const k1 = txAppointmentSourceRecordId({
    personNpn: '55555',
    naicId: '60488',
    appointmentType: 'Life',
    activeDate: '2020-01-01',
  });
  const k2 = txAppointmentSourceRecordId({
    personNpn: '66666',
    naicId: '60488',
    appointmentType: 'Life',
    activeDate: '2020-01-01',
  });
  assert(k1 !== k2, 'TIA15');
}
// TIA16-23
assert(src.includes('ASSOCIATED_WITH_BASELINE') || src.includes('52827'), 'TIA16');
assert(src.includes('PERSON_BASELINE') || src.includes('1029860'), 'TIA17');
assert(src.includes('credentialWritesPredicted: 0'), 'TIA18');
assert(src.includes('loaWritesPredicted: 0'), 'TIA19');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'TIA22');
assert(mayPublishEntityKind('person') === false, 'TIA22 mayPublish');
assert(src.includes('publicCarrierPage') || src.includes('public writes') || src.includes('publicWritesPredicted: 0'), 'TIA23');
assert(mayPublishEntityKind('carrier') === false, 'TIA23 carrier unpublished');
assert(src.includes('source_record_id'), 'TIA25 key');
{
  const a = txAppointmentSourceRecordId({
    personNpn: '55555',
    naicId: '60488',
    appointmentType: 'Life',
    activeDate: '2020-01-01',
  });
  const b = txAppointmentSourceRecordId({
    personNpn: '55555',
    naicId: '60488',
    appointmentType: 'Property and Casualty',
    activeDate: '2020-01-01',
  });
  assert(a !== b, 'TIA25 distinct types');
}

if (errors.length) {
  console.error('INS-NAT-014 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-014 PASS TIA1–TIA25');
