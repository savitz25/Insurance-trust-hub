/**
 * INS-INSURER-006 — public legal-insurer profile pilot for the locked 26.
 * Does not flip mayPublishEntityKind('legal_insurer').
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ATTACHMENT_METHOD,
  INS_INSURER_005B_COHORT_FINGERPRINT,
  PUBLIC_EXAM_COPY,
  type ExamAttachmentMethod,
} from './legal-insurer-exam-ingest';
import { searchLegalInsurers, insurerSearchUsesForbiddenSignal } from './legal-insurer-search';
import type { LegalInsurerExaminationReportV1, LegalInsurerProfileV1 } from './legal-insurer-profile';
import { LEGAL_INSURER_PROFILE_VERSION } from './legal-insurer-profile';

export const INS_INSURER_006_WAVE1_SIZE = 26;
export const INS_INSURER_006_PROFILE_SITEMAP_DELTA = 26;
export const INS_INSURER_006_LANDING_SITEMAP = 1;
export const INS_INSURER_006_IDENTITY_WRITES = 0;
export const INS_INSURER_006_EVIDENCE_WRITES = 0;
export const INS_INSURER_006_ROUTE = '/insurers' as const;

export const PILOT_LANDING_H1 = 'Research legal insurance companies';
export const PILOT_SIZE_COPY =
  'InsuranceTrustHub currently publishes 26 legal-insurer research profiles that meet the current evidence-publication standard.';
export const UNPUBLISHED_COPY =
  'We do not currently publish a legal-insurer research profile for this company.';
export const UNPUBLISHED_EXISTS_COPY =
  'InsuranceTrustHub has not yet established sufficient public evidence for a published research profile.';
export const WHAT_THIS_MEANS =
  'A regulatory examination is a regulator review of specified company practices, operations or financial condition, depending on the examination type. InsuranceTrustHub is showing the official record connected to this exact legal insurer.';
export const WHAT_THIS_DOES_NOT_MEAN = [
  PUBLIC_EXAM_COPY.notMisconduct,
  'InsuranceTrustHub does not recommend or rank this insurer.',
  'PUBLIC_READY is an internal publication status. It is not a quality, safety, or approval badge.',
] as const;
export const ABSENCE_NOT_NEVER_EXAMINED = PUBLIC_EXAM_COPY.absence;
export const LEGAL_INSURER_NOT_BRAND =
  'A legal insurer is a specific regulated insurance company identified by an NAIC company code. It may participate in a larger brand, group or parent organization. It is not the same as a consumer brand, NAIC group, appointing carrier row, or Marketplace organization.';

const SLUG_ABBREV: Record<string, string> = {
  INS: 'insurance',
  EXCH: 'exchange',
  CO: 'company',
  COS: 'companies',
  CORP: 'corporation',
  NATL: 'national',
  PROP: 'property',
  CAS: 'casualty',
  REINS: 'reinsurance',
};

export type CohortInsurer = {
  entity_id: string;
  canonical_legal_name: string;
  naic_cocode: string;
  examination_count: number;
  examination_families: string[];
  regulator: string[];
  jurisdiction: string[];
  report_dates: string[];
  official_source_urls: string[];
  document_hashes: string[];
  public_safe_status: string;
};

type CohortFile = {
  fingerprint: string;
  cohort_size: number;
  insurers: CohortInsurer[];
};

export type PublishedInsurer = CohortInsurer & {
  slug: string;
  baseSlug: string;
  usedNaicDisambiguation: boolean;
};

export type SlugAudit = {
  n: number;
  baseSlugCollisions: string[];
  resolvedSlugCollisions: string[];
  duplicateUrlCount: number;
};

function rootDir(): string {
  return process.cwd();
}

function loadCohort(): CohortFile {
  const raw = JSON.parse(
    readFileSync(join(rootDir(), 'data/reports/ins-insurer-005b-public-ready-cohort.json'), 'utf8')
  ) as CohortFile;
  if (raw.fingerprint !== INS_INSURER_005B_COHORT_FINGERPRINT) {
    throw new Error('locked cohort fingerprint mismatch');
  }
  if (raw.cohort_size !== 26 || raw.insurers.length !== 26) {
    throw new Error('locked cohort is not 26');
  }
  return raw;
}

function loadIdentityIndex(): Array<{ naic_cocode: string; legal_name: string }> {
  const raw = JSON.parse(
    readFileSync(join(rootDir(), 'data/reports/ins-insurer-006-identity-index.json'), 'utf8')
  ) as { insurers: Array<{ naic_cocode: string; legal_name: string }> };
  return raw.insurers;
}

export function slugifyLegalName(legalName: string): string {
  const expanded = legalName
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .map((t) => SLUG_ABBREV[t] || t.toLowerCase())
    .join(' ');
  return expanded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildPublished(cohort: CohortFile): { published: PublishedInsurer[]; audit: SlugAudit } {
  const bases = cohort.insurers.map((row) => ({ row, base: slugifyLegalName(row.canonical_legal_name) }));
  const baseCounts = new Map<string, number>();
  for (const b of bases) baseCounts.set(b.base, (baseCounts.get(b.base) || 0) + 1);
  const published: PublishedInsurer[] = bases.map(({ row, base }) => {
    const collide = (baseCounts.get(base) || 0) > 1;
    return {
      ...row,
      baseSlug: base,
      slug: collide ? `${base}-${row.naic_cocode}` : base,
      usedNaicDisambiguation: collide,
    };
  });
  const slugCounts = new Map<string, number>();
  for (const p of published) slugCounts.set(p.slug, (slugCounts.get(p.slug) || 0) + 1);
  const audit: SlugAudit = {
    n: published.length,
    baseSlugCollisions: [...baseCounts.entries()].filter(([, n]) => n > 1).map(([s]) => s),
    resolvedSlugCollisions: [...slugCounts.entries()].filter(([, n]) => n > 1).map(([s]) => s),
    duplicateUrlCount: [...slugCounts.values()].filter((n) => n > 1).length,
  };
  return { published, audit };
}

const COHORT = loadCohort();
const BUILT = buildPublished(COHORT);
export const PUBLISHED_INSURERS: readonly PublishedInsurer[] = BUILT.published;
export const SLUG_AUDIT: SlugAudit = BUILT.audit;
const BY_SLUG = new Map(PUBLISHED_INSURERS.map((p) => [p.slug, p]));
const BY_ID = new Map(PUBLISHED_INSURERS.map((p) => [p.entity_id, p]));
const BY_NAIC = new Map(PUBLISHED_INSURERS.map((p) => [p.naic_cocode, p]));
const PUBLISHED_NAICS = new Set(PUBLISHED_INSURERS.map((p) => p.naic_cocode));
const IDENTITY_INDEX = loadIdentityIndex();

export function listPublishedInsurers(): readonly PublishedInsurer[] {
  return PUBLISHED_INSURERS;
}

export function getPublishedBySlug(slug: string): PublishedInsurer | null {
  return BY_SLUG.get(slug) || null;
}

export function getPublishedByNaic(naic: string): PublishedInsurer | null {
  return BY_NAIC.get(naic) || null;
}

export function insurerProfilePath(slug: string): string {
  return `${INS_INSURER_006_ROUTE}/${slug}`;
}

export function publishedProfileSitemapPaths(): string[] {
  return PUBLISHED_INSURERS.map((p) => insurerProfilePath(p.slug));
}

export function mayPublishLegalInsurerPilot(input: {
  entityKind?: string;
  entityId?: string | null;
  naicCocode?: string | null;
}): boolean {
  if (input.entityKind && input.entityKind !== 'legal_insurer') return false;
  const row = input.entityId ? BY_ID.get(input.entityId) : input.naicCocode ? BY_NAIC.get(input.naicCocode) : null;
  if (!row) return false;
  if (!row.naic_cocode || !/^\d{5}$/.test(row.naic_cocode)) return false;
  if (row.public_safe_status !== 'PUBLIC_SAFE') return false;
  if (row.examination_count < 1) return false;
  return true;
}

export function examTypeLabel(family: string): string {
  if (family === 'FINANCIAL_EXAMINATION') return 'Financial Examination Report';
  if (family === 'MARKET_CONDUCT_EXAMINATION') return 'Market Conduct Examination Report';
  return 'Examination Report';
}

export function factualExamCopy(family: string): string {
  if (family === 'FINANCIAL_EXAMINATION') return PUBLIC_EXAM_COPY.caFinancial;
  if (family === 'MARKET_CONDUCT_EXAMINATION') return PUBLIC_EXAM_COPY.flMarketConduct;
  return 'A regulator published an examination report for this legal insurer.';
}

function attachmentFor(family: string): ExamAttachmentMethod {
  if (family === 'FINANCIAL_EXAMINATION') return ATTACHMENT_METHOD.PDF_NATIVE_COCODE_EXPLICIT_CONSOLIDATED_SCOPE;
  return ATTACHMENT_METHOD.PDF_NATIVE_COCODE_EXPLICIT_SUBJECT;
}

function retrievedAt(jurisdiction: string): string {
  return jurisdiction === 'CA' ? '2026-08-29T20:40:00Z' : '2026-08-29T21:30:00Z';
}

export function publishedExamCountCopy(n: number): string {
  const noun = n === 1 ? 'examination report' : 'examination reports';
  return `InsuranceTrustHub currently has ${n} published ${noun} attached to this legal insurer from the source families and coverage described below.`;
}

export function buildPilotProfile(row: PublishedInsurer): LegalInsurerProfileV1 {
  const reports: LegalInsurerExaminationReportV1[] = row.examination_families.map((family, i) => ({
    regulator: row.regulator[Math.min(i, row.regulator.length - 1)] || row.regulator[0] || '',
    examType: family as LegalInsurerExaminationReportV1['examType'],
    reportDate: row.report_dates[Math.min(i, row.report_dates.length - 1)] || row.report_dates[0] || null,
    officialSource: row.official_source_urls[Math.min(i, row.official_source_urls.length - 1)] || row.official_source_urls[0] || '',
    documentUrl: row.official_source_urls[Math.min(i, row.official_source_urls.length - 1)] || null,
    documentHash: row.document_hashes[Math.min(i, row.document_hashes.length - 1)] || null,
    attachmentMethod: attachmentFor(family),
    publicSafe: true,
    limitations: [PUBLIC_EXAM_COPY.notMisconduct, ABSENCE_NOT_NEVER_EXAMINED],
  }));
  const retrieved = retrievedAt(row.jurisdiction[0] || 'FL');
  return {
    version: LEGAL_INSURER_PROFILE_VERSION,
    entityId: row.entity_id,
    slug: row.slug,
    legalName: row.canonical_legal_name,
    naicCode: row.naic_cocode,
    domicile: null,
    identifiers: [{ scheme: 'naic_cocode', value: row.naic_cocode, confidence: 'CONFIRMED' }],
    credentialEvidence: [],
    regulatoryEvidence: [],
    examinationReports: reports,
    marketplaceEvidence: [],
    federalEvidence: [],
    sourceClocks: reports.map((r, i) => ({
      id: `exam-${i + 1}`,
      family: r.examType,
      source: r.regulator,
      sourceDataset:
        r.examType === 'FINANCIAL_EXAMINATION'
          ? 'california_cdi_financial_exams'
          : 'florida_oir_market_conduct_exams',
      sourceIdentifier: row.naic_cocode,
      observedAt: r.reportDate,
      retrievedAt: retrieved,
      attachmentMethod: r.attachmentMethod,
      limitation: ABSENCE_NOT_NEVER_EXAMINED,
    })),
    limitations: [
      'InsuranceTrustHub currently publishes only examination families that pass exact identity and public-evidence gates.',
      'Source coverage is not a complete history of every regulator or every examination.',
      'Some documents cannot yet be attached deterministically.',
      'Missing evidence does not imply a clean or problem-free record.',
      'TDI complaint indexes are not part of this public profile.',
      LEGAL_INSURER_NOT_BRAND,
    ],
    whatThisDoesNotMean: [...WHAT_THIS_DOES_NOT_MEAN],
    traceability: 'Trace This Record',
    score: null,
    recommendation: null,
    trustRating: null,
    enforcementScore: null,
    complaintScore: null,
  };
}

export function searchPublishedInsurers(query: string) {
  return searchLegalInsurers(
    query,
    PUBLISHED_INSURERS.map((p) => ({
      entityId: p.entity_id,
      legalName: p.canonical_legal_name,
      naicCode: p.naic_cocode,
      domicile: null,
    }))
  ).map((hit) => {
    const row = BY_ID.get(hit.entityId)!;
    return { ...hit, slug: row.slug, published: true as const };
  });
}

export function findUnpublishedIdentity(query: string): {
  legalName: string;
  naicCocode: string;
} | null {
  const hits = searchLegalInsurers(
    query,
    IDENTITY_INDEX.map((r) => ({
      entityId: r.naic_cocode,
      legalName: r.legal_name,
      naicCode: r.naic_cocode,
      domicile: null,
    }))
  ).filter((h) => h.naicCode && !PUBLISHED_NAICS.has(h.naicCode) && (h.match === 'exact_naic' || h.match === 'exact_legal_name' || h.match === 'normalized_legal_name'));
  const first = hits[0];
  if (!first?.naicCode) return null;
  return { legalName: first.legalName, naicCocode: first.naicCode };
}

export function publicSearchForbidden(signal: string): boolean {
  return insurerSearchUsesForbiddenSignal(signal) || /exam count|finding|review|complaint/i.test(signal);
}

export function attachmentConsumerCopy(method: string): string {
  if (method === ATTACHMENT_METHOD.PDF_NATIVE_COCODE_EXPLICIT_CONSOLIDATED_SCOPE) {
    return 'Matched because the official report explicitly identifies this legal insurer as one of the examination subjects.';
  }
  return 'Matched using the NAIC company code stated in the official examination record.';
}

export function seoTitle(legalName: string, naic: string): string {
  return `${legalName} — NAIC ${naic} Regulatory Research | InsuranceTrustHub`;
}

export function seoDescription(legalName: string): string {
  return `Research ${legalName}'s exact NAIC identity and public regulatory examination records with source provenance and limitations.`;
}

export function qualityBadgeForbidden(text: string): boolean {
  return /verified insurer|trusted insurer|approved|safe insurer|clean record|passed review|public_ready/i.test(
    text
  );
}
