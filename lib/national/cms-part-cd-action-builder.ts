/**
 * CMS Part C/D CAP and warning-letter builder.
 * Expands one action into contract-keyed history on cms_medicare_contract_id.
 * Contact names and phone numbers are refused.
 */

import { createHash } from 'node:crypto';

export const CMS_CONTRACT_SCHEME = 'cms_medicare_contract_id';
export const CMS_ACTION_TYPES = ['AD_HOC_CAP', 'WARNING_LETTER'] as const;
export type CmsActionType = (typeof CMS_ACTION_TYPES)[number];

const CONTACT_KEY = /phone|fax|e-?mail|contact_name|contactname|mobile|pager|first_name|last_name/i;
const PHONE_TEXT = /\b\d{3}[-.)]\s*\d{3}[-.]\d{4}\b/;
const EMAIL_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const CONTRACT_ID = /^[A-Z]\d{4}$/;
const CONTRACT_IN_TEXT = /\b([A-Z]\d{4})\b/g;

export class CmsActionBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CmsActionBuildError';
  }
}

export type CmsActionSource = {
  action_type: string;
  issue_id: string;
  date_sent: string;
  issue_type: string;
  issue_topic: string;
  parent_org?: string;
  contract_ids: string[];
  raw_contract_field: string;
};

export type CmsContractHistoryRow = {
  contract_id: string;
  identifier_scheme: typeof CMS_CONTRACT_SCHEME;
  issue_id: string;
  action_type: CmsActionType;
  date_sent: string;
  issue_type: string;
  issue_topic: string;
  parent_organization: string | null;
  all_contracts_terminated: boolean;
  shared_with: string;
  in_repo_static_cms_json: boolean;
  publication_allowed: false;
};

export function assertNoContactFields(value: unknown, path = 'row'): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoContactFields(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (CONTACT_KEY.test(key)) {
        throw new CmsActionBuildError(`contact field refused at ${path}.${key}`);
      }
      assertNoContactFields(entry, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === 'string' && (PHONE_TEXT.test(value) || EMAIL_TEXT.test(value))) {
    throw new CmsActionBuildError(`contact value refused at ${path}`);
  }
}

export function normalizeCmsIssueId(raw: string): string {
  const issueId = raw.trim().replace(/\s*\*\s*$/, '');
  if (!/^\d+$/.test(issueId)) {
    throw new CmsActionBuildError(`issue id ${raw} is not a numeric CMS issue`);
  }
  return issueId;
}

export function parseContractIdsFromRaw(raw: string): string[] {
  return [...raw.matchAll(CONTRACT_IN_TEXT)].map((match) => match[1]);
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function sha256Canonical(value: unknown): string {
  return sha256Text(canonicalJson(value));
}

function assertActionShape(action: CmsActionSource): void {
  assertNoContactFields(action);
  if (!CMS_ACTION_TYPES.includes(action.action_type as CmsActionType)) {
    throw new CmsActionBuildError(`action type ${action.action_type} is outside CAP and warning letters`);
  }
  if (!/^\d{2}-[A-Z]{3}-\d{4}$/.test(action.date_sent)) {
    throw new CmsActionBuildError(`date ${action.date_sent} is outside DD-MON-YYYY`);
  }
  if (!action.contract_ids.length) {
    throw new CmsActionBuildError(`issue ${action.issue_id} has no contract ids`);
  }
  for (const contractId of action.contract_ids) {
    if (!CONTRACT_ID.test(contractId)) {
      throw new CmsActionBuildError(`contract id ${contractId} is outside the CMS contract pattern`);
    }
  }
  const parsed = parseContractIdsFromRaw(action.raw_contract_field);
  if (!parsed.length) {
    throw new CmsActionBuildError(`issue ${action.issue_id} raw contract field has no contract ids`);
  }
  const prefix = action.contract_ids.slice(0, parsed.length);
  if (parsed.some((id, index) => prefix[index] !== id)) {
    throw new CmsActionBuildError(`issue ${action.issue_id} raw contract ids disagree with contract_ids`);
  }
}

/**
 * Build one history row per contract. The complete contract_ids list is authoritative
 * when the raw field is a truncated prefix of that list.
 */
export function buildCmsContractHistory(
  actions: CmsActionSource[],
  staticContractIds: ReadonlySet<string>,
  terminatedByContractIssue: ReadonlyMap<string, boolean>
): CmsContractHistoryRow[] {
  const rows: CmsContractHistoryRow[] = [];
  const seenIssues = new Set<string>();
  for (const action of actions) {
    assertActionShape(action);
    const issueId = normalizeCmsIssueId(action.issue_id);
    if (seenIssues.has(issueId)) {
      throw new CmsActionBuildError(`duplicate issue ${issueId}`);
    }
    seenIssues.add(issueId);
    const organization = action.parent_org?.replace(/\s+/g, ' ').trim() || null;
    for (const contractId of action.contract_ids) {
      const shared = action.contract_ids.filter((id) => id !== contractId);
      const terminated = terminatedByContractIssue.get(`${contractId}|${issueId}`);
      if (terminated === undefined) {
        throw new CmsActionBuildError(`missing termination flag for ${contractId} ${issueId}`);
      }
      rows.push({
        contract_id: contractId,
        identifier_scheme: CMS_CONTRACT_SCHEME,
        issue_id: issueId,
        action_type: action.action_type as CmsActionType,
        date_sent: action.date_sent,
        issue_type: action.issue_type,
        issue_topic: action.issue_topic,
        parent_organization: organization,
        all_contracts_terminated: terminated,
        shared_with: shared.join(' '),
        in_repo_static_cms_json: staticContractIds.has(contractId),
        publication_allowed: false,
      });
    }
  }
  const keys = new Set<string>();
  for (const row of rows) {
    const key = `${row.contract_id}|${row.issue_id}`;
    if (keys.has(key)) throw new CmsActionBuildError(`duplicate contract history ${key}`);
    keys.add(key);
    assertNoContactFields(row);
  }
  return rows;
}
