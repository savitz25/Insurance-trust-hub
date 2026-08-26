/**
 * Apply the classification overlay to a source credential and roll up to entities.
 * Does not mutate source evidence. Does not write the graph.
 */

import { mapSourceStatus } from '../freshness';
import { normalizeNpn } from '../npn';
import type { IdentityConfidence, NationalEntityKind, RegulatoryStatus } from '../types';
import { lookupClassification, normalizeRawType } from './registry';
import { coreEligibleFromMatches, pickPrimaryProductClass, strongestConfidence } from './taxonomy';
import type {
  ClassificationInput,
  ClassifiedCredential,
  EntityClassification,
  SourceEvidenceSnapshot,
} from './types';
import { CLASSIFICATION_REGISTRY_VERSION } from './types';

const CURRENT_STATUSES = new Set<RegulatoryStatus>(['active']);
const NOT_CURRENT_STATUSES = new Set<RegulatoryStatus>([
  'inactive',
  'expired',
  'suspended',
  'revoked',
  'cancelled',
]);

export function snapshotSourceEvidence(input: ClassificationInput): SourceEvidenceSnapshot {
  const types = (input.licenseTypes ?? []).map((t) => String(t)).filter(Boolean);
  const loas = (input.loas ?? []).map((l) => l.officialText).filter(Boolean);
  return {
    licenseClass: input.licenseClass ?? null,
    licenseTypes: types.slice(),
    loaOfficialTexts: loas.slice(),
  };
}

export function collectRawTypes(input: ClassificationInput): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string | null | undefined) => {
    const s = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!s) return;
    const k = normalizeRawType(s);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(s);
  };
  add(input.licenseClass);
  for (const t of input.licenseTypes ?? []) add(t);
  for (const l of input.loas ?? []) add(l.officialText);
  return out;
}

export function credentialIsCurrent(status: RegulatoryStatus | 'missing'): boolean | null {
  if (status === 'missing' || status === 'unknown') return null;
  if (CURRENT_STATUSES.has(status)) return true;
  if (NOT_CURRENT_STATUSES.has(status)) return false;
  return null;
}

export function classifyCredential(input: ClassificationInput): ClassifiedCredential {
  const evidence = snapshotSourceEvidence(input);
  const rawTypes = collectRawTypes(input);
  const jurisdiction = String(input.jurisdiction || '').trim().toUpperCase().slice(0, 2);
  const sourceDataset = String(input.sourceDataset || '').trim();

  const signals = rawTypes.length > 0 ? rawTypes : [''];
  const matches = signals.map((raw) =>
    lookupClassification({
      jurisdiction,
      sourceDataset,
      rawType: raw,
    })
  );

  const productClasses = Array.from(new Set(matches.map((m) => m.productClass)));
  const primaryProductClass = pickPrimaryProductClass(productClasses);
  const coreAgencyEligible = coreEligibleFromMatches(matches);
  const classificationUnknown =
    productClasses.length === 0 ||
    (productClasses.length === 1 && productClasses[0] === 'unknown') ||
    matches.every((m) => m.denominatorEligibility === 'unknown_pending_classification');

  let status: RegulatoryStatus | 'missing' = 'missing';
  if (input.regulatoryStatus != null && String(input.regulatoryStatus).trim() !== '') {
    status = mapSourceStatus(input.regulatoryStatus);
  }

  return {
    registryVersion: CLASSIFICATION_REGISTRY_VERSION,
    jurisdiction,
    sourceDataset,
    sourceRecordId: input.sourceRecordId,
    licenseNumber: String(input.licenseNumber || ''),
    entityKind: input.entityKind,
    npn: normalizeNpn(input.npn),
    legalName: String(input.legalName || ''),
    rawTypesPreserved: rawTypes,
    evidence,
    matches,
    productClasses,
    primaryProductClass: coreAgencyEligible ? 'core_agency' : primaryProductClass,
    insuranceRoles: Array.from(new Set(matches.map((m) => m.insuranceRole))),
    licenseNamespaces: Array.from(new Set(matches.map((m) => m.licenseNamespace))),
    coreAgencyEligible,
    confidence: strongestConfidence(matches.map((m) => m.confidence)),
    classificationUnknown,
    current: credentialIsCurrent(status),
    regulatoryStatus: status,
    published: Boolean(input.published),
  };
}

