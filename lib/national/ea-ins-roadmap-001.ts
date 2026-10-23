/**
 * EA-INS-ROADMAP-001 loader.
 * Dry-run unless the caller passes write: true. Count and hash checks fail closed.
 * Held rows are review-queue payloads with publication_allowed false.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertNoContactFields,
  buildCmsContractHistory,
  sha256Canonical,
  type CmsActionSource,
  type CmsContractHistoryRow,
} from './cms-part-cd-action-builder';

export const EA_INS_ROADMAP_001 = 'EA-INS-ROADMAP-001';

export const FIXTURE_DIR = 'data/fixtures/ea-ins-roadmap-001';
export const STATIC_CMS_FILES = [
  'lib/insurance/cms/data/complaint-rankings.json',
  'lib/insurance/cms/data/county-summaries.json',
] as const;

export const SOURCE = {
  marketConduct: 'NJ_DOBI_MARKET_CONDUCT',
  surplusLines: 'NJ_DOBI_SURPLUS_LINES_2026_09_16',
  mlr: 'CMS_MLR_2024_HIOS_NAIC',
  cmsActions: 'CMS_PART_CD_CAP_WARNING',
} as const;

export const TABLE = {
  review: 'insurance_review_queue',
  bridges: 'insurance_identifier_bridges',
  roster: 'insurance_source_roster_rows',
  cmsActions: 'insurance_cms_contract_actions',
} as const;

/** NAIC printed twice, once for Tudor and once for United National. */
export const QUARANTINE_NAIC = '13064';
/** Exact five-digit NAIC on the 9/16 list with no national_entities row in the dry run. */
export const SURPLUS_NAIC_NOT_IN_DB = '18711';

export const FIXTURE_SHA256 = {
  'q1nj_rows.json': '77a5bc46aba0bd4e2aab60819b7c3e51aade93ad336b0f42cadb0765c801fad5',
  'q2_surplus_lines_rows.json': 'c7dbd59f9a9c248e89276ff147c4905adb53feec9950c34c5fa85e6cdd87a35b',
  'q3_mlr_bridge_dryrun.csv': 'bfbda4558d1b439e01067dbc29dd829c57a1ea60c6ffe23d9ea31028f1996150',
  'q4_cms_actions_rows.json': '25d1c9f1f2eea5eda9634689aae117d92d3d02ec30f8bd2bd4f517d5ce48b2d6',
  'q4_contract_history.csv': '43b2a837cf77d50c24c8a7156d59cf62eb0922b4228e02735008a8c437ffb6f8',
} as const;

export const EXPECTED = {
  marketConduct: {
    sourceRows: 93,
    loadExact: 0,
    held: 93,
    textNoNaic: 46,
    imageOnlyNoNaic: 7,
    multiEntity: 25,
    ocrSingleUnverified: 13,
    source404: 1,
    geicoActions: 1,
    geicoNaics: 5,
  },
  surplusLines: {
    sourceRows: 314,
    foreign: 214,
    domestic: 5,
    alien: 95,
    naicRows: 219,
    naicUnique: 218,
    loadExactNaic: 216,
    quarantine13064Rows: 2,
    notInDb: 1,
    hyphenNormalizedReview: 3,
    alienNotLoaded: 92,
  },
  mlr: {
    sourceRows: 1710,
    loadExact: 1662,
    blankNaic: 42,
    unresolvedNaic: 6,
    oneToMany: 0,
  },
  cms: {
    actions: 680,
    cap: 485,
    warningLetters: 195,
    links: 844,
    contracts: 515,
    repoStaticContracts: 32,
    repoStaticLinks: 42,
  },
  reviewQueue: 147,
} as const;

const GEICO_NAICS = ['14137', '14139', '22055', '22063', '41491'] as const;
const GEICO_HOLD = 'HELD_ONE_ACTION_MULTI_ENTITY_GEICO_10_20_2026';

export class EaInsRoadmapClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EaInsRoadmapClosedError';
  }
}

export function writesEnabled(argv: readonly string[]): boolean {
  return argv.includes('--write');
}

