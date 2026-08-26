/**
 * INS-NAT-007 carrier spine + FL appointment tests (no production writes).
 *   npm run check:ins-nat-007
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  appointmentCurrency,
  carrierProvisionalKey,
  decideCarrierIdentity,
  isPlausibleNaicCompanyCode,
  normalizeAppointingEntityNumber,
} from '../lib/national/carrier-identity';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const script = join(root, 'scripts/national/backfill-carriers-appointments.ts');
assert(existsSync(script), 'backfill script present');
const src = readFileSync(script, 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'APT10 no provider writes');
assert(!/matchCarrierByReportedName/.test(src), 'APT2 no brand-name agency matching');

// CAR1 exact identifier → one key
{
  const a = carrierProvisionalKey('02932');
  const b = carrierProvisionalKey('02932');
  assert(a === b && a === 'carrier:fl-dfs:02932', 'CAR1 one key');
}

// CAR2 formatting variation still same number
{
  const d1 = decideCarrierIdentity({
    appointingEntityNumber: '02932',
    names: ['FIRST COMMUNITY INSURANCE COMPANY'],
  });
  const d2 = decideCarrierIdentity({
    appointingEntityNumber: '02932',
    names: ['FIRST COMMUNITY INSURANCE COMPANY '],
  });
  assert(d1.confidence === 'CONFIRMED' && d2.confidence === 'CONFIRMED', 'CAR2 confirmed');
  assert(carrierProvisionalKey(d1.number!) === carrierProvisionalKey(d2.number!), 'CAR2 same carrier');
}

// CAR3 two legal numbers → two keys even if brand-similar
{
  const a = carrierProvisionalKey('19232');
  const b = carrierProvisionalKey('19240');
  assert(a !== b, 'CAR3 two entities');
}

// CAR4 same display name, different numbers → no merge
{
  const a = decideCarrierIdentity({
    appointingEntityNumber: '167449',
    names: ['SAFE-GUARD WARRANTY CORPORATION'],
  });
  const b = decideCarrierIdentity({
    appointingEntityNumber: '389230',
    names: ['SAFE-GUARD WARRANTY CORPORATION'],
  });
  assert(a.number !== b.number, 'CAR4 different identifiers');
  assert(
    carrierProvisionalKey(a.number!) !== carrierProvisionalKey(b.number!),
    'CAR4 no merge'
  );
}

// CAR5 unknown number → unresolved
{
  const d = decideCarrierIdentity({
    appointingEntityNumber: '',
    names: ['MYSTERY MUTUAL'],
  });
  assert(d.confidence === 'UNRESOLVED', 'CAR5 unresolved');
}

assert(!isPlausibleNaicCompanyCode('389230'), '6-digit is not NAIC');
assert(isPlausibleNaicCompanyCode('02932') === true, '5-digit is naic-shaped but not claimed');
assert(normalizeAppointingEntityNumber(' 02932 ') === '02932', 'normalize number');

// APT3 terminated historical
assert(
  appointmentCurrency({ status: 'TERMINATED', expirationDate: '2028-01-01' }) === 'HISTORICAL',
  'APT3'
);
// APT4 current when active and not expired
assert(
  appointmentCurrency({
    status: 'ACTIVE',
    expirationDate: '2099-12-31',
    now: new Date('2026-08-26T00:00:00Z'),
  }) === 'CURRENT',
  'APT4'
);
// expired date wins over active label
assert(
  appointmentCurrency({
    status: 'ACTIVE',
    expirationDate: '2020-01-01',
    now: new Date('2026-08-26T00:00:00Z'),
  }) === 'HISTORICAL',
  'APT3b date'
);
// APT5 unknown status
assert(
  appointmentCurrency({ status: '', expirationDate: '2099-12-31' }) === 'UNKNOWN',
  'APT5'
);

// APT9 unresolved not confirmed
{
  const d = decideCarrierIdentity({ appointingEntityNumber: null, names: ['X'] });
  assert(d.confidence !== 'CONFIRMED', 'APT9');
}

if (errors.length) {
  console.error('INS-NAT-007 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-007 PASS CAR1–CAR5 APT3–APT5 APT9–APT10');
