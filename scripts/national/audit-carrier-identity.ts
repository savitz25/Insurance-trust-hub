/**
 * INS-NAT-FINAL-002 — deterministic national carrier identity dry-run.
 * No production entity merge/write. No migration apply.
 */
import { createHash } from 'crypto';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, join } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../../lib/national/publication';
import {
  CARRIER_REGISTRY,
  matchCarrierByReportedName,
} from '../../lib/carriers/registry';
import {
  classifyCmsOrganization,
  classifyFlAppointingToNational,
  classifyTxAppointingToNational,
  consumerBrandProvisionalKey,
  curatedBrandCount,
  fuzzyMergeAllowed,
  IDENTIFIER_SCHEME,
  CARRIER_RELATIONSHIP_TYPE,
  mayTraverseRegulatoryEvidence,
  PUBLIC_COPY,
  parseAppointingEntityKey,
} from '../../lib/national/legal-insurer-identity';
import {
  listingDirFromZipParent,
  NAIC_LOC_SOURCE,
  parseNaicListingDir,
  predictedInsuranceGroupEntities,
  predictedLegalInsurerEntities,
  sha256File,
  fileBytes,
  listLocFiles,
} from '../../lib/national/naic-listing';
import { normalizeTxNaicId } from '../../lib/national/tx-individual-appointments';

const TASK = 'INS-NAT-FINAL-002';
const ROOT = resolve(process.cwd());
const REPORT_DIR = join(ROOT, 'data/reports');
const NAIC_RAW = join(ROOT, 'data/naic-raw');
const LOC_DIR_DEFAULT = join(NAIC_RAW, 'loc-jun-2026');

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.replace(/^\uFEFF/, '').trim());
}

function headerIndex(headers: string[], ...want: string[]): number {
  const norm = (h: string) => h.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const hs = headers.map(norm);
  for (const w of want) {
    const i = hs.indexOf(norm(w));
    if (i >= 0) return i;
  }
  return -1;
}

async function pageCarriers(sb: SupabaseClient) {
  const rows: Array<{
    provisional_key: string | null;
    legal_name: string;
    identity_confidence: string;
  }> = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb
      .from('national_entities')
      .select('provisional_key,legal_name,identity_confidence')
      .eq('entity_kind', 'carrier')
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < page) break;
  }
  return rows;
}

async function streamTxAppointing(path: string): Promise<{
  path: string;
  rows: number;
  missingNaic: number;
  distinct: Map<string, { names: Set<string>; rows: number }>;
}> {
  const distinct = new Map<string, { names: Set<string>; rows: number }>();
  let rows = 0;
  let missingNaic = 0;
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }) });
  let headers: string[] | null = null;
  let iNaic = -1;
  let iName = -1;
  for await (const line of rl) {
    if (!headers) {
      headers = parseCsvLine(line);
      iNaic = headerIndex(headers, 'NAIC ID', 'NAIC', 'NAIC CODE');
      iName = headerIndex(headers, 'Insurance company name', 'Company Name', 'COMPANY NAME');
      continue;
    }
    if (!line) continue;
    const cols = parseCsvLine(line);
    rows += 1;
    const naic = iNaic >= 0 ? normalizeTxNaicId(cols[iNaic]) : null;
    const name = iName >= 0 ? String(cols[iName] || '').replace(/\s+/g, ' ').trim() : '';
    if (!naic) {
      missingNaic += 1;
      continue;
    }
    const rec = distinct.get(naic) ?? { names: new Set<string>(), rows: 0 };
    rec.rows += 1;
    if (name) rec.names.add(name);
    distinct.set(naic, rec);
  }
  return { path, rows, missingNaic, distinct };
}