export type MarketConductRow = {
  row: number;
  index_name: string;
  adopted: string;
  files: string[];
  naic_candidates: string[];
  from_ocr: string[];
  missing_files: string[];
  status: string;
  hold: string | null;
};

export type SurplusRow = {
  population: string;
  id_ns: string;
  id: string;
  id_raw?: string;
  name: string;
  hold: string | null;
};

export type MlrRow = {
  mr_submission_template_id: string;
  business_state: string;
  hios_issuer_id: string;
  naic_company_code: string;
  naic_group_code: string;
  status: string;
};

export type ContractHistoryCsvRow = {
  contract_id: string;
  in_db: string;
  in_repo_static_cms_json: string;
  action_type: string;
  issue_id: string;
  date_sent: string;
  issue_type: string;
  issue_topic: string;
  all_contracts_terminated_flag: string;
  shared_with: string;
};

export type ReviewQueueRow = {
  source_dataset: string;
  source_family: string;
  review_key: string;
  hold_reason: string;
  publication_allowed: false;
  match_status: string;
  identifier_scheme: string | null;
  identifier_value: string | null;
  legal_name: string | null;
  jurisdiction: string | null;
  content_hash: string;
  raw_value: Record<string, unknown>;
};

export type BridgeRow = {
  source_dataset: string;
  bridge_key: string;
  from_scheme: 'hios_issuer_id';
  from_value: string;
  to_scheme: 'naic_cocode';
  to_value: string;
  naic_group_code: string | null;
  jurisdiction: string;
  publication_allowed: false;
  match_status: 'EXACT';
  content_hash: string;
  raw_value: Record<string, unknown>;
};

export type RosterRow = {
  source_dataset: string;
  roster_key: string;
  identifier_scheme: 'naic_cocode';
  identifier_value: string;
  population: 'foreign' | 'domestic';
  legal_name: string;
  jurisdiction: 'NJ';
  publication_allowed: false;
  match_status: 'EXACT';
  content_hash: string;
  raw_value: Record<string, unknown>;
};

export type CmsActionInsert = CmsContractHistoryRow & {
  source_dataset: string;
  content_hash: string;
};

export type RoadmapSummary = {
  marketConduct: {
    sourceRows: number;
    loadExact: number;
    held: number;
    textNoNaic: number;
    imageOnlyNoNaic: number;
    multiEntity: number;
    ocrSingleUnverified: number;
    source404: number;
    geicoActions: number;
    geicoNaics: number;
  };
  surplusLines: {
    sourceRows: number;
    foreign: number;
    domestic: number;
    alien: number;
    naicRows: number;
    naicUnique: number;
    loadExactNaic: number;
    quarantine13064Rows: number;
    notInDb: number;
    hyphenNormalizedReview: number;
    alienNotLoaded: number;
  };
  mlr: {
    sourceRows: number;
    loadExact: number;
    blankNaic: number;
    unresolvedNaic: number;
    oneToMany: number;
  };
  cms: {
    actions: number;
    cap: number;
    warningLetters: number;
    links: number;
    contracts: number;
    repoStaticContracts: number;
    repoStaticLinks: number;
  };
  reviewQueue: number;
  publicationAllowedTrue: number;
  hashesOk: true;
};

export type RoadmapPlan = {
  task: typeof EA_INS_ROADMAP_001;
  closed: true;
  summary: RoadmapSummary;
  reviewRows: ReviewQueueRow[];
  bridgeRows: BridgeRow[];
  rosterRows: RosterRow[];
  cmsRows: CmsActionInsert[];
};

type ClassifiedMarket = {
  reviewRows: ReviewQueueRow[];
  loadExact: number;
};

function fail(message: string): never {
  throw new EaInsRoadmapClosedError(message);
}

