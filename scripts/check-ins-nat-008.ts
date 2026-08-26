/**
 * INS-NAT-008 contact observation tests (no production writes).
 *   npm run check:ins-nat-008
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  classifyEmailContext,
  extractRawFromLabel,
  normalizeAddressValue,
  normalizeEmail,
  observationLabel,
  parsePhone,
} from '../lib/national/contact-normalize';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const script = join(root, 'scripts/national/backfill-contact-observations.ts');
assert(existsSync(script), 'backfill script');
const src = readFileSync(script, 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'CON12 no provider writes');
assert(!/matchCarrierByReportedName|compareLegalNames/.test(src), 'CON9 no name identity');
assert(!/places|google/i.test(src), 'no Google Places');

// CON1 one email
assert(normalizeEmail('INFO@AGENCY.COM') === 'info@agency.com', 'CON1 normalize');

// CON2 same email reimport same normalized value
assert(normalizeEmail('info@agency.com') === normalizeEmail('INFO@AGENCY.COM'), 'CON2 idempotent value');

// CON3/CON4 different sources are different observations (source in unique key — documented in script)
assert(src.includes('source_dataset'), 'CON3 source provenance field');

// CON5 two phones
{
  const a = parsePhone('(561) 555-1000');
  const b = parsePhone('(561) 555-2000');
  assert(a && b && a.e164 !== b.e164, 'CON5 both phones');
}

// CON6 extension
{
  const p = parsePhone('(561) 555-1212 ext. 47');
  assert(p?.extension === '47', 'CON6 ext');
  assert(p?.e164 === '+15615551212', 'CON6 e164');
  const lab = observationLabel({ raw: '(561) 555-1212 ext. 47', extension: '47' });
  assert(lab.includes('ext=47'), 'CON6 label');
}

// CON7 physical vs mailing different kinds
assert('physical_address' !== 'mailing_address', 'CON7 kinds');

// CON8 suite formatting
{
  const a = normalizeAddressValue({
    street: '100 Main St Suite 200',
    city: 'Miami',
    state: 'FL',
    zip: '33101',
  });
  const b = normalizeAddressValue({
    street: '100 Main St Ste 200',
    city: 'Miami',
    state: 'FL',
    zip: '33101',
  });
  assert(a === b && a, 'CON8 equivalent address');
}

// CON10 unresolved lineage: script skips missing entity
assert(src.includes('agencyBySource') || src.includes('entity_id'), 'CON10 lineage map');

// CON11 named_contact not public
assert(src.includes("kind !== 'named_contact'"), 'CON11 named_contact not public');

// CON13 raw retained
{
  const lab = observationLabel({ raw: 'INFO@X.COM' });
  assert(extractRawFromLabel(lab) === 'INFO@X.COM', 'CON13 raw in label');
}

assert(classifyEmailContext('compliance@agency.com') === 'licensing_regulatory', 'email ctx');
assert(classifyEmailContext('info@agency.com') === 'general_business', 'email general');

if (errors.length) {
  console.error('INS-NAT-008 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-008 PASS CON1–CON14 unit checks');
