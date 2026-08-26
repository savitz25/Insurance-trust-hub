/**
 * INS-NAT-002 proof tests (no production writes).
 *   npm run check:ins-nat-002
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { NationalGraph, graphEntityProjection } from '../lib/national/graph';
import { dualWriteSourceRecord } from '../lib/national/dual-write';
import { credentialFreshnessView } from '../lib/national/freshness';
import { compareLegalNames } from '../lib/national/names';
import { computeNpnCensus } from '../lib/national/census';
import { evaluatePromotionEligibility, type DfsProducerRow } from '../lib/dfs/promote';
import { INDIVIDUAL_PUBLICATION_DISABLED_REASON } from '../lib/national/publication';
import {
  allLicenseEntries,
  LEGACY_LICENSE_FIRST_ONLY_PATHS,
  primaryLicenseEntry,
} from '../lib/providers/license-entries';
import { mapRowToProvider } from '../lib/providers/map-db-provider';
import { resolveLegacyProviderWrite } from '../lib/providers/safe-provider-write';
import { slugifyProducer } from '../lib/dfs/normalize';
import type { LicenseInfo } from '../types/supabase';
import type { Provider as DbProvider } from '../types/supabase';
import type { SourceCredentialInput } from '../lib/national/types';

const errors: string[] = [];
function assert(c: unknown, m: string) {
  if (!c) errors.push(m);
}

const root = join(__dirname, '..');
const mig = join(root, 'supabase/migrations/20260826120000_national_identity_graph.sql');
assert(existsSync(mig), 'missing national identity migration');
const sql = readFileSync(mig, 'utf8');
assert(sql.includes('CREATE TABLE IF NOT EXISTS national_entities'), 'national_entities');
assert(sql.includes('CREATE TABLE IF NOT EXISTS license_credentials'), 'license_credentials');
assert(sql.includes('CREATE TABLE IF NOT EXISTS loa_observations'), 'loa_observations');
assert(sql.includes('CREATE TABLE IF NOT EXISTS contact_observations'), 'contact_observations');
assert(sql.includes('CREATE TABLE IF NOT EXISTS provider_entity_bridges'), 'bridges');
assert(sql.includes('ENABLE ROW LEVEL SECURITY'), 'graph RLS');
assert(!/DROP TABLE providers/i.test(sql), 'must not drop providers');
assert(!/ALTER TABLE providers DROP/i.test(sql), 'must not drop provider columns');

function agency(partial: Partial<SourceCredentialInput> & Pick<
  SourceCredentialInput,
  'sourceDataset' | 'sourceRecordId' | 'jurisdiction' | 'licenseNumber' | 'legalName'
>): SourceCredentialInput {
  return {
    entityKind: 'agency',
    regulator: partial.regulator || `${partial.jurisdiction} DOI`,
    regulatoryStatus: 'active',
    sourceObservedAt: '2026-08-14T00:00:00.000Z',
    ingestedAt: '2026-08-26T00:00:00.000Z',
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// TEST 1 — same NPN, FL + TX
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  const a = agency({
    sourceDataset: 'florida_dfs',
    sourceRecordId: 'fl-a',
    jurisdiction: 'FL',
    licenseNumber: 'L111',
    npn: '12345',
    legalName: 'Acme Insurance LLC',
    loas: [{ officialText: 'Life' }],
    email: 'fl@acme.example',
  });
  const b = agency({
    sourceDataset: 'texas_tdi',
    sourceRecordId: 'tx-b',
    jurisdiction: 'TX',
    licenseNumber: 'B999',
    npn: '12345',
    legalName: 'Acme Insurance LLC',
    loas: [{ officialText: 'General Lines Agency' }],
    email: 'tx@acme.example',
  });
  const r1 = g.ingest(a);
  const r2 = g.ingest(b);
  assert(r1.createdEntity === true, 'T1 created first entity');
  assert(r2.createdEntity === false, 'T1 did not create second entity');
  assert(r1.entity?.id === r2.entity?.id, 'T1 same national entity');
  assert(g.entities.length === 1, 'T1 one entity');
  assert(g.credentials.length === 2, 'T1 two credentials');
  const states = g.jurisdictionsForEntity(r1.entity!.id);
  assert(states.join() === 'FL,TX', `T1 states=${states.join()}`);
  const proj = graphEntityProjection(g, r1.entity!.id);
  assert(proj.credentials.length === 2, 'T1 projection all credentials');
  assert(proj.contacts.length === 2, 'T1 both emails retained');
}

// ---------------------------------------------------------------------------
// TEST 2 — same NPN, multiple FL credentials
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  g.ingest(
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl-1',
      jurisdiction: 'FL',
      licenseNumber: 'A1',
      npn: '22222',
      legalName: 'Twin License Agency',
      licenseClass: 'Agency',
    })
  );
  g.ingest(
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'fl-2',
      jurisdiction: 'FL',
      licenseNumber: 'A2',
      npn: '22222',
      legalName: 'Twin License Agency',
      licenseClass: 'Bail Bond Agency License',
    })
  );
  assert(g.entities.length === 1, 'T2 one entity');
  assert(g.credentials.length === 2, 'T2 two FL credentials not collapsed');
  assert(
    g.credentials.every((c) => c.jurisdiction === 'FL'),
    'T2 both FL'
  );
}

// ---------------------------------------------------------------------------
// TEST 3 — different NPN, same name
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  g.ingest(
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'n1',
      jurisdiction: 'FL',
      licenseNumber: 'X1',
      npn: '33301',
      legalName: 'Common Name Agency LLC',
    })
  );
  g.ingest(
    agency({
      sourceDataset: 'texas_tdi',
      sourceRecordId: 'n2',
      jurisdiction: 'TX',
      licenseNumber: 'X2',
      npn: '33302',
      legalName: 'Common Name Agency LLC',
    })
  );
  assert(g.entities.length === 2, 'T3 name is not an identity key');
}

// ---------------------------------------------------------------------------
// TEST 4 — same name + address, no NPN
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  g.ingest(
    agency({
      sourceDataset: 'nevada_doi',
      sourceRecordId: 'nv-1',
      jurisdiction: 'NV',
      licenseNumber: 'NV1',
      npn: null,
      legalName: 'Desert Agency LLC',
      physicalAddress: '100 Main St Las Vegas NV',
    })
  );
  g.ingest(
    agency({
      sourceDataset: 'mississippi_mid',
      sourceRecordId: 'ms-1',
      jurisdiction: 'MS',
      licenseNumber: 'MS1',
      npn: null,
      legalName: 'Desert Agency LLC',
      physicalAddress: '100 Main St Las Vegas NV',
    })
  );
  assert(g.entities.length === 2, 'T4 no name+address merge');
  assert(
    g.entities.every((e) => e.identityKind === 'provisional'),
    'T4 both provisional'
  );
}

// ---------------------------------------------------------------------------
// TEST 5 — missing NPN
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  const r = g.ingest(
    agency({
      sourceDataset: 'mississippi_mid',
      sourceRecordId: 'ms-npnless',
      jurisdiction: 'MS',
      licenseNumber: 'MS88',
      npn: '',
      legalName: 'Delta Firm',
    })
  );
  assert(r.entity?.identityKind === 'provisional', 'T5 provisional identity');
  assert(r.identityConfidence === 'UNRESOLVED', 'T5 unresolved national identity');
  assert(g.conflicts.length === 0, 'T5 no false conflict');
}

// ---------------------------------------------------------------------------
// TEST 6 — person vs agency
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  g.ingest(
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'biz',
      jurisdiction: 'FL',
      licenseNumber: 'E1',
      npn: '44444',
      legalName: 'Jordan Smith Insurance',
    })
  );
  const person = g.ingest({
    sourceDataset: 'florida_dfs',
    sourceRecordId: 'ind',
    entityKind: 'person',
    jurisdiction: 'FL',
    regulator: 'Florida DFS',
    licenseNumber: 'A1',
    npn: '44444',
    legalName: 'Jordan Smith Insurance',
    regulatoryStatus: 'active',
  });
  assert(g.entities.filter((e) => e.identityKind === 'npn').length === 1, 'T6 agency kept');
  assert(person.identityConfidence === 'REVIEW_REQUIRED', 'T6 person not merged onto agency');
  assert(person.entity == null, 'T6 person credential unresolved');
  assert(
    g.conflicts.some((c) => c.reason === 'same_npn_different_entity_kind'),
    'T6 conflict recorded'
  );
}

// ---------------------------------------------------------------------------
// TEST 7 — slug collision
// ---------------------------------------------------------------------------
{
  const slug = slugifyProducer('Acme Agency', '12345');
  const other = slugifyProducer('Acme Agency', '12345');
  assert(slug === other, 'T7 candidate slugs collide as in production');
  const existing = {
    id: 'prov-fl',
    slug,
    license_info: {
      licenses: [
        {
          state: 'FL',
          license_number: '12345',
          type: 'Agency',
          verification_url: 'https://example.test',
        },
      ],
    } satisfies LicenseInfo,
  };
  const plan = resolveLegacyProviderWrite({
    candidateSlug: slug,
    licenseState: 'TX',
    licenseNumber: '12345',
    existingBySlug: existing,
  });
  assert(plan.action === 'insert_disambiguated', `T7 expected no overwrite, got ${plan.action}`);
  assert(plan.action === 'insert_disambiguated' && plan.slug !== slug, 'T7 new slug');
  const same = resolveLegacyProviderWrite({
    candidateSlug: slug,
    licenseState: 'FL',
    licenseNumber: '12345',
    existingBySlug: existing,
  });
  assert(same.action === 'update', 'T7 same license may update');
}

// ---------------------------------------------------------------------------
// TEST 8 — graph returns all credentials; licenses[0] documented
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  const first = g.ingest(
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'p8a',
      jurisdiction: 'FL',
      licenseNumber: 'FL8',
      npn: '55555',
      legalName: 'Multi State Agency',
    })
  );
  g.ingest(
    agency({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'p8b',
      jurisdiction: 'OH',
      licenseNumber: 'OH8',
      npn: '55555',
      legalName: 'Multi State Agency',
    })
  );
  const proj = graphEntityProjection(g, first.entity!.id);
  assert(proj.credentials.length === 2, 'T8 graph API all credentials');
  assert(
    proj.credentials.map((c) => c.jurisdiction).sort().join() === 'FL,OH',
    'T8 FL and OH'
  );

  const licenseInfo: LicenseInfo = {
    licenses: [
      {
        state: 'FL',
        license_number: 'FL8',
        type: 'Agency',
        verification_url: 'https://example.test/fl',
      },
      {
        state: 'OH',
        license_number: 'OH8',
        type: 'Agency',
        verification_url: 'https://example.test/oh',
      },
    ],
  };
  assert(allLicenseEntries(licenseInfo).length === 2, 'T8 allLicenseEntries');
  assert(primaryLicenseEntry(licenseInfo)?.state === 'FL', 'T8 legacy first is FL');
  const mapped = mapRowToProvider({
    id: 'row-8',
    slug: 'multi-state-agency-fl8',
    name: 'Multi State Agency',
    provider_type: 'brokerage',
    categories: [],
    states_licensed: ['FL', 'OH'],
    cities: ['Miami'],
    license_info: licenseInfo,
    specialties: [],
    rating: 0,
    review_count: 0,
    years_in_business: null,
    relocation_experience: false,
    verified: true,
    description: null,
    short_description: null,
    contact: { address: { street: '', city: 'Miami', state: 'FL', zip: '33101' } },
    created_at: '2026-08-26T00:00:00.000Z',
    updated_at: '2026-08-26T00:00:00.000Z',
  } as DbProvider);
  assert(mapped.license_state === 'FL', 'T8 public display still licenses[0] FL');
  assert(mapped.licenses?.length === 2, 'T8 mapped licenses array has both');
  assert(LEGACY_LICENSE_FIRST_ONLY_PATHS.length >= 4, 'T8 documented legacy paths');
}

// ---------------------------------------------------------------------------
// TEST 9 — individual publication denied
// ---------------------------------------------------------------------------
{
  const individual: DfsProducerRow = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    entity_type: 'individual',
    license_number: 'A5555555',
    npn: '66666',
    legal_name: 'Jane Producer',
    display_name: 'Jane Producer',
    license_status: 'active',
    lines_of_authority: ['Health'],
    city: 'Miami',
    county: 'Miami-Dade',
    county_normalized: 'MIAMI-DADE',
    state: 'FL',
    zip: '33101',
    phone: '(305) 555-0100',
    email: 'jane@example.com',
    source_checked_at: new Date().toISOString(),
  };
  const pub = evaluatePromotionEligibility(individual);
  assert(pub.ok === false, 'T9 individual must not promote');
  assert(
    !pub.ok && pub.reason === INDIVIDUAL_PUBLICATION_DISABLED_REASON,
    `T9 reason=${!pub.ok ? pub.reason : 'ok'}`
  );

  const g = new NationalGraph();
  const dw = dualWriteSourceRecord(g, {
    sourceDataset: 'florida_dfs',
    sourceRecordId: 'ind-9',
    entityKind: 'person',
    jurisdiction: 'FL',
    regulator: 'Florida DFS',
    licenseNumber: 'A5555555',
    npn: '66666',
    legalName: 'Jane Producer',
    regulatoryStatus: 'active',
  });
  assert(dw.entity?.entityKind === 'person', 'T9 graph person allowed');
  assert(dw.publicPublication.ok === false, 'T9 dual-write public denied');
}

// ---------------------------------------------------------------------------
// TEST 10 — freshness vs regulator status
// ---------------------------------------------------------------------------
{
  const staleIngested = '2024-01-01T00:00:00.000Z';
  const view = credentialFreshnessView({
    regulatoryStatus: 'active',
    expirationDate: '2027-02-01',
    sourceObservedAt: '2024-01-01T00:00:00.000Z',
    ingestedAt: staleIngested,
    now: new Date('2026-08-26T00:00:00.000Z'),
    staleAfterDays: 365,
  });
  assert(view.regulatoryStatus === 'active', 'T10 regulator status remains active');
  assert(view.observationStale === true, 'T10 Trust Hub observation stale');
  assert(view.regulatorExpiredByDate === false, 'T10 expiration 2027 is not expired');
}

// ---------------------------------------------------------------------------
// Proof cohort: FL/TX/OH/VT mix (in-memory only)
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  const cohort: SourceCredentialInput[] = [
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c-fl-single',
      jurisdiction: 'FL',
      licenseNumber: 'CFL1',
      npn: '70001',
      legalName: 'Single State FL Agency',
    }),
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c-fl-multi-a',
      jurisdiction: 'FL',
      licenseNumber: 'CFL2A',
      npn: '70002',
      legalName: 'Two License FL Agency',
    }),
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c-fl-multi-b',
      jurisdiction: 'FL',
      licenseNumber: 'CFL2B',
      npn: '70002',
      legalName: 'Two License FL Agency',
    }),
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c-fltx-fl',
      jurisdiction: 'FL',
      licenseNumber: 'CFLTX1',
      npn: '70003',
      legalName: 'Gulf Cross Agency',
      email: 'fl@gulf.example',
    }),
    agency({
      sourceDataset: 'texas_tdi',
      sourceRecordId: 'c-fltx-tx',
      jurisdiction: 'TX',
      licenseNumber: 'CTX1',
      npn: '70003',
      legalName: 'Gulf Cross Agency',
      email: 'tx@gulf.example',
    }),
    agency({
      sourceDataset: 'ohio_odi',
      sourceRecordId: 'c-oh',
      jurisdiction: 'OH',
      licenseNumber: 'COH1',
      npn: '70004',
      legalName: 'Buckeye Agency',
    }),
    agency({
      sourceDataset: 'vermont_dfr',
      sourceRecordId: 'c-vt',
      jurisdiction: 'VT',
      licenseNumber: 'CVT1',
      npn: '70005',
      legalName: 'Green Mountain Agency',
    }),
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'c-conflict-a',
      jurisdiction: 'FL',
      licenseNumber: 'CCFL',
      npn: '70006',
      legalName: 'Alpha Holdings LLC',
    }),
    agency({
      sourceDataset: 'texas_tdi',
      sourceRecordId: 'c-conflict-b',
      jurisdiction: 'TX',
      licenseNumber: 'CCTX',
      npn: '70006',
      legalName: 'Completely Different Company Inc',
    }),
    agency({
      sourceDataset: 'nevada_doi',
      sourceRecordId: 'c-nv-nopn',
      jurisdiction: 'NV',
      licenseNumber: 'CNV1',
      npn: null,
      legalName: 'Missing Npn Firm',
    }),
  ];
  for (const row of cohort) g.ingest(row);
  const stats = g.stats();
  assert(stats.sourceCredentials === 10, `cohort credentials ${stats.sourceCredentials}`);
  // 70001,70002,70003,70004,70005 + Alpha 70006 + NV provisional = 7.
  // Conflict TX name does not create an entity.
  assert(stats.nationalEntities === 7, `cohort entities ${stats.nationalEntities}`);
  assert(stats.agencies === 7, `cohort agencies ${stats.agencies}`);
  assert(stats.multiStateEntities === 1, `cohort multi-state ${stats.multiStateEntities}`);
  assert(stats.provisionalIdentities === 1, 'cohort one provisional');
  assert(stats.reviewRequiredConflicts === 1, 'cohort one name conflict');
  assert(
    g.credentials.filter((c) => c.entityId == null).length === 1,
    'cohort one unresolved (unattached) credential'
  );

  const census = computeNpnCensus(
    cohort.map((c) => ({
      source: c.sourceDataset,
      jurisdiction: c.jurisdiction,
      entityKind: c.entityKind,
      licenseNumber: c.licenseNumber,
      npn: c.npn ?? null,
      legalName: c.legalName,
    })),
    (a, b) => compareLegalNames(a, b) === 'conflict'
  );
  assert(census.crossState.overlaps['FL+TX'] === 2, 'census FL+TX NPNs include 70003 and 70006');
}

// ---------------------------------------------------------------------------
// K1 — same credential re-import is idempotent
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  const row = agency({
    sourceDataset: 'florida_dfs',
    sourceRecordId: 'k1',
    jurisdiction: 'FL',
    licenseNumber: 'L777',
    npn: '80001',
    legalName: 'Idempotent Agency',
    licenseClass: 'AGENCY LICENSE',
  });
  g.ingest(row);
  g.ingest({ ...row, sourceObservedAt: '2026-08-20T00:00:00.000Z' });
  assert(g.credentials.length === 1, 'K1 one credential after reimport');
  assert(g.entities.length === 1, 'K1 one entity after reimport');
}

// ---------------------------------------------------------------------------
// K2 — same displayed number, two namespaces, do not collapse
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  g.ingest(
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'k2a',
      jurisdiction: 'FL',
      licenseNumber: '9999',
      npn: '80002',
      legalName: 'Namespace Agency',
      licenseNamespace: 'producer',
      licenseClass: 'AGENCY LICENSE',
    })
  );
  g.ingest(
    agency({
      sourceDataset: 'florida_dfs',
      sourceRecordId: 'k2b',
      jurisdiction: 'FL',
      licenseNumber: '9999',
      npn: '80002',
      legalName: 'Namespace Agency',
      licenseNamespace: 'bail_bond',
      licenseClass: 'BAIL BOND AGENCY LICENSE',
    })
  );
  assert(g.credentials.length === 2, 'K2 two credentials');
  assert(g.entities.length === 1, 'K2 one NPN entity');
  assert(
    new Set(g.credentials.map((c) => c.licenseNamespace)).size === 2,
    'K2 distinct namespaces'
  );
}

// ---------------------------------------------------------------------------
// K3 — same jurisdiction + namespace + number cannot duplicate
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  const row = agency({
    sourceDataset: 'texas_tdi',
    sourceRecordId: 'k3a',
    jurisdiction: 'TX',
    licenseNumber: 'TX-NS-1',
    npn: '80003',
    legalName: 'No Dup Agency',
    licenseClass: 'General Lines Agency',
  });
  g.ingest(row);
  g.ingest({ ...row, sourceRecordId: 'k3b' });
  assert(g.credentials.length === 1, 'K3 duplicate natural key rejected/idempotent');
}

// ---------------------------------------------------------------------------
// P1 — missing NPN, clear source identity → provisional
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  const r = g.ingest(
    agency({
      sourceDataset: 'nevada_doi',
      sourceRecordId: 'p1',
      jurisdiction: 'NV',
      licenseNumber: 'NV-P1',
      npn: null,
      legalName: 'Clear Source Firm LLC',
      licenseClass: 'Resident Producer Firm',
    })
  );
  assert(r.entity?.identityKind === 'provisional', 'P1 provisional entity');
  assert(r.credential.entityId === r.entity?.id, 'P1 credential attached to provisional');
  assert(r.identityConfidence === 'UNRESOLVED', 'P1 national identity unresolved');
}

// ---------------------------------------------------------------------------
// P2 — ambiguous source identity → unattached
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  const r = g.ingest(
    agency({
      sourceDataset: 'mississippi_mid',
      sourceRecordId: 'p2',
      jurisdiction: 'MS',
      licenseNumber: 'MS-P2',
      npn: null,
      legalName: '   ',
      licenseClass: 'Insurance Producer Entity',
    })
  );
  assert(r.entity == null, 'P2 no entity');
  assert(r.credential.entityId == null, 'P2 credential unattached');
  assert(r.identityConfidence === 'UNRESOLVED', 'P2 unresolved');
  assert(g.entities.length === 0, 'P2 no provisional invented');
}

// ---------------------------------------------------------------------------
// P3 — provisional later receives compatible NPN → upgrade, no duplicate
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  const base = agency({
    sourceDataset: 'florida_dfs',
    sourceRecordId: 'p3',
    jurisdiction: 'FL',
    licenseNumber: 'L-P3',
    npn: null,
    legalName: 'Upgradeable Agency LLC',
    licenseClass: 'AGENCY LICENSE',
  });
  const first = g.ingest(base);
  const second = g.ingest({ ...base, npn: '80004' });
  assert(first.entity?.id === second.entity?.id, 'P3 same entity');
  assert(second.entity?.identityKind === 'npn', 'P3 upgraded to npn');
  assert(second.entity?.npn === '80004', 'P3 NPN set');
  assert(g.entities.length === 1, 'P3 no duplicate national identity');
  assert(second.identityConfidence === 'CONFIRMED', 'P3 confirmed after upgrade');
}

// ---------------------------------------------------------------------------
// P4 — provisional later receives conflicting NPN/name evidence
// ---------------------------------------------------------------------------
{
  const g = new NationalGraph();
  g.ingest(
    agency({
      sourceDataset: 'texas_tdi',
      sourceRecordId: 'p4-existing',
      jurisdiction: 'TX',
      licenseNumber: 'TX-P4A',
      npn: '80005',
      legalName: 'Alpha Holdings LLC',
      licenseClass: 'General Lines Agency',
    })
  );
  const prov = agency({
    sourceDataset: 'florida_dfs',
    sourceRecordId: 'p4-prov',
    jurisdiction: 'FL',
    licenseNumber: 'L-P4',
    npn: null,
    legalName: 'Beta Unrelated Company Inc',
    licenseClass: 'AGENCY LICENSE',
  });
  g.ingest(prov);
  const clash = g.ingest({ ...prov, npn: '80005' });
  assert(clash.identityConfidence === 'REVIEW_REQUIRED', 'P4 review required');
  assert(clash.entity?.identityKind === 'provisional', 'P4 remains provisional');
  assert(clash.entity?.npn == null, 'P4 did not silently take conflicting NPN');
  assert(g.entities.filter((e) => e.npn === '80005').length === 1, 'P4 no silent merge');
}

if (errors.length) {
  console.error('INS-NAT-002 FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      tests: [
        'T1 same NPN FL+TX',
        'T2 same NPN multiple FL credentials',
        'T3 different NPN same name',
        'T4 same name+address no NPN',
        'T5 missing NPN provisional',
        'T6 person vs agency',
        'T7 slug collision',
        'T8 multi-license graph + licenses[0] documented',
        'T9 individual publication gate',
        'T10 freshness vs regulator status',
        'proof cohort FL/TX/OH/VT',
        'K1 idempotent reimport',
        'K2 namespace does not collapse',
        'K3 natural key uniqueness',
        'P1 provisional for clear missing NPN',
        'P2 unattached for ambiguous identity',
        'P3 provisional NPN upgrade',
        'P4 provisional conflicting NPN',
      ],
      legacyLicenseFirstOnlyPaths: LEGACY_LICENSE_FIRST_ONLY_PATHS,
    },
    null,
    2
  )
);