function sha256File(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function reviewRow(input: Omit<ReviewQueueRow, 'publication_allowed' | 'content_hash'>): ReviewQueueRow {
  const row: ReviewQueueRow = {
    ...input,
    publication_allowed: false,
    content_hash: '',
  };
  row.content_hash = sha256Canonical({ ...row, content_hash: undefined });
  assertNoContactFields(row);
  return row;
}

export function normalizeIsiAaId(raw: string): string {
  const normalized = raw.trim().toUpperCase().replace(/-/g, '');
  if (!/^AA\d{7}$/.test(normalized)) {
    fail(`AA id ${raw} is outside the normalized AA pattern`);
  }
  return normalized;
}

export function assertFixtureHashes(
  root: string,
  expected: Record<string, string> = FIXTURE_SHA256
): void {
  for (const [name, hash] of Object.entries(expected)) {
    const actual = sha256File(readFileSync(join(root, FIXTURE_DIR, name)));
    if (actual !== hash) {
      fail(`hash mismatch for ${name}`);
    }
  }
}

export function collectStaticCmsContractIds(root: string): Set<string> {
  const ids = new Set<string>();
  const pattern = /"contractId"\s*:\s*"([A-Z]\d{4})"/g;
  for (const relative of STATIC_CMS_FILES) {
    const text = readFileSync(join(root, relative), 'utf8');
    for (const match of text.matchAll(pattern)) ids.add(match[1]);
  }
  return ids;
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((entry) => entry.some((value) => value.length));
  if (!header) fail('csv has no header');
  return body.map((values) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = values[index] ?? '';
    });
    return record;
  });
}

export function classifyMarketConduct(rows: MarketConductRow[]): ClassifiedMarket {
  const reviewRows: ReviewQueueRow[] = [];
  let loadExact = 0;
  for (const row of rows) {
    const exactSingle =
      row.status === 'EXACT_NAIC_TEXT' &&
      !row.hold &&
      row.from_ocr.length === 0 &&
      row.naic_candidates.length === 1 &&
      /^\d{5}$/.test(row.naic_candidates[0]);
    if (exactSingle) {
      loadExact += 1;
      continue;
    }
    if (!row.hold) fail(`market-conduct row ${row.row} has no hold and is not an exact single NAIC`);
    const geico = row.hold === GEICO_HOLD;
    if (geico) {
      if (row.adopted !== '10/20/2026' || row.from_ocr.length !== 0) {
        fail('GEICO 10/20 action is missing its exact text NAIC shape');
      }
      if (row.naic_candidates.join(',') !== GEICO_NAICS.join(',')) {
        fail('GEICO 10/20 action must cover the five exact text NAICs');
      }
    }
    const ocrOnly = row.from_ocr.length > 0 || row.status === 'IMAGE_ONLY_NEEDS_OCR';
    reviewRows.push(
      reviewRow({
        source_dataset: SOURCE.marketConduct,
        source_family: 'market_conduct',
        review_key: `${SOURCE.marketConduct}:row:${row.row}`,
        hold_reason: row.hold,
        match_status: geico ? 'HELD_ONE_ACTION' : ocrOnly ? 'HELD_OCR_OR_MULTI' : 'HELD',
        identifier_scheme: geico ? 'naic_cocode' : null,
        identifier_value: null,
        legal_name: row.index_name,
        jurisdiction: 'NJ',
        raw_value: {
          adopted: row.adopted,
          files: row.files,
          missing_files: row.missing_files,
          status: row.status,
          from_ocr: row.from_ocr,
          ...(geico
            ? { action_count: 1, naic_cocodes: [...row.naic_candidates] }
            : { unverified_naic_candidates: row.naic_candidates }),
        },
      })
    );
  }
  return { reviewRows, loadExact };
}