function findTxCsv(): string | null {
  const candidates = [
    join(ROOT, 'data/tdi-raw/tdi-individual-appointments.csv'),
    'C:/Users/Michael.Savitsky/agent-tools/ins-nat-014/tdi-individual-appointments.csv',
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function findMaLicensedCompanies(): string | null {
  const candidates = [
    join(ROOT, 'data/ma-raw/Mass_licensed_companies.csv'),
    'C:/Users/Michael.Savitsky/insurance-trust-hub/data/ma-raw/Mass_licensed_companies.csv',
    join(ROOT, 'scripts/ma/fixtures/ma-licensed-companies-sample.csv'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function parseMaLicensed(path: string): {
  path: string;
  rows: number;
  withCoCode: number;
  distinctCoCodes: string[];
  sample: Array<{ cocode: string; name: string; companyType: string }>;
} {
  const { readFileSync } = require('fs') as typeof import('fs');
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);
  let headers: string[] | null = null;
  let iType = -1;
  let iNaic = -1;
  let iName = -1;
  let rows = 0;
  const codes = new Set<string>();
  const sample: Array<{ cocode: string; name: string; companyType: string }> = [];
  for (const line of lines) {
    const cols = parseCsvLine(line);
    if (!headers) {
      const blob = cols.map((c) => c.toLowerCase()).join('|');
      if (blob.includes('company type') && blob.includes('naic')) {
        headers = cols;
        iType = headerIndex(headers, 'Company Type');
        iNaic = headerIndex(headers, 'NAIC #', 'NAIC');
        iName = headerIndex(headers, 'Company');
      }
      continue;
    }
    if (cols.every((c) => !c)) continue;
    rows += 1;
    const rawNaic = iNaic >= 0 ? cols[iNaic] : '';
    const digits = String(rawNaic || '').replace(/\D/g, '');
    const cocode = /^\d{5}$/.test(digits) ? digits : null;
    if (cocode) {
      codes.add(cocode);
      if (sample.length < 8) {
        sample.push({
          cocode,
          name: iName >= 0 ? String(cols[iName] || '').trim() : '',
          companyType: iType >= 0 ? String(cols[iType] || '').trim() : '',
        });
      }
    }
  }
  return {
    path,
    rows,
    withCoCode: codes.size,
    distinctCoCodes: Array.from(codes).sort(),
    sample,
  };
}

function fingerprint(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));

  const locDir =
    listingDirFromZipParent(NAIC_RAW) ||
    (existsSync(join(LOC_DIR_DEFAULT, 'PROP.csv')) ? LOC_DIR_DEFAULT : null);
  if (!locDir) {
    throw new Error('NAIC LOC-JUN-2026 extracted CSVs missing under data/naic-raw/loc-jun-2026');
  }

  console.log(`Parsing NAIC listing ${locDir}`);
  const listing = parseNaicListingDir(locDir);
  const legal = predictedLegalInsurerEntities(listing);
  const groups = predictedInsuranceGroupEntities(listing);
  const coSet = new Set(listing.distinctCoCodes);
  const groupSet = new Set(listing.distinctGroupCodes);

  const zipPath = join(NAIC_RAW, NAIC_LOC_SOURCE.zipFileName);
  const sourceManifest = {
    task: TASK,
    officialSources: [
      {
        id: 'naic_loc_jun_2026',
        authority: NAIC_LOC_SOURCE.publisher,
        product: NAIC_LOC_SOURCE.product,
        title: NAIC_LOC_SOURCE.title,
        page: NAIC_LOC_SOURCE.page,
        url: NAIC_LOC_SOURCE.zipUrl,
        localZip: zipPath,
        zipSha256: sha256File(zipPath),
        zipBytes: fileBytes(zipPath),
        extractedDir: locDir,
        files: listLocFiles(locDir),
        fileCounts: listing.fileCounts,
        parserFingerprint: listing.fingerprint,
        role: 'canonical_legal_insurer_and_group_codes',
      },
      {
        id: 'florida_dfs_appointing_entity_number',
        authority: 'Florida Department of Financial Services',
        role: 'state_appointing_entity_namespace_not_naic',
        note: 'Appointing Entity Number is distinct from NAIC Company Code. Digit coincidence is not a crosswalk.',
      },
      {
        id: 'texas_tdi_bupb_23s9',
        authority: 'Texas Department of Insurance',
        portal:
          'https://data.texas.gov/dataset/Active-insurance-company-appointments-for-agents-a/bupb-23s9',
        role: 'state_appointing_entity_naic_id_company_or_group',
        note: 'TDI NAIC ID is official TX appointing identifier for a company or group. Validated against NAIC LOC before legal-insurer resolution.',
      },
      {
        id: 'massachusetts_doi_licensed_companies',
        authority: 'Massachusetts Division of Insurance',
        role: 'state_licensed_company_naic_supplement',
        note: 'Fail-closed as agencies. Used only as a NAIC CoCode observation source when the file is present.',
      },
      {
        id: 'cms_medicare_contract_org',
        authority: 'Centers for Medicare & Medicaid Services',
        role: 'plan_contract_organization_not_forced_to_legal_insurer',
      },
      {
        id: 'curated_consumer_brand_registry',
        authority: 'InsuranceTrustHub product registry (not a regulator)',
        role: 'consumer_brand_candidates_review_required',
        count: curatedBrandCount(),
      },
    ],
    excluded: [
      'NIPR (restricted/commercial)',
      'AM Best commercial identity',
      'Name similarity merge',
      'Florida OIR market intelligence / FL-INS-000+',
    ],
  };

  let productionCarriers: Awaited<ReturnType<typeof pageCarriers>> = [];
  let productionError: string | null = null;
  try {
    const { url, serviceRoleKey } = requireSupabaseOpsEnv();
    const sb = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    console.log('Paging production carrier entities');
    productionCarriers = await pageCarriers(sb);
  } catch (e) {
    productionError = e instanceof Error ? e.message : String(e);
    console.log(`Production census skipped: ${productionError}`);
  }

  const fl = productionCarriers.filter((r) =>
    String(r.provisional_key || '').startsWith('carrier:fl-dfs:')
  );
  const tx = productionCarriers.filter((r) =>
    String(r.provisional_key || '').startsWith('carrier:tx-tdi-naic:')
  );
  const otherCarriers = productionCarriers.filter((r) => {
    const k = String(r.provisional_key || '');
    return k && !k.startsWith('carrier:fl-dfs:') && !k.startsWith('carrier:tx-tdi-naic:');
  });

  const flClass = {
    total: fl.length,
    unresolved: 0,
    reviewRequiredDigitCoincidence: 0,
    coincidentalCoCodes: [] as string[],
  };
  for (const row of fl) {
    const parsed = parseAppointingEntityKey(String(row.provisional_key || ''));
    const m = classifyFlAppointingToNational({
      appointingEntityNumber: parsed.raw,
      officialCoCodes: coSet,
    });
    if (m.confidence === 'REVIEW_REQUIRED') {
      flClass.reviewRequiredDigitCoincidence += 1;
      if (m.coincidentalCoCode) flClass.coincidentalCoCodes.push(m.coincidentalCoCode);
    } else {
      flClass.unresolved += 1;
    }
  }
  flClass.coincidentalCoCodes.sort();

  const txClass = {
    total: tx.length,
    confirmedLegalInsurer: 0,
    confirmedGroup: 0,
    highConfidence: 0,
    reviewRequired: 0,
    unresolved: 0,
    length: { four: 0, five: 0, six: 0, other: 0 },
    unmatchedIds: [] as string[],
    collisions: [] as string[],
  };
  for (const row of tx) {
    const parsed = parseAppointingEntityKey(String(row.provisional_key || ''));
    const raw = parsed.raw;
    if (raw.length === 4) txClass.length.four += 1;
    else if (raw.length === 5) txClass.length.five += 1;
    else if (raw.length === 6) txClass.length.six += 1;
    else txClass.length.other += 1;
    const m = classifyTxAppointingToNational({
      txNaicId: raw,
      officialCoCodes: coSet,
      officialGroupCodes: groupSet,
    });
    if (m.confidence === 'CONFIRMED' && m.targetKind === 'legal_insurer') {
      txClass.confirmedLegalInsurer += 1;
    } else if (m.confidence === 'CONFIRMED' && m.targetKind === 'insurance_group') {
      txClass.confirmedGroup += 1;
    } else if (m.confidence === 'HIGH_CONFIDENCE') {
      txClass.highConfidence += 1;
    } else if (m.confidence === 'REVIEW_REQUIRED') {
      txClass.reviewRequired += 1;
      txClass.collisions.push(raw);
    } else {
      txClass.unresolved += 1;
      txClass.unmatchedIds.push(raw);
    }
  }
  txClass.unmatchedIds.sort();
  txClass.collisions.sort();

  const txCsvPath = findTxCsv();
  let txSource: Awaited<ReturnType<typeof streamTxAppointing>> | null = null;
  if (txCsvPath) {
    console.log(`Streaming TX appointments ${txCsvPath}`);
    txSource = await streamTxAppointing(txCsvPath);
  }

  const maPath = findMaLicensedCompanies();
  const maLicensed = maPath ? parseMaLicensed(maPath) : null;

  const cmsPath = join(ROOT, 'lib/insurance/cms/data/complaint-rankings.json');
  const cms = {
    exactNaic: 0,
    organizationNameOnly: 0,
    brandOnly: 0,
    unresolved: 0,
    distinctOrgNames: 0,
    distinctContracts: 0,
    sampleBrand: [] as Array<{ name: string; slug: string; contractId: string | null }>,
  };
  if (existsSync(cmsPath)) {
    const payload = JSON.parse(
      (await import('fs')).readFileSync(cmsPath, 'utf8')
    ) as {
      byContractId?: Record<string, { carrierName?: string }>;
    };
    const by = payload.byContractId || {};
    const orgNames = new Set<string>();
    for (const [contractId, rec] of Object.entries(by)) {
      const name = String(rec.carrierName || '').trim();
      orgNames.add(name);
      const mapped = classifyCmsOrganization({
        contractId,
        organizationName: name,
      });
      cms.distinctContracts += 1;
      if (mapped.class === 'exact_naic') cms.exactNaic += 1;
      else if (mapped.class === 'brand_only') {
        cms.brandOnly += 1;
        if (cms.sampleBrand.length < 12 && mapped.brandSlug) {
          cms.sampleBrand.push({
            name,
            slug: mapped.brandSlug,
            contractId,
          });
        }
      } else if (mapped.class === 'organization_name_only') cms.organizationNameOnly += 1;
      else cms.unresolved += 1;
    }
    cms.distinctOrgNames = orgNames.size;
  }

  const brands = CARRIER_REGISTRY.map((b) => ({
    slug: b.slug,
    displayName: b.displayName,
    provisionalKey: consumerBrandProvisionalKey(b.slug),
    confidence: 'REVIEW_REQUIRED' as const,
    reason: 'curated_consumer_brand_not_legal_insurer',
    legalInsurerMappings: [] as string[],
  }));

  const qa = buildQa(listing, legal, groups, coSet, groupSet);

  const identityCounts = {
    CONFIRMED:
      legal.filter((e) => e.identityConfidence === 'CONFIRMED').length +
      groups.filter((e) => e.identityConfidence === 'CONFIRMED').length +
      txClass.confirmedLegalInsurer +
      txClass.confirmedGroup,
    HIGH_CONFIDENCE: txClass.highConfidence,
    REVIEW_REQUIRED:
      legal.filter((e) => e.identityConfidence === 'REVIEW_REQUIRED').length +
      flClass.reviewRequiredDigitCoincidence +
      txClass.reviewRequired +
      brands.length,
    UNRESOLVED: flClass.unresolved + txClass.unresolved,
  };

  const predicted = {
    entities: {
      legalInsurer: legal.length,
      insuranceGroup: groups.length,
      consumerBrand: brands.length,
      flAppointingExisting: fl.length,
      txAppointingExisting: tx.length,
      otherExistingCarriers: otherCarriers.length,
    },
    identifiers: {
      naicCocode: listing.distinctCoCodes.length,
      naicGroupCode: listing.distinctGroupCodes.length,
      flDfsAppointing: fl.length,
      txTdiNaicId: tx.length,
    },
    relationships: {
      memberOfGroup: listing.memberships.length,
      appointerResolvesToConfirmed:
        txClass.confirmedLegalInsurer + txClass.confirmedGroup,
      usesBrand: 0,
    },
    holds: {
      flAppointingRemainUnresolvedToLegal: fl.length,
      txUnmatched: txClass.unresolved,
      txReviewRequired: txClass.reviewRequired,
      cmsNoExactNaic: cms.exactNaic === 0,
      nameOnlyNeverConfirmed: true,
      fuzzyMerge: fuzzyMergeAllowed(),
      regulatoryEvidenceTraversalReviewRequired: mayTraverseRegulatoryEvidence(
        'REVIEW_REQUIRED'
      ),
    },
  };

  const collisionCensus = {
    task: TASK,
    classes: {
      sameCoCodeConflictingNames: listing.collisions.sameCoCodeConflictingNames.length,
      groupCodeEqualsCoCode: listing.collisions.groupCodeEqualsCoCode.length,
      duplicateGroupMemberships: listing.collisions.duplicateMemberships,
      flDfsDigitsCoincideWithCoCode: flClass.reviewRequiredDigitCoincidence,
      txIdMatchesBothCoCodeAndGroup: txClass.reviewRequired,
      txSixDigitNotCoCode: txClass.length.six,
      sameLegalNameDifferentCoCodes: countSameNameDifferentCo(listing),
      brandRegistryNotLegalInsurer: brands.length,
    },
    samples: {
      sameCoCodeConflictingNames: listing.collisions.sameCoCodeConflictingNames.slice(0, 20),
      groupCodeEqualsCoCode: listing.collisions.groupCodeEqualsCoCode.slice(0, 20),
      flDigitCoincidence: flClass.coincidentalCoCodes.slice(0, 40),
      txCollisions: txClass.collisions.slice(0, 40),
      txUnmatched: txClass.unmatchedIds.slice(0, 40),
      sameNameDifferentCoCodes: sampleSameNameDifferentCo(listing),
    },
  };

  const dryRunCanonical = {
    task: TASK,
    productionWrites: 0,
    migrationApplied: false,
    publication: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      mayPublishPerson: mayPublishEntityKind('person'),
      mayPublishAgency: mayPublishEntityKind('agency'),
      mayPublishCarrier: mayPublishEntityKind('carrier'),
      mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
      mayPublishGroup: mayPublishEntityKind('insurance_group'),
      mayPublishBrand: mayPublishEntityKind('consumer_brand'),
      publicCopy: PUBLIC_COPY,
    },
    naicListing: {
      product: NAIC_LOC_SOURCE.product,
      parserFingerprint: listing.fingerprint,
      sourceRows: listing.companies.length,
      distinctCoCodes: listing.distinctCoCodes.length,
      distinctGroupCodes: listing.distinctGroupCodes.length,
      memberships: listing.memberships.length,
      statusCounts: listing.statusCounts,
      fileCounts: listing.fileCounts,
    },
    legalInsurers: {
      sourceRows: listing.companies.length,
      distinctNaic: listing.distinctCoCodes.length,
      canonicalCandidates: legal.length,
      confirmed: legal.filter((e) => e.identityConfidence === 'CONFIRMED').length,
      reviewRequired: legal.filter((e) => e.identityConfidence === 'REVIEW_REQUIRED').length,
      collisions: listing.collisions.sameCoCodeConflictingNames.length,
    },
    insuranceGroups: {
      groups: groups.length,
      withMembers: groups.filter((g) => g.memberCount > 0).length,
      memberships: listing.memberships.length,
    },
    consumerBrands: {
      brands: brands.length,
      confidence: 'REVIEW_REQUIRED',
      legalInsurerMappingsForced: 0,
    },
    flDfs: flClass,
    txTdi: {
      productionEntities: txClass,
      sourceCsv: txSource
        ? {
            path: txSource.path,
            rows: txSource.rows,
            missingNaic: txSource.missingNaic,
            distinctIds: txSource.distinct.size,
          }
        : null,
    },
    maLicensedCompanies: maLicensed
      ? {
          path: maLicensed.path,
          rows: maLicensed.rows,
          distinctCoCodes: maLicensed.distinctCoCodes.length,
          overlapWithLoc: maLicensed.distinctCoCodes.filter((c) => coSet.has(c)).length,
          sample: maLicensed.sample,
          fixtureOnly: maLicensed.path.includes('fixtures'),
        }
      : { present: false },
    cms,
    identityCounts,
    predicted,
    qa,
    production: {
      carrierEntities: productionCarriers.length,
      error: productionError,
    },
    semanticSafety: {
      brandEqualsLegal: false,
      groupEqualsLegal: false,
      appointerEqualsLegalUntilResolved: false,
      flDfsEqualsNaic: false,
      txNamespaceAssumedCoCode: false,
      nameOnlyConfirmed: false,
      fuzzyMerge: false,
      regulatoryEvidenceCrossesReviewRequired: false,
    },
  };

  const dryRun = {
    ...dryRunCanonical,
    at: new Date().toISOString(),
    fingerprint: fingerprint(dryRunCanonical),
  };

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, 'ins-nat-final-002-source-manifest.json'),
    JSON.stringify({ ...sourceManifest, at: dryRun.at, fingerprint: listing.fingerprint }, null, 2)
  );
  writeFileSync(
    join(REPORT_DIR, 'ins-nat-final-002-collision-census.json'),
    JSON.stringify({ ...collisionCensus, at: dryRun.at }, null, 2)
  );
  writeFileSync(
    join(REPORT_DIR, 'ins-nat-final-002-dry-run.json'),
    JSON.stringify(dryRun, null, 2)
  );

  console.log(JSON.stringify({
    task: TASK,
    fingerprint: dryRun.fingerprint,
    legalInsurers: dryRun.legalInsurers,
    groups: dryRun.insuranceGroups.groups,
    fl: flClass,
    tx: txClass,
    cms: { exactNaic: cms.exactNaic, brandOnly: cms.brandOnly, orgName: cms.organizationNameOnly },
    productionCarriers: productionCarriers.length,
    writes: 0,
  }, null, 2));
}