export function identityKeyFor(input: {
  npn?: string | null;
  sourceDataset: string;
  jurisdiction: string;
  entityKind: NationalEntityKind;
  licenseNumber: string;
}): { identityKind: 'npn' | 'provisional'; key: string; npn: string | null } {
  const npn = normalizeNpn(input.npn);
  if (npn) return { identityKind: 'npn', key: `npn:${input.entityKind}:${npn}`, npn };
  const jur = String(input.jurisdiction || '').trim().toUpperCase().slice(0, 2);
  const lic = String(input.licenseNumber || '').trim().toUpperCase().replace(/\s+/g, '');
  return {
    identityKind: 'provisional',
    key: `prov:${input.sourceDataset}:${jur}:${input.entityKind}:${lic}`,
    npn: null,
  };
}

export function rollupEntityClassification(
  identityKey: string,
  identityKind: 'npn' | 'provisional',
  npn: string | null,
  credentials: ClassifiedCredential[],
  identityConfidence: IdentityConfidence = identityKind === 'npn' ? 'CONFIRMED' : 'HIGH_CONFIDENCE'
): EntityClassification {
  const productClasses = Array.from(new Set(credentials.flatMap((c) => c.productClasses)));
  const coreAgencyEligible = credentials.some((c) => c.coreAgencyEligible);
  const primaryProductClass = coreAgencyEligible
    ? 'core_agency'
    : pickPrimaryProductClass(productClasses);
  const classificationUnknown = credentials.every((c) => c.classificationUnknown);
  const jurisdictions = Array.from(new Set(credentials.map((c) => c.jurisdiction))).sort();
  const currents = credentials.filter((c) => c.coreAgencyEligible).map((c) => c.current);
  let currentCoreAgency: boolean | null = null;
  if (coreAgencyEligible) {
    if (currents.some((c) => c === true)) currentCoreAgency = true;
    else if (currents.length > 0 && currents.every((c) => c === false)) currentCoreAgency = false;
    else currentCoreAgency = null;
  } else {
    currentCoreAgency = false;
  }

  return {
    identityKey,
    identityKind,
    identityConfidence,
    npn,
    entityKind: credentials[0]?.entityKind ?? 'agency',
    legalName: credentials[0]?.legalName ?? '',
    credentialCount: credentials.length,
    jurisdictions,
    productClasses,
    primaryProductClass,
    coreAgencyEligible,
    currentCoreAgency,
    classificationUnknown,
    mixedCredential: productClasses.length > 1,
    locationNetwork: Boolean(npn) && credentials.length >= 2,
    publishedAny: credentials.some((c) => c.published),
  };
}

export function classifyAndRollup(
  rows: ClassificationInput[],
  identityConfidenceFor?: (key: string) => IdentityConfidence
): {
  credentials: ClassifiedCredential[];
  entities: EntityClassification[];
} {
  const credentials = rows.map(classifyCredential);
  const groups = new Map<string, ClassifiedCredential[]>();
  const meta = new Map<string, { identityKind: 'npn' | 'provisional'; npn: string | null }>();
  for (const c of credentials) {
    const id = identityKeyFor(c);
    const list = groups.get(id.key) ?? [];
    list.push(c);
    groups.set(id.key, list);
    meta.set(id.key, { identityKind: id.identityKind, npn: id.npn });
  }
  const entities: EntityClassification[] = [];
  for (const [key, list] of groups) {
    const m = meta.get(key)!;
    const conf =
      identityConfidenceFor?.(key) ??
      (m.identityKind === 'npn' ? 'CONFIRMED' : 'HIGH_CONFIDENCE');
    entities.push(rollupEntityClassification(key, m.identityKind, m.npn, list, conf));
  }
  return { credentials, entities };
}

export type ResearchDenominators = {
  sourceRecords: number;
  credentialsMonitored: number;
  confirmedIdentities: number;
  provisionalIdentities: number;
  reviewRequiredIdentities: number;
  coreAgencyEntities: number;
  currentCoreAgencyEntities: number | null;
  currentCoreComputable: boolean;
  specialtyEntities: number;
  ancillaryEntities: number;
  claimsEntities: number;
  warrantyEntities: number;
  titleEntities: number;
  bailEntities: number;
  tpaEntities: number;
  outOfScopeEntities: number;
  unknownEntities: number;
  multiStateCoreAgencies: number;
  coreAgencyCredentials: number;
  definitions: Record<string, string>;
};