export function classifySurplusLines(rows: SurplusRow[]): {
  reviewRows: ReviewQueueRow[];
  rosterRows: RosterRow[];
  alienNotLoaded: number;
} {
  const reviewRows: ReviewQueueRow[] = [];
  const rosterRows: RosterRow[] = [];
  let alienNotLoaded = 0;
  for (const row of rows) {
    if (row.id_ns === 'NAIC') {
      if (!/^\d{5}$/.test(row.id)) fail(`NAIC ${row.id} is outside five digits`);
      const quarantined = row.id === QUARANTINE_NAIC;
      const unresolved = row.id === SURPLUS_NAIC_NOT_IN_DB;
      if (quarantined || unresolved || row.hold) {
        reviewRows.push(
          reviewRow({
            source_dataset: SOURCE.surplusLines,
            source_family: 'surplus_lines',
            review_key: `${SOURCE.surplusLines}:NAIC:${row.id}:${row.name}`,
            hold_reason: quarantined
              ? 'DUP_PRINTED_NAIC_13064_TWO_NAMES'
              : unresolved
                ? 'UNRESOLVED_NAIC_NOT_IN_DB'
                : row.hold || 'HELD',
            match_status: quarantined ? 'QUARANTINED' : 'UNRESOLVED',
            identifier_scheme: 'naic_cocode',
            identifier_value: row.id,
            legal_name: row.name,
            jurisdiction: 'NJ',
            raw_value: { population: row.population, id_ns: row.id_ns },
          })
        );
        continue;
      }
      if (row.population !== 'foreign' && row.population !== 'domestic') {
        fail(`NAIC ${row.id} population ${row.population} is outside the exact load`);
      }
      const roster: RosterRow = {
        source_dataset: SOURCE.surplusLines,
        roster_key: `${SOURCE.surplusLines}:NAIC:${row.id}`,
        identifier_scheme: 'naic_cocode',
        identifier_value: row.id,
        population: row.population,
        legal_name: row.name,
        jurisdiction: 'NJ',
        publication_allowed: false,
        match_status: 'EXACT',
        content_hash: '',
        raw_value: { population: row.population },
      };
      roster.content_hash = sha256Canonical({ ...roster, content_hash: undefined });
      assertNoContactFields(roster);
      rosterRows.push(roster);
      continue;
    }
    if (row.id_ns !== 'ISI_AA') fail(`unknown surplus id namespace ${row.id_ns}`);
    const raw = row.id_raw ?? row.id;
    const normalized = normalizeIsiAaId(raw);
    if (normalized !== row.id) fail(`AA id ${raw} did not normalize to ${row.id}`);
    const hyphenated = raw.includes('-') || row.hold === 'ISI_ID_HYPHEN_NORMALIZED_REVIEW';
    if (hyphenated || row.hold) {
      reviewRows.push(
        reviewRow({
          source_dataset: SOURCE.surplusLines,
          source_family: 'surplus_lines',
          review_key: `${SOURCE.surplusLines}:ISI_AA:${normalized}`,
          hold_reason: 'ISI_ID_HYPHEN_NORMALIZED_REVIEW',
          match_status: 'NORMALIZED_REVIEW',
          identifier_scheme: null,
          identifier_value: normalized,
          legal_name: row.name,
          jurisdiction: 'NJ',
          raw_value: { id_raw: raw, population: row.population },
        })
      );
      continue;
    }
    alienNotLoaded += 1;
  }
  return { reviewRows, rosterRows, alienNotLoaded };
}

