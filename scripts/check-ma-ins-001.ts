/**
 * MA-INS-001 production-writer tests (no production writes).
 *   npm run check:ma-ins-001
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../lib/national/publication';
import {
  MA_INS_001_GATES,
  decideMaIdentityJoin,
  emailIsIdentityKey,
  identityUsesEmailPhoneAddressName,
  licenseClassIsLoa,
  ma001EntityInsertsPredicted,
  ma001IsConfirmedAgency,
  ma001WorksForInsertsPredicted,
  maLicenseStatusFromSource,
  nameIsIdentityKey,
  splitMaLoas,
} from '../lib/national/ma-doi-regulatory';
import { extractOfficialLoas } from '../lib/national/loa';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const writer = join(root, 'scripts/national/ingest-ma-doi-regulatory.ts');
assert(existsSync(writer), 'writer exists');
const src = readFileSync(writer, 'utf8');
assert(src.includes("entity_kind: 'agency'"), 'agency credentials');
assert(!/entity_kind:\s*['"]person['"]/.test(src), 'no person entity writes');
assert(src.includes('ma001EntityInsertsPredicted'), 'entity inserts predicted 0');
assert(!/relationship_type:\s*['"]WORKS_FOR['"]/.test(src), 'no WORKS_FOR');
assert(!/generate_sitemap|app\/robots/.test(src), 'no SEO writes');
assert(src.includes('REVIEW_REQUIRED_ENTITY_TYPE'), 'held net-new');
assert(src.includes('UNRESOLVED_malformed_npn') || src.includes('malformed'), 'malformed held');

const personByNpn = new Set<string>();
const agencyByNpn = new Set(['90001', '90002']);

{
  const a = decideMaIdentityJoin({ npn: '90001', personByNpn, agencyByNpn });
  const b = decideMaIdentityJoin({ npn: '90001', personByNpn, agencyByNpn });
  assert(ma001IsConfirmedAgency(a) && ma001IsConfirmedAgency(b) && a.npn === b.npn, 'same NPN same agency');
}
{
  const a = decideMaIdentityJoin({ npn: '90001', personByNpn, agencyByNpn });
  const b = decideMaIdentityJoin({ npn: '90002', personByNpn, agencyByNpn });
  assert(a.action === 'attach' && b.action === 'attach' && a.npn !== b.npn, 'same name different NPN still separate');
}
assert(emailIsIdentityKey() === false, 'email not identity');
assert(nameIsIdentityKey() === false, 'name not identity');
assert(identityUsesEmailPhoneAddressName() === false, 'phone/address/name not identity');
assert(licenseClassIsLoa() === false, 'license ≠ LOA');
{
  const loas = splitMaLoas('Property, Casualty, Life');
  assert(loas.length === 3, 'multiple LOAs');
  const extracted = extractOfficialLoas({
    jurisdiction: 'MA',
    sourceDataset: 'massachusetts_doi_regulatory',
    entityKind: 'agency',
    licenseTypes: ['Insurance Producer'],
    linesOfAuthority: loas,
  });
  assert(extracted.observations.length === 3, 'one credential many LOAs');
  assert(
    extracted.skipped.some((s) => s.officialText === 'Insurance Producer'),
    'class skipped as LOA'
  );
}
{
  const s = maLicenseStatusFromSource({ statusRaw: 'Active', expirationDate: '2010-01-01' });
  assert(s.normalized === 'active' && s.usedExpirationAlone === false, 'status from source');
}
assert(ma001EntityInsertsPredicted() === 0, 'new agencies 0');
assert(ma001WorksForInsertsPredicted() === 0, 'WORKS_FOR 0');
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'no person indexing');
assert(mayPublishEntityKind('person') === false, 'person unpublished');
assert(MA_INS_001_GATES.confirmedAgencyNpn === 7059, 'cohort 7059');
assert(MA_INS_001_GATES.heldNetNewNpn === 2089, 'held 2089');
{
  const net = decideMaIdentityJoin({ npn: '11111', personByNpn, agencyByNpn });
  assert(net.action === 'net_new' && !ma001IsConfirmedAgency(net), 'net-new held');
}
{
  const bad = decideMaIdentityJoin({ npn: null, personByNpn, agencyByNpn });
  assert(bad.action === 'skip' && bad.confidence === 'UNRESOLVED', 'malformed/missing NPN held');
}

if (errors.length) {
  console.error('MA-INS-001 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('MA-INS-001 PASS writer tests');