export function researchDenominators(
  credentials: ClassifiedCredential[],
  entities: EntityClassification[]
): ResearchDenominators {
  const currentKnown = entities
    .filter((e) => e.coreAgencyEligible)
    .every((e) => e.currentCoreAgency !== null);
  const currentCore = entities.filter((e) => e.currentCoreAgency === true).length;

  const byPrimary = (p: EntityClassification['primaryProductClass']) =>
    entities.filter((e) => e.primaryProductClass === p && !e.classificationUnknown).length;

  return {
    sourceRecords: credentials.length,
    credentialsMonitored: credentials.length,
    confirmedIdentities: entities.filter((e) => e.identityKind === 'npn').length,
    provisionalIdentities: entities.filter((e) => e.identityKind === 'provisional').length,
    reviewRequiredIdentities: entities.filter((e) => e.identityConfidence === 'REVIEW_REQUIRED')
      .length,
    coreAgencyEntities: entities.filter((e) => e.coreAgencyEligible).length,
    currentCoreAgencyEntities: currentKnown ? currentCore : null,
    currentCoreComputable: currentKnown,
    specialtyEntities: byPrimary('specialty_insurance'),
    ancillaryEntities: byPrimary('ancillary_distribution'),
    claimsEntities: byPrimary('claims_service'),
    warrantyEntities: byPrimary('warranty_service'),
    titleEntities: byPrimary('title'),
    bailEntities: byPrimary('bail'),
    tpaEntities: byPrimary('tpa'),
    outOfScopeEntities: byPrimary('out_of_scope'),
    unknownEntities: entities.filter((e) => e.classificationUnknown).length,
    multiStateCoreAgencies: entities.filter(
      (e) => e.coreAgencyEligible && e.jurisdictions.length >= 2
    ).length,
    coreAgencyCredentials: credentials.filter((c) => c.coreAgencyEligible).length,
    definitions: DENOMINATOR_DEFINITIONS,
  };
}

export const DENOMINATOR_DEFINITIONS: Record<string, string> = {
  sourceRecords:
    'Count of official source rows observed in the current extracts. Not agencies.',
  credentialsMonitored:
    'Count of state license credentials. In the current extracts this equals source records (one license row per credential). Not unique entities.',
  confirmedIdentities:
    'Distinct valid NPNs for agency-kind rows. One NPN = one national identity even with many location licenses.',
  provisionalIdentities:
    'Source-clear agency rows with no valid NPN. Never merged by name/address. NV and MS currently fall here even when role is classified.',
  reviewRequiredIdentities:
    'Identities whose graph identity confidence is REVIEW_REQUIRED (name/NPN conflict). Not a license-class label.',
  coreAgencyEntities:
    'Distinct identities (confirmed NPN or provisional key) with at least one CONFIRMED/HIGH_CONFIDENCE core-agency credential. Mixed specialty credentials do not add a second entity.',
  currentCoreAgencyEntities:
    'Core-agency identities with at least one currently active core credential. Null when regulator status is missing on those credentials.',
  specialtyEntities:
    'Identities whose primary product class is specialty_insurance and that are not core-agency eligible.',
  ancillaryEntities:
    'Identities whose primary product class is ancillary_distribution (limited lines / motor club / similar) and that are not core-agency eligible.',
  claimsEntities:
    'Identities whose primary product class is claims_service (adjusters) and that are not core-agency eligible.',
  warrantyEntities:
    'Identities whose primary product class is warranty_service and that are not core-agency eligible.',
  titleEntities:
    'Identities whose primary product class is title and that are not core-agency eligible.',
  bailEntities:
    'Identities whose primary product class is bail and that are not core-agency eligible.',
  unknownEntities:
    'Identities where every credential is unknown_pending_classification (Ohio empty class is the main case).',
  multiStateCoreAgencies:
    'Core-agency identities observed in two or more jurisdictions in the current extracts. Not a complete national multi-state census.',
  coreAgencyCredentials:
    'Credential rows that themselves classify as core-agency eligible. Greater than coreAgencyEntities when location networks exist.',
  researchVsPublication:
    'Research denominators ignore public.providers publication, verified flags, and directory chips.',
};
