/**
 * INS-NAT-010 individual producer foundation tests (no production writes).
 *   npm run check:ins-nat-010
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { NationalGraph } from '../lib/national/graph';
import {
  PUBLIC_PERSON_PROFILES_ENABLED,
  mayPromoteToPublicProvider,
  mayPublishEntityKind,
} from '../lib/national/publication';
import {
  decidePersonIdentity,
  displayNameFromDfsFullName,
  isFlIndividualCoreProducerTycl,
  personContactPublicEligible,
  personProfilesArePublic,
  personPublicationBlocked,
  worksForFromSharedContact,
} from '../lib/national/person-identity';
import {
  extractOfficialLoas,
  healthLoaImpliesMarketplace,
  healthOrLifeLoaImpliesMedicare,
} from '../lib/national/loa';
import type { SourceCredentialInput } from '../lib/national/types';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const script = join(root, 'scripts/national/backfill-individual-producers.ts');
assert(existsSync(script), 'backfill script');
const src = readFileSync(script, 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'PER15 no provider writes');
assert(src.includes('providerWritesPredicted: 0') || src.includes('providerWritesPredicted:0'), 'PER15 predicted 0');
assert(!/worksForFromSharedContact\(\s*true/.test(src), 'PER14 no contact employment');
assert(src.includes('public_eligible') && src.includes('false'), 'PER7 contacts not public');

function person(
  partial: Partial<SourceCredentialInput> &
    Pick<SourceCredentialInput, 'sourceDataset' | 'sourceRecordId' | 'jurisdiction' | 'licenseNumber' | 'legalName'>
): SourceCredentialInput {
  return {
    entityKind: 'person',
    regulator: partial.regulator || `${partial.jurisdiction} DOI`,
    regulatoryStatus: 'active',
    sourceObservedAt: '2026-08-14T00:00:00.000Z',
    ingestedAt: '2026-08-26T00:00:00.000Z',
    ...partial,
  };
}

// PER1 same NPN FL + VT → one person
{
  const g = new NationalGraph();
  const a = g.ingest(
    person({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl-1',
      jurisdiction: 'FL',
      licenseNumber: 'A111',
      npn: '55555',
      legalName: 'SMITH, JANE',
      loas: [{ officialText: 'LIFE INCL VAR ANNUITY & HEALTH' }],
    })
  );
  const b = g.ingest(
    person({
      sourceDataset: 'vermont_dfr',
      sourceRecordId: 'vt-1',
      jurisdiction: 'VT',
      licenseNumber: '3001',
      npn: '55555',
      legalName: 'JANE SMITH',
      loas: [{ officialText: 'Life' }],
    })
  );
  assert(a.entity?.id === b.entity?.id, 'PER1 one person');
  assert(g.entities.filter((e) => e.entityKind === 'person').length === 1, 'PER1 entity count');
}

// PER2 two state credentials retained
{
  const g = new NationalGraph();
  g.ingest(
    person({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl-2',
      jurisdiction: 'FL',
      licenseNumber: 'A222',
      npn: '66666',
      legalName: 'DOE, JOHN',
    })
  );
  g.ingest(
    person({
      sourceDataset: 'vermont_dfr',
      sourceRecordId: 'vt-2',
      jurisdiction: 'VT',
      licenseNumber: '3002',
      npn: '66666',
      legalName: 'JOHN DOE',
    })
  );
  const creds = g.credentials.filter((c) => c.entityKind === 'person');
  assert(creds.length === 2, 'PER2 two credentials');
  assert(new Set(creds.map((c) => c.jurisdiction)).size === 2, 'PER2 two states');
}

// PER3 same name different NPN → two people
{
  const g = new NationalGraph();
  g.ingest(
    person({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl-3a',
      jurisdiction: 'FL',
      licenseNumber: 'A301',
      npn: '701',
      legalName: 'LEE, PAT',
    })
  );
  g.ingest(
    person({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl-3b',
      jurisdiction: 'FL',
      licenseNumber: 'A302',
      npn: '702',
      legalName: 'LEE, PAT',
    })
  );
  assert(g.entities.filter((e) => e.entityKind === 'person').length === 2, 'PER3 two people');
}

// PER4 same NPN incompatible names → REVIEW_REQUIRED
{
  const d = decidePersonIdentity({
    npn: '88888',
    legalName: 'ALICE JONES',
    existingPersonName: 'ZZZZ CORP HOLDINGS INTERNATIONAL',
  });
  assert(d.confidence === 'REVIEW_REQUIRED', 'PER4 review');
  const g = new NationalGraph();
  g.ingest(
    person({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl-4a',
      jurisdiction: 'FL',
      licenseNumber: 'A401',
      npn: '88881',
      legalName: 'ALICE JONES',
    })
  );
  const r = g.ingest(
    person({
      sourceDataset: 'vermont_dfr',
      sourceRecordId: 'vt-4',
      jurisdiction: 'VT',
      licenseNumber: '3401',
      npn: '88881',
      legalName: 'ZZZZ CORP HOLDINGS INTERNATIONAL',
    })
  );
  assert(r.identityConfidence === 'REVIEW_REQUIRED', 'PER4 graph review');
  assert(r.entity == null, 'PER4 no merge');
}

// PER5 same NPN agency vs person → no cross-kind merge
{
  const g = new NationalGraph();
  const agency = g.ingest({
    entityKind: 'agency',
    sourceDataset: 'florida_dfs',
    sourceRecordId: 'ag-1',
    jurisdiction: 'FL',
    licenseNumber: 'E999',
    npn: '99901',
    legalName: 'ACME INSURANCE LLC',
    regulator: 'Florida DFS',
  });
  const per = g.ingest(
    person({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl-5',
      jurisdiction: 'FL',
      licenseNumber: 'A501',
      npn: '99901',
      legalName: 'ACME PERSON',
    })
  );
  assert(agency.entity?.entityKind === 'agency', 'PER5 agency stays');
  assert(per.identityConfidence === 'REVIEW_REQUIRED', 'PER5 conflict');
  assert(per.entity == null || per.entity.id !== agency.entity?.id, 'PER5 no reuse');
  const d = decidePersonIdentity({
    npn: '99901',
    legalName: 'JANE',
    agencyOwnsNpn: true,
  });
  assert(d.action === 'kind_conflict', 'PER5 helper');
}

// PER6 no NPN → provisional / unresolved
{
  const d = decidePersonIdentity({ npn: null, legalName: 'NO NPN' });
  assert(d.action === 'provisional' && d.confidence === 'UNRESOLVED', 'PER6');
}

// PER7 person contact not public
assert(personContactPublicEligible() === false, 'PER7');

// PER8 publication disabled independently of CLI
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'PER8 flag');
assert(mayPublishEntityKind('person') === false, 'PER8 mayPublish');
assert(personProfilesArePublic() === false, 'PER8 profiles');
assert(personPublicationBlocked() === true, 'PER8 promote blocked');
assert(
  mayPromoteToPublicProvider({ entityType: 'individual' }).ok === false,
  'PER8 entityType individual'
);
assert(src.includes('PUBLIC_PERSON_PROFILES_ENABLED') || src.includes('personPublicationBlocked'), 'PER8 script gate');

// PER9 official person LOA attaches to person credential
{
  const r = extractOfficialLoas({
    jurisdiction: 'FL',
    sourceDataset: 'florida_dfs',
    entityKind: 'person',
    licenseTypes: ['LIFE INCL VAR ANNUITY & HEALTH'],
    linesOfAuthority: ['LIFE INCL VAR ANNUITY & HEALTH'],
  });
  assert(r.observations.length === 1, 'PER9 one loa');
  assert(r.observations[0]!.officialText === 'LIFE INCL VAR ANNUITY & HEALTH', 'PER9 text');
}

// PER10 credential class does not become fake LOA (agency TYCL)
{
  const r = extractOfficialLoas({
    jurisdiction: 'FL',
    sourceDataset: 'florida_dfs',
    entityKind: 'agency',
    linesOfAuthority: ['AGENCY LICENSE'],
  });
  assert(r.observations.length === 0, 'PER10 agency class not loa');
}

// PER11 appointment type does not become fake LOA
{
  const r = extractOfficialLoas({
    jurisdiction: 'FL',
    sourceDataset: 'florida_dfs_appointments',
    entityKind: 'person',
    appointmentType: '2-15',
    appointmentTypeDesc: 'Life Including Variable Annuity',
  });
  assert(r.observations.length === 0, 'PER11 appointment not loa');
}

// PER12 / PER13 marketplace / medicare
assert(healthLoaImpliesMarketplace('HEALTH') === false, 'PER12');
assert(healthOrLifeLoaImpliesMedicare('LIFE INCL VAR ANNUITY & HEALTH') === false, 'PER13');

// PER14 no person→agency from shared contact
assert(worksForFromSharedContact() === false, 'PER14');

// PER16 idempotent key documented in script
assert(src.includes('observationKey') || src.includes('idempotent'), 'PER16');

assert(isFlIndividualCoreProducerTycl('LIFE INCL VAR ANNUITY & HEALTH'), 'core life');
assert(!isFlIndividualCoreProducerTycl('ADJUSTER - ALL LINES'), 'not adjuster');
assert(!isFlIndividualCoreProducerTycl('AGENCY LICENSE'), 'not agency class');
assert(displayNameFromDfsFullName('WALKER, KEITH J') === 'KEITH J WALKER', 'display name');

if (errors.length) {
  console.error('INS-NAT-010 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-010 PASS PER1–PER16');