export function classifyMlr(rows: MlrRow[]): { reviewRows: ReviewQueueRow[]; bridgeRows: BridgeRow[] } {
  const reviewRows: ReviewQueueRow[] = [];
  const bridgeRows: BridgeRow[] = [];
  const naicByHios = new Map<string, Set<string>>();
  for (const row of rows) {
    const hios = row.hios_issuer_id.trim();
    const naic = row.naic_company_code.trim();
    const group = row.naic_group_code.trim();
    if (!/^\d{5}$/.test(hios)) fail(`HIOS ${hios} is outside five digits`);
    if (!/^[A-Z]{2}$/.test(row.business_state)) fail(`state ${row.business_state} is outside two letters`);
    if (row.status === 'EXACT_MATCH') {
      if (!/^\d{5}$/.test(naic)) fail(`exact MLR row ${row.mr_submission_template_id} has a blank NAIC`);
      if (hios === naic) fail(`HIOS ${hios} matches its NAIC and cannot be stored as a bridge`);
      const seen = naicByHios.get(hios) ?? new Set<string>();
      seen.add(naic);
      naicByHios.set(hios, seen);
      const bridge: BridgeRow = {
        source_dataset: SOURCE.mlr,
        bridge_key: `${row.mr_submission_template_id}:${row.business_state}`,
        from_scheme: 'hios_issuer_id',
        from_value: hios,
        to_scheme: 'naic_cocode',
        to_value: naic,
        naic_group_code: group || null,
        jurisdiction: row.business_state,
        publication_allowed: false,
        match_status: 'EXACT',
        content_hash: '',
        raw_value: { mr_submission_template_id: row.mr_submission_template_id },
      };
      bridge.content_hash = sha256Canonical({ ...bridge, content_hash: undefined });
      assertNoContactFields(bridge);
      bridgeRows.push(bridge);
      continue;
    }
    if (row.status !== 'HELD_BLANK_NAIC' && row.status !== 'UNRESOLVED_NAIC_NOT_IN_DB') {
      fail(`unknown MLR status ${row.status}`);
    }
    if (row.status === 'HELD_BLANK_NAIC' && naic) {
      fail(`blank-NAIC hold ${row.mr_submission_template_id} still has a NAIC`);
    }
    if (row.status === 'UNRESOLVED_NAIC_NOT_IN_DB' && !/^\d{5}$/.test(naic)) {
      fail(`unresolved MLR row ${row.mr_submission_template_id} has no NAIC`);
    }
    reviewRows.push(
      reviewRow({
        source_dataset: SOURCE.mlr,
        source_family: 'mlr_hios_naic',
        review_key: `${SOURCE.mlr}:${row.mr_submission_template_id}:${row.business_state}`,
        hold_reason: row.status,
        match_status: row.status === 'HELD_BLANK_NAIC' ? 'HELD_BLANK_NAIC' : 'UNRESOLVED',
        identifier_scheme: 'hios_issuer_id',
        identifier_value: hios,
        legal_name: null,
        jurisdiction: row.business_state,
        raw_value: {
          naic_company_code: naic || null,
          naic_group_code: group || null,
        },
      })
    );
  }
  const oneToMany = [...naicByHios.values()].filter((naics) => naics.size > 1).length;
  if (oneToMany !== 0) fail(`MLR one-to-many HIOS bridges: ${oneToMany}`);
  return { reviewRows, bridgeRows };
}

function countHold(rows: MarketConductRow[], hold: string): number {
  return rows.filter((row) => row.hold === hold).length;
}

function uniqueKeys(values: string[], label: string): void {
  if (new Set(values).size !== values.length) fail(`duplicate ${label}`);
}