function countSameNameDifferentCo(listing: ReturnType<typeof parseNaicListingDir>): number {
  const byName = new Map<string, Set<string>>();
  for (const c of listing.companies) {
    const k = c.companyName.toUpperCase();
    const set = byName.get(k) ?? new Set<string>();
    set.add(c.cocode);
    byName.set(k, set);
  }
  let n = 0;
  for (const set of byName.values()) if (set.size > 1) n += 1;
  return n;
}

function sampleSameNameDifferentCo(listing: ReturnType<typeof parseNaicListingDir>) {
  const byName = new Map<string, Set<string>>();
  for (const c of listing.companies) {
    const k = c.companyName.toUpperCase();
    const set = byName.get(k) ?? new Set<string>();
    set.add(c.cocode);
    byName.set(k, set);
  }
  const out: Array<{ name: string; cocodes: string[] }> = [];
  for (const [name, set] of byName) {
    if (set.size > 1) {
      out.push({ name, cocodes: Array.from(set).sort() });
      if (out.length >= 15) break;
    }
  }
  return out;
}

function buildQa(
  listing: ReturnType<typeof parseNaicListingDir>,
  legal: ReturnType<typeof predictedLegalInsurerEntities>,
  groups: ReturnType<typeof predictedInsuranceGroupEntities>,
  coSet: Set<string>,
  groupSet: Set<string>
) {
  const byName = (re: RegExp) =>
    listing.companies.filter((c) => re.test(c.companyName)).slice(0, 8);
  const findCo = (code: string) => legal.find((e) => e.cocode === code) ?? null;
  const findGroup = (code: string) => groups.find((g) => g.groupCode === code) ?? null;
  return {
    majorPc: byName(/STATE FARM|ALLSTATE INS CO$/),
    majorHealth: byName(/HUMANA INS CO$|AETNA BETTER HLTH|AETNA HLTH/),
    majorLife: byName(/MASSACHUSETTS MUT LIFE|METROPOLITAN LIFE|PRUDENTIAL INS CO OF AMER/),
    multiSubsidiaryBrand: {
      allstate: listing.companies.filter((c) => c.groupCode === '8').length,
      cvsAetna: listing.companies.filter((c) => c.groupCode === '1').length,
    },
    similarNamesDifferentCodes: sampleSameNameDifferentCo(listing).slice(0, 5),
    historicalOrInactive: listing.companies
      .filter((c) => c.statusCode === '4' || c.statusCode === '6' || c.statusCode === '0')
      .slice(0, 8)
      .map((c) => ({
        cocode: c.cocode,
        name: c.companyName,
        status: c.statusLabel,
      })),
    floridaAppointerNotNaic: classifyFlAppointingToNational({
      appointingEntityNumber: '02932',
      officialCoCodes: coSet,
    }),
    texasAppointer: classifyTxAppointingToNational({
      txNaicId: '60488',
      officialCoCodes: coSet,
      officialGroupCodes: groupSet,
    }),
    brandHumana: matchCarrierByReportedName('Humana Insurance Company'),
    groupCvs: findGroup('1'),
    allstateInsCo: findCo('19232'),
    allstateIndemnity: findCo('19240'),
    distinctLegalNotCollapsed:
      findCo('19232')?.provisionalKey !== findCo('19240')?.provisionalKey,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
