/**
 * INS-NAT-012 Texas individual + PERSON→AGENCY + CMS re-attach tests (no production writes).
 *   npm run check:ins-nat-012
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
  isTxIndividualCoreProducerLicense,
  isTxIndividualExcludedLicense,
  isTxIndividualHighConfidenceProducerLicense,
  personContactPublicEligible,
  personProfilesArePublic,
  personPublicationBlocked,
} from '../lib/national/person-identity';
import {
  extractOfficialLoas,
  healthLoaImpliesMarketplace,
  healthOrLifeLoaImpliesMedicare,
} from '../lib/national/loa';
import {
  associationImpliesWorksFor,
  associationJoinUsesName,
  classifyPersonAgencyAssociation,
  DEFAULT_PERSON_AGENCY_RELATIONSHIP,
  personAgencyRelationshipType,
  relationshipStatusFromAssociation,
} from '../lib/national/tx-association';
import { cmsJoinExactNpn } from '../lib/national/cms-marketplace';
import { txStatusFromOfficialExpiration } from '../lib/national/freshness';
import type { SourceCredentialInput } from '../lib/national/types';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const script = join(root, 'scripts/national/backfill-tx-individuals.ts');
assert(existsSync(script), 'backfill script');
const src = readFileSync(script, 'utf8');
assert(!/\.from\(\s*['"]providers['"]\s*\)\.(insert|update|upsert|delete)/i.test(src), 'PUB2 no provider writes');
assert(src.includes('providerWritesPredicted: 0'), 'PUB2 predicted 0');
assert(!/compareLegalNames\(.*assoc/i.test(src), 'REL3 no association name join');
assert(src.includes('normalizeNpn'), 'exact NPN');
assert(src.includes('identity_attachment'), 'CMS attach field');
assert(src.includes("identity_attachment: 'UNATTACHED'") || src.includes('identity_attachment\', \'UNATTACHED\''), 'CMSA3 only UNATTACHED');
assert(!/relationship_type:\s*['"]WORKS_FOR['"]/.test(src), 'REL6 script does not write WORKS_FOR');
assert(src.includes('ASSOCIATED_WITH'), 'REL1 ASSOCIATED_WITH');
assert(src.includes('source_observed_at'), 'freshness source_observed_at');
assert(src.includes('CMS_ROW_BASELINE'), 'CMSA2 row baseline');

function person(
  partial: Partial<SourceCredentialInput> &
    Pick<SourceCredentialInput, 'sourceDataset' | 'sourceRecordId' | 'jurisdiction' | 'licenseNumber' | 'legalName'>
): SourceCredentialInput {
  return {
    entityKind: 'person',
    regulator: partial.regulator || `${partial.jurisdiction} DOI`,
    regulatoryStatus: 'active',
    sourceObservedAt: '2026-08-24T00:00:00.000Z',
    ingestedAt: '2026-08-26T00:00:00.000Z',
    ...partial,
  };
}

// TXP1 Same NPN TX + FL → one person
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
    })
  );
  const b = g.ingest(
    person({
      sourceDataset: 'texas_tdi_individual',
      sourceRecordId: 'tx-1',
      jurisdiction: 'TX',
      licenseNumber: '2000001',
      npn: '55555',
      legalName: 'JANE SMITH',
      licenseClass: 'General Lines Agent',
    })
  );
  assert(a.entity?.id === b.entity?.id, 'TXP1 one person');
  assert(g.entities.filter((e) => e.entityKind === 'person').length === 1, 'TXP1 count');
}

// TXP2 Same NPN TX + VT → one person
{
  const g = new NationalGraph();
  g.ingest(
    person({
      sourceDataset: 'vermont_dfr',
      sourceRecordId: 'vt-1',
      jurisdiction: 'VT',
      licenseNumber: '3001',
      npn: '55556',
      legalName: 'JANE SMITH',
    })
  );
  const b = g.ingest(
    person({
      sourceDataset: 'texas_tdi_individual',
      sourceRecordId: 'tx-2',
      jurisdiction: 'TX',
      licenseNumber: '2000099',
      npn: '55556',
      legalName: 'JANE SMITH',
    })
  );
  assert(b.entity != null && g.entities.filter((e) => e.entityKind === 'person').length === 1, 'TXP2');
}

// TXP3 TX-only valid NPN → new confirmed person
{
  const d = decidePersonIdentity({ npn: '1234567', legalName: 'NEW TEXAN' });
  assert(d.action === 'create' && d.confidence === 'CONFIRMED', 'TXP3');
}

// TXP4 Same name different NPN → separate people
{
  const g = new NationalGraph();
  g.ingest(
    person({
      sourceDataset: 'texas_tdi_individual',
      sourceRecordId: 'tx-4a',
      jurisdiction: 'TX',
      licenseNumber: 'L1',
      npn: '701',
      legalName: 'PAT LEE',
    })
  );
  g.ingest(
    person({
      sourceDataset: 'texas_tdi_individual',
      sourceRecordId: 'tx-4b',
      jurisdiction: 'TX',
      licenseNumber: 'L2',
      npn: '702',
      legalName: 'PAT LEE',
    })
  );
  assert(g.entities.filter((e) => e.entityKind === 'person').length === 2, 'TXP4');
}

// TXP5 Same NPN incompatible names → REVIEW_REQUIRED
{
  const d = decidePersonIdentity({
    npn: '88888',
    legalName: 'ALICE JONES',
    existingPersonName: 'ZZZZ CORP HOLDINGS INTERNATIONAL',
  });
  assert(d.confidence === 'REVIEW_REQUIRED' && d.action === 'review_name', 'TXP5');
}

// TXP6 Person/agency same NPN → no cross-kind merge
{
  const g = new NationalGraph();
  const agency = g.ingest({
    entityKind: 'agency',
    sourceDataset: 'texas_tdi',
    sourceRecordId: 'ag-1',
    jurisdiction: 'TX',
    licenseNumber: '90001',
    npn: '99901',
    legalName: 'ACME INSURANCE LLC',
    regulator: 'TDI',
  });
  const per = g.ingest(
    person({
      sourceDataset: 'texas_tdi_individual',
      sourceRecordId: 'tx-6',
      jurisdiction: 'TX',
      licenseNumber: 'L6',
      npn: '99901',
      legalName: 'ACME PERSON',
    })
  );
  assert(agency.entity?.entityKind === 'agency', 'TXP6 agency');
  assert(per.identityConfidence === 'REVIEW_REQUIRED', 'TXP6 conflict');
  const d = decidePersonIdentity({ npn: '99901', legalName: 'JANE', agencyOwnsNpn: true });
  assert(d.action === 'kind_conflict', 'TXP6 helper');
}

// TXP7 Missing NPN → no confirmed person
{
  const d = decidePersonIdentity({ npn: null, legalName: 'NO NPN' });
  assert(d.action === 'provisional' && d.confidence === 'UNRESOLVED', 'TXP7');
}

// TXP8 TX credential attaches to correct person
{
  const g = new NationalGraph();
  g.ingest(
    person({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl-8',
      jurisdiction: 'FL',
      licenseNumber: 'A808',
      npn: '80808',
      legalName: 'KIM RIVERA',
    })
  );
  g.ingest(
    person({
      sourceDataset: 'texas_tdi_individual',
      sourceRecordId: 'tx-8',
      jurisdiction: 'TX',
      licenseNumber: '280808',
      npn: '80808',
      legalName: 'KIM RIVERA',
      licenseClass: 'General Lines Agent',
    })
  );
  const creds = g.credentials.filter((c) => c.entityKind === 'person');
  assert(creds.length === 2, 'TXP8 two credentials');
  assert(creds.some((c) => c.jurisdiction === 'TX' && c.licenseNumber === '280808'), 'TXP8 tx cred');
  assert(new Set(creds.map((c) => c.entityId)).size === 1, 'TXP8 same entity');
}

// TXP9 Raw qualification preserved
{
  const r = extractOfficialLoas({
    jurisdiction: 'TX',
    sourceDataset: 'texas_tdi',
    entityKind: 'person',
    licenseTypes: ['General Lines Agent'],
    qualifications: ['Life, Accident, Health & HMO'],
  });
  assert(r.observations.length === 1, 'TXP9 one loa');
  assert(r.observations[0]!.officialText === 'Life, Accident, Health & HMO', 'TXP9 text');
}

// TXP10 Qualification does not create fake Marketplace status
assert(healthLoaImpliesMarketplace('Life, Accident, Health & HMO') === false, 'TXP10 marketplace');
assert(healthOrLifeLoaImpliesMedicare('Life, Accident, Health & HMO') === false, 'TXP10 medicare');

assert(isTxIndividualCoreProducerLicense('General Lines Agent'), 'core gl');
assert(isTxIndividualCoreProducerLicense('Life Agent'), 'core life');
assert(isTxIndividualCoreProducerLicense('Pers Lines Prop and Cas Agent'), 'core pl');
assert(!isTxIndividualCoreProducerLicense('Adjuster'), 'not adjuster');
assert(isTxIndividualExcludedLicense('Adjuster - DHS Texas'), 'exclude dhs');
assert(isTxIndividualExcludedLicense('Escrow Officer'), 'exclude escrow');
assert(isTxIndividualHighConfidenceProducerLicense('County Mutual Agent'), 'hc county');
assert(!isTxIndividualCoreProducerLicense('County Mutual Agent'), 'county not execute core');

// REL1 Exact person NPN + exact agency NPN → relationship
{
  const r = classifyPersonAgencyAssociation({
    licenseeNpn: '55555',
    associatedLicenseeNpn: '90001',
    associationType: 'Desig-Resp-Lic-Person',
    beginDate: '2019-04-01',
    personNpns: new Set(['55555']),
    agencyNpns: new Set(['90001']),
  });
  assert(r.action === 'relate' && r.relationshipType === 'ASSOCIATED_WITH', 'REL1');
  if (r.action === 'relate') {
    assert(r.personNpn === '55555' && r.agencyNpn === '90001', 'REL1 ids');
  }
}

// REL2 Missing agency entity → no forced relationship
{
  const r = classifyPersonAgencyAssociation({
    licenseeNpn: '55555',
    associatedLicenseeNpn: null,
    associatedNaicId: '23043',
    associationType: 'Employee',
    personNpns: new Set(['55555']),
    agencyNpns: new Set(['90001']),
  });
  assert(r.action === 'skip', 'REL2 skip');
  assert(r.action === 'skip' && (r.reason === 'carrier_or_naic_only' || r.reason === 'missing_agency_entity'), 'REL2 reason');
}

// REL3 Name matching is never used
assert(associationJoinUsesName() === false, 'REL3');
assert(!/associated_licensee_name|licensee_name/.test(
  classifyPersonAgencyAssociation.toString() + associationJoinUsesName.toString()
), 'REL3 helper has no name join');

// REL4 Many persons may link to one agency
{
  const agency = new Set(['90001']);
  const a = classifyPersonAgencyAssociation({
    licenseeNpn: '11111',
    associatedLicenseeNpn: '90001',
    personNpns: new Set(['11111', '22222']),
    agencyNpns: agency,
  });
  const b = classifyPersonAgencyAssociation({
    licenseeNpn: '22222',
    associatedLicenseeNpn: '90001',
    personNpns: new Set(['11111', '22222']),
    agencyNpns: agency,
  });
  assert(a.action === 'relate' && b.action === 'relate', 'REL4 both');
  if (a.action === 'relate' && b.action === 'relate') {
    assert(a.agencyNpn === b.agencyNpn && a.personNpn !== b.personNpn, 'REL4 many persons');
  }
}

// REL5 One person may link to multiple agencies
{
  const r1 = classifyPersonAgencyAssociation({
    licenseeNpn: '55555',
    associatedLicenseeNpn: '90001',
    personNpns: new Set(['55555']),
    agencyNpns: new Set(['90001', '90002']),
  });
  const r2 = classifyPersonAgencyAssociation({
    licenseeNpn: '55555',
    associatedLicenseeNpn: '90002',
    personNpns: new Set(['55555']),
    agencyNpns: new Set(['90001', '90002']),
  });
  assert(r1.action === 'relate' && r2.action === 'relate', 'REL5 both');
  if (r1.action === 'relate' && r2.action === 'relate') {
    assert(r1.personNpn === r2.personNpn && r1.agencyNpn !== r2.agencyNpn, 'REL5 many agencies');
  }
}

// REL6 Association is not mislabeled WORKS_FOR
assert(associationImpliesWorksFor('Employee') === false, 'REL6 employee');
assert(personAgencyRelationshipType('Employee') === DEFAULT_PERSON_AGENCY_RELATIONSHIP, 'REL6 type');
assert(personAgencyRelationshipType('Owner') === 'ASSOCIATED_WITH', 'REL6 owner');

// REL7 Historical remains historical when dates/status prove it
{
  const hist = relationshipStatusFromAssociation({
    beginDate: '2018-01-01',
    endDate: '2020-01-01',
  });
  assert(hist.status === 'historical' && hist.currency === 'HISTORICAL', 'REL7 end date');
  const unknown = relationshipStatusFromAssociation({ beginDate: '2021-12-17' });
  assert(unknown.currency === 'UNKNOWN', 'REL7 stale begin is not current');
}

// CMSA1 New TX person exact NPN attaches existing CMS evidence
{
  const j = cmsJoinExactNpn({ npn: '55555', personId: 'person-tx-1' });
  assert(j.attachment === 'ATTACHED' && j.entityId === 'person-tx-1', 'CMSA1');
  assert(j.createPerson === false, 'CMSA1 no create');
}

// CMSA2 attachment alone does not insert CMS rows (script updates only)
assert(!/\.from\(\s*['"]cms_marketplace_observations['"]\s*\)\.insert/i.test(src), 'CMSA2 no insert');
assert(/\.update\(/.test(src), 'CMSA2 update attach');

// CMSA3 KIND_CONFLICT CMS evidence does not attach
{
  const j = cmsJoinExactNpn({ npn: '99901', agencyOwnsNpn: true });
  assert(j.attachment === 'KIND_CONFLICT' && j.entityId == null, 'CMSA3');
}

// CMSA4 No fuzzy CMS join
assert(!/compareLegalNames/.test(readFileSync(join(root, 'lib/national/cms-marketplace.ts'), 'utf8')), 'CMSA4');

// PUB1 / PUB2
assert(PUBLIC_PERSON_PROFILES_ENABLED === false, 'PUB1');
assert(mayPublishEntityKind('person') === false, 'PUB1 mayPublish');
assert(personProfilesArePublic() === false, 'PUB1 profiles');
assert(personPublicationBlocked() === true, 'PUB1 blocked');
assert(personContactPublicEligible() === false, 'PUB1 contacts');
assert(mayPromoteToPublicProvider({ entityType: 'individual' }).ok === false, 'PUB1 promote');

// Freshness: download today ≠ verified today
{
  const observed = new Date('2026-08-24T12:00:00Z');
  const ingested = new Date('2026-08-26T18:00:00Z');
  const st = txStatusFromOfficialExpiration('2027-08-31', observed);
  assert(st === 'active', 'status from official expiration vs snapshot');
  assert(observed.toISOString().slice(0, 10) !== ingested.toISOString().slice(0, 10), 'dates separated');
  const expired = txStatusFromOfficialExpiration('2021-06-30', observed);
  assert(expired === 'expired', 'expired by official date');
}

// IDEM1 unique natural keys documented
assert(src.includes('TX_INDIVIDUAL_SOURCE'), 'IDEM source dataset');
assert(src.includes('source_record_id'), 'IDEM source record');

if (errors.length) {
  console.error('INS-NAT-012 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('INS-NAT-012 PASS TXP1–TXP10 REL1–REL7 CMSA1–CMSA4 PUB1–PUB2 IDEM1');