export function buildEaInsRoadmapPlan(input: {
  marketConduct: MarketConductRow[];
  surplusLines: SurplusRow[];
  mlr: MlrRow[];
  cmsActions: CmsActionSource[];
  contractHistory: ContractHistoryCsvRow[];
  staticContractIds: ReadonlySet<string>;
}): RoadmapPlan {
  const market = classifyMarketConduct(input.marketConduct);
  const surplus = classifySurplusLines(input.surplusLines);
  const mlr = classifyMlr(input.mlr);
  const geico = input.marketConduct.filter((row) => row.hold === GEICO_HOLD);
  if (geico.length !== 1) fail('GEICO 10/20 must be one action');

  const terminated = new Map<string, boolean>();
  for (const row of input.contractHistory) {
    if (row.in_db !== 'False') fail('contract history marks a DB match without a database read');
    const flag = row.all_contracts_terminated_flag;
    if (flag !== 'True' && flag !== 'False') fail(`termination flag ${flag} is outside True/False`);
    terminated.set(`${row.contract_id}|${row.issue_id}`, flag === 'True');
  }
  const cmsHistory = buildCmsContractHistory(input.cmsActions, input.staticContractIds, terminated);
  if (cmsHistory.length !== input.contractHistory.length) {
    fail(`CMS history ${cmsHistory.length} disagrees with the contract file`);
  }
  const csvByKey = new Map(input.contractHistory.map((row) => [`${row.contract_id}|${row.issue_id}`, row]));
  for (const row of cmsHistory) {
    const csv = csvByKey.get(`${row.contract_id}|${row.issue_id}`);
    if (!csv) fail(`built CMS row ${row.contract_id} ${row.issue_id} is missing from the contract file`);
    const repoFlag = csv.in_repo_static_cms_json === 'True';
    if (
      csv.action_type !== row.action_type ||
      csv.date_sent !== row.date_sent ||
      csv.issue_type !== row.issue_type ||
      csv.issue_topic !== row.issue_topic ||
      csv.shared_with !== row.shared_with ||
      repoFlag !== row.in_repo_static_cms_json
    ) {
      fail(`CMS builder disagrees with the contract file at ${row.contract_id} ${row.issue_id}`);
    }
  }

  const cmsRows: CmsActionInsert[] = cmsHistory.map((row) => {
    const insert: CmsActionInsert = {
      ...row,
      source_dataset: SOURCE.cmsActions,
      content_hash: '',
    };
    insert.content_hash = sha256Canonical({ ...insert, content_hash: undefined });
    assertNoContactFields(insert);
    return insert;
  });

  const reviewRows = [...market.reviewRows, ...surplus.reviewRows, ...mlr.reviewRows];
  uniqueKeys(reviewRows.map((row) => `${row.source_dataset}|${row.review_key}`), 'review keys');
  uniqueKeys(surplus.rosterRows.map((row) => row.roster_key), 'roster keys');
  uniqueKeys(mlr.bridgeRows.map((row) => row.bridge_key), 'bridge keys');
  uniqueKeys(cmsRows.map((row) => `${row.contract_id}|${row.issue_id}`), 'cms keys');

  const naicIds = input.surplusLines.filter((row) => row.id_ns === 'NAIC').map((row) => row.id);
  const contracts = new Set(cmsRows.map((row) => row.contract_id));
  const repoContracts = new Set(
    cmsRows.filter((row) => row.in_repo_static_cms_json).map((row) => row.contract_id)
  );
  const summary: RoadmapSummary = {
    marketConduct: {
      sourceRows: input.marketConduct.length,
      loadExact: market.loadExact,
      held: market.reviewRows.length,
      textNoNaic: countHold(input.marketConduct, 'HELD_NO_NAIC_IN_REPORT_TEXT'),
      imageOnlyNoNaic: countHold(input.marketConduct, 'HELD_NO_NAIC_IN_REPORT_IMAGE_ONLY'),
      multiEntity: countHold(input.marketConduct, 'HELD_MULTI_ENTITY_REVIEW'),
      ocrSingleUnverified: countHold(input.marketConduct, 'HELD_OCR_SINGLE_UNVERIFIED'),
      source404: countHold(input.marketConduct, 'HELD_SOURCE_404'),
      geicoActions: geico.length,
      geicoNaics: geico[0]?.naic_candidates.length ?? 0,
    },
    surplusLines: {
      sourceRows: input.surplusLines.length,
      foreign: input.surplusLines.filter((row) => row.population === 'foreign').length,
      domestic: input.surplusLines.filter((row) => row.population === 'domestic').length,
      alien: input.surplusLines.filter((row) => row.population === 'alien').length,
      naicRows: naicIds.length,
      naicUnique: new Set(naicIds).size,
      loadExactNaic: surplus.rosterRows.length,
      quarantine13064Rows: input.surplusLines.filter((row) => row.id === QUARANTINE_NAIC).length,
      notInDb: input.surplusLines.filter((row) => row.id === SURPLUS_NAIC_NOT_IN_DB).length,
      hyphenNormalizedReview: surplus.reviewRows.filter(
        (row) => row.hold_reason === 'ISI_ID_HYPHEN_NORMALIZED_REVIEW'
      ).length,
      alienNotLoaded: surplus.alienNotLoaded,
    },
    mlr: {
      sourceRows: input.mlr.length,
      loadExact: mlr.bridgeRows.length,
      blankNaic: input.mlr.filter((row) => row.status === 'HELD_BLANK_NAIC').length,
      unresolvedNaic: input.mlr.filter((row) => row.status === 'UNRESOLVED_NAIC_NOT_IN_DB').length,
      oneToMany: 0,
    },
    cms: {
      actions: input.cmsActions.length,
      cap: input.cmsActions.filter((row) => row.action_type === 'AD_HOC_CAP').length,
      warningLetters: input.cmsActions.filter((row) => row.action_type === 'WARNING_LETTER').length,
      links: cmsRows.length,
      contracts: contracts.size,
      repoStaticContracts: repoContracts.size,
      repoStaticLinks: cmsRows.filter((row) => row.in_repo_static_cms_json).length,
    },
    reviewQueue: reviewRows.length,
    publicationAllowedTrue: [...reviewRows, ...surplus.rosterRows, ...mlr.bridgeRows, ...cmsRows].filter(
      (row) => row.publication_allowed !== false
    ).length,
    hashesOk: true,
  };
  assertSummary(summary);
  if (reviewRows.some((row) => row.publication_allowed !== false)) {
    fail('review queue row is publishable');
  }
  if (surplus.rosterRows.some((row) => row.identifier_value === QUARANTINE_NAIC || row.identifier_value === SURPLUS_NAIC_NOT_IN_DB)) {
    fail('quarantined or unresolved NAIC entered the exact roster');
  }
  return {
    task: EA_INS_ROADMAP_001,
    closed: true,
    summary,
    reviewRows,
    bridgeRows: mlr.bridgeRows,
    rosterRows: surplus.rosterRows,
    cmsRows,
  };
}

