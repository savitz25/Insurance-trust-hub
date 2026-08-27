/**
 * MA-INS-000 Massachusetts DOI regulatory adapter tests (no production writes).
 *   npm run check:ma-ins-000
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  appointmentBecomesWorksFor,
  decideMaEntityType,
  decideMaIdentityJoin,
  domicileIsLicenseState,
  emailIsIdentityKey,
  fingerprintLines,
  licenseClassIsLoa,
  loaIsAppointment,
  maContactObservations,
  maCredentialSourceRecordId,
  maFieldRoles,
  maIndividualsArePublic,
  maLicenseStatusFromSource,
  maLoaSourceRecordId,
  maRowGrain,
  nameCannotOverrideNpn,
  nameIsIdentityKey,
  parseMaRegulatoryRecord,
  publicationClassForMa,
  splitMaLoas,
} from '../lib/national/ma-doi-regulatory';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const adapter = join(root, 'lib/national/ma-doi-regulatory.ts');
const audit = join(root, 'scripts/national/audit-ma-doi-regulatory.ts');
assert(existsSync(adapter), 'adapter exists');
assert(existsSync(audit), 'audit script exists');
const src = readFileSync(audit, 'utf8');
assert(!/\.from\([^)]+\)\.(insert|update|upsert|delete)/i.test(src), 'no production writes');
assert(src.includes('DRY-RUN') || src.includes('dry-run') || src.includes('dryRun'), 'dry-run');
assert(!/generate_sitemap|app\/robots|sitemap\.ts/.test(src), 'no SEO writes');

const personByNpn = new Set(['55555']);
const agencyByNpn = new Set(['90001']);

// 1 same NPN → same national entity
{
  const a = decideMaIdentityJoin({ npn: '55555', personByNpn, agencyByNpn });
  const b = decideMaIdentityJoin({ npn: '55555', personByNpn, agencyByNpn });
  assert(a.action === 'attach' && b.action === 'attach' && a.action === 'attach' && b.action === 'attach' && a.npn === b.npn, 'T1 same npn');
}
// 2 same name / different NPN → separate
{
  const a = decideMaIdentityJoin({ npn: '55555', personByNpn, agencyByNpn });
  const b = decideMaIdentityJoin({ npn: '66666', personByNpn: new Set(['66666']), agencyByNpn });
  assert(a.action === 'attach' && b.action === 'attach' && a.npn !== b.npn, 'T2 different npn');
}
assert(nameIsIdentityKey() === false, 'T2 name not key');
assert(nameCannotOverrideNpn() === true, 'T12 name never overrides NPN');
// 3 same email / different NPN
assert(emailIsIdentityKey() === false, 'T3 email not identity');
// 4 domicile ≠ MA license state
assert(domicileIsLicenseState() === false, 'T4 domicile');
// 5 license ≠ LOA
assert(licenseClassIsLoa() === false, 'T5 class not loa');
assert(loaIsAppointment() === false, 'T5 loa not appointment');
{
  const roles = maFieldRoles();
  assert(roles.licenseClass === 'CREDENTIAL_CLASS', 'T5 class role');
  assert(roles.loaName === 'OFFICIAL_LOA', 'T5 loa role');
}
// 6 multiple LOAs do not duplicate entity
{
  const loas = splitMaLoas('Life, Accident & Health or Sickness');
  assert(loas.length === 2, 'T6 two loas');
  assert(maRowGrain() === 'LICENSE_PLUS_LOA_SET', 'T6 grain');
}
// 7 multiple licenses same NPN
{
  const k1 = maCredentialSourceRecordId({ npn: '55555', licenseNo: 'A', licenseClass: 'Insurance Producer' });
  const k2 = maCredentialSourceRecordId({ npn: '55555', licenseNo: 'B', licenseClass: 'Insurance Producer' });
  assert(k1 !== k2, 'T7 two licenses');
}
// 8/9 status from source, not expiration
{
  const s = maLicenseStatusFromSource({
    statusRaw: 'Active',
    expirationDate: '2010-01-01',
  });
  assert(s.normalized === 'active' && s.usedExpirationAlone === false, 'T8/T9 status');
}
// 10/11 contacts
{
  const row = parseMaRegulatoryRecord(
    {
      LAST_NAME_OR_BUSINESS_NAME: 'Test Agency LLC',
      NPN: '55555',
      PHONE1: '6175550100',
      BUSINESS_EMAIL: 'a@example.com',
      DOMICILE_STATE: 'Arizona',
      LICENSE_NO: '123',
      LICENSE_STATUS: 'Active',
      LICENSE_CLASS: 'Insurance Producer',
      LICENSE_FIRST_ACTIVE_DATE: '1/1/2020',
      LICENSE_EXPIRATION_DATE: '1/1/2027',
      LOA_NAME: 'Life, Casualty',
      BUS_ADDRESS1: '1 Main St',
      BUS_ADDRESS2: '',
      BUS_ADDRESS3: '',
      BUSINESS_CITY: 'Phoenix',
      BUSINESS_STATE_ABBR: 'AZ',
      BUSINESS_ZIP_EXCEL: '85001',
    },
    2
  );
  const contacts = maContactObservations(row);
  assert(contacts.some((c) => c.kind === 'phone'), 'T10 phone');
  assert(contacts.some((c) => c.kind === 'email'), 'T10 email');
  assert(contacts.some((c) => c.kind === 'physical_address'), 'T10 address');
  assert(contacts.length === 3, 'T11 three observations not overwritten');
  assert(row.domicile === 'AZ', 'T4 AZ domicile');
  assert(row.licenseStatus === 'active', 'T8 parsed active');
  assert(row.loas.length === 2, 'T6 parsed loas');
  const fp2 = parseMaRegulatoryRecord(
    {
      LAST_NAME_OR_BUSINESS_NAME: 'Test Agency LLC',
      NPN: '55555',
      PHONE1: '6175550100',
      BUSINESS_EMAIL: 'a@example.com',
      DOMICILE_STATE: 'Arizona',
      LICENSE_NO: '123',
      LICENSE_STATUS: 'Active',
      LICENSE_CLASS: 'Insurance Producer',
      LICENSE_FIRST_ACTIVE_DATE: '1/1/2020',
      LICENSE_EXPIRATION_DATE: '1/1/2027',
      LOA_NAME: 'Life, Casualty',
      BUS_ADDRESS1: '1 Main St',
      BUS_ADDRESS2: '',
      BUS_ADDRESS3: '',
      BUSINESS_CITY: 'Phoenix',
      BUSINESS_STATE_ABBR: 'AZ',
      BUSINESS_ZIP_EXCEL: '85001',
    },
    99
  ).fingerprint;
  assert(row.fingerprint === fp2, 'T17 idempotent parse');
}
assert(maLoaSourceRecordId({ licenseNo: '1', loa: 'Life' }) !== maLoaSourceRecordId({ licenseNo: '1', loa: 'Casualty' }), 'T6 loa keys');
assert(appointmentBecomesWorksFor() === false, 'T13 no WORKS_FOR');
assert(maIndividualsArePublic() === false, 'T14 no individual indexing');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'T14 gate');
assert(mayPublishEntityKind('person') === false, 'T14 person unpublished');
assert(!existsSync(join(root, 'app/massachusetts')), 'T15 no /massachusetts app');
{
  const a = fingerprintLines(['b', 'a']);
  const b = fingerprintLines(['a', 'b']);
  assert(a === b, 'T16 deterministic fingerprint');
}
{
  const d = decideMaEntityType({ name: 'ACME INSURANCE LLC' });
  assert(d.type === 'REVIEW_REQUIRED_ENTITY_TYPE', 'entity type not confirmed from name');
}
{
  const pub = publicationClassForMa({
    join: {
      action: 'attach',
      confidence: 'CONFIRMED',
      path: 'exact_npn',
      entityKind: 'person',
      npn: '55555',
    },
    entityType: decideMaEntityType({ name: 'JANE DOE' }),
  });
  assert(pub === 'INTERNAL_ONLY', 'person CONFIRMED is internal only');
}

if (errors.length) {
  console.error('MA-INS-000 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('MA-INS-000 PASS T1–T17');