export function assertSummary(summary: RoadmapSummary): void {
  const pairs: Array<[number, number, string]> = [
    [summary.marketConduct.sourceRows, EXPECTED.marketConduct.sourceRows, 'market-conduct rows'],
    [summary.marketConduct.loadExact, EXPECTED.marketConduct.loadExact, 'market-conduct exact loads'],
    [summary.marketConduct.held, EXPECTED.marketConduct.held, 'market-conduct holds'],
    [summary.marketConduct.textNoNaic, EXPECTED.marketConduct.textNoNaic, 'text holds'],
    [summary.marketConduct.imageOnlyNoNaic, EXPECTED.marketConduct.imageOnlyNoNaic, 'image holds'],
    [summary.marketConduct.multiEntity, EXPECTED.marketConduct.multiEntity, 'multi-entity holds'],
    [summary.marketConduct.ocrSingleUnverified, EXPECTED.marketConduct.ocrSingleUnverified, 'ocr holds'],
    [summary.marketConduct.source404, EXPECTED.marketConduct.source404, '404 holds'],
    [summary.marketConduct.geicoActions, EXPECTED.marketConduct.geicoActions, 'GEICO actions'],
    [summary.marketConduct.geicoNaics, EXPECTED.marketConduct.geicoNaics, 'GEICO NAICs'],
    [summary.surplusLines.sourceRows, EXPECTED.surplusLines.sourceRows, 'surplus rows'],
    [summary.surplusLines.foreign, EXPECTED.surplusLines.foreign, 'foreign surplus'],
    [summary.surplusLines.domestic, EXPECTED.surplusLines.domestic, 'domestic surplus'],
    [summary.surplusLines.alien, EXPECTED.surplusLines.alien, 'alien surplus'],
    [summary.surplusLines.naicRows, EXPECTED.surplusLines.naicRows, 'NAIC rows'],
    [summary.surplusLines.naicUnique, EXPECTED.surplusLines.naicUnique, 'unique NAIC'],
    [summary.surplusLines.loadExactNaic, EXPECTED.surplusLines.loadExactNaic, 'exact NAIC loads'],
    [summary.surplusLines.quarantine13064Rows, EXPECTED.surplusLines.quarantine13064Rows, '13064 quarantine'],
    [summary.surplusLines.notInDb, EXPECTED.surplusLines.notInDb, 'NAIC not in DB'],
    [summary.surplusLines.hyphenNormalizedReview, EXPECTED.surplusLines.hyphenNormalizedReview, 'hyphen AA review'],
    [summary.surplusLines.alienNotLoaded, EXPECTED.surplusLines.alienNotLoaded, 'alien withheld'],
    [summary.mlr.sourceRows, EXPECTED.mlr.sourceRows, 'MLR rows'],
    [summary.mlr.loadExact, EXPECTED.mlr.loadExact, 'MLR exact'],
    [summary.mlr.blankNaic, EXPECTED.mlr.blankNaic, 'MLR blank NAIC'],
    [summary.mlr.unresolvedNaic, EXPECTED.mlr.unresolvedNaic, 'MLR unresolved NAIC'],
    [summary.mlr.oneToMany, EXPECTED.mlr.oneToMany, 'MLR one-to-many'],
    [summary.cms.actions, EXPECTED.cms.actions, 'CMS actions'],
    [summary.cms.cap, EXPECTED.cms.cap, 'CMS CAP'],
    [summary.cms.warningLetters, EXPECTED.cms.warningLetters, 'CMS warning letters'],
    [summary.cms.links, EXPECTED.cms.links, 'CMS links'],
    [summary.cms.contracts, EXPECTED.cms.contracts, 'CMS contracts'],
    [summary.cms.repoStaticContracts, EXPECTED.cms.repoStaticContracts, 'repo contract overlap'],
    [summary.cms.repoStaticLinks, EXPECTED.cms.repoStaticLinks, 'repo link overlap'],
    [summary.reviewQueue, EXPECTED.reviewQueue, 'review queue'],
    [summary.publicationAllowedTrue, 0, 'publication_allowed true'],
  ];
  for (const [actual, expected, label] of pairs) {
    if (actual !== expected) fail(`${label} ${actual} disagrees with ${expected}`);
  }
}

export function loadEaInsRoadmapFromRepo(root: string): RoadmapPlan {
  assertFixtureHashes(root);
  const fixture = (name: string) => readFileSync(join(root, FIXTURE_DIR, name), 'utf8');
  const plan = buildEaInsRoadmapPlan({
    marketConduct: JSON.parse(fixture('q1nj_rows.json')) as MarketConductRow[],
    surplusLines: JSON.parse(fixture('q2_surplus_lines_rows.json')) as SurplusRow[],
    mlr: parseCsv(fixture('q3_mlr_bridge_dryrun.csv')) as MlrRow[],
    cmsActions: JSON.parse(fixture('q4_cms_actions_rows.json')) as CmsActionSource[],
    contractHistory: parseCsv(fixture('q4_contract_history.csv')) as ContractHistoryCsvRow[],
    staticContractIds: collectStaticCmsContractIds(root),
  });
  plan.summary.hashesOk = true;
  return plan;
}

export type RoadmapWriteClient = {
  upsert(table: string, rows: readonly object[], onConflict: string): Promise<void>;
};

export async function applyEaInsRoadmapPlan(
  plan: RoadmapPlan,
  client: RoadmapWriteClient,
  options: { write: boolean }
): Promise<{ wrote: boolean; upserts: number }> {
  if (!options.write) return { wrote: false, upserts: 0 };
  if (!plan.closed) fail('refusing to write a plan that failed closed');
  assertSummary(plan.summary);
  const batches: Array<[string, readonly object[], string]> = [
    [TABLE.review, plan.reviewRows, 'source_dataset,review_key'],
    [TABLE.bridges, plan.bridgeRows, 'source_dataset,bridge_key'],
    [TABLE.roster, plan.rosterRows, 'source_dataset,roster_key'],
    [TABLE.cmsActions, plan.cmsRows, 'contract_id,issue_id'],
  ];
  for (const [, rows] of batches) {
    for (const row of rows) {
      const publicationAllowed = (row as { publication_allowed?: boolean }).publication_allowed;
      if (publicationAllowed !== false) fail('write payload is publishable');
      assertNoContactFields(row);
    }
  }
  for (const [table, rows, onConflict] of batches) {
    await client.upsert(table, rows, onConflict);
  }
  return { wrote: true, upserts: batches.length };
}
