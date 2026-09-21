import { US_STATES } from "@/lib/constants";
import { interpretInsuranceAskQuery } from "./interpret";
import { invalidResearch } from "./research-intent";
import {
  INSURANCE_ASK_INPUT_LIMIT,
  type InsuranceRequestOptions,
  type ParsedInsuranceAsk,
} from "./contract";
export type InsuranceRequest = {
  raw: string;
  page: number;
  options: InsuranceRequestOptions;
  error?: string;
};
const KEYS = [
  "q",
  "page",
  "entity",
  "state",
  "loa",
  "evidence",
  "zip",
  "selected",
];
/**
 * SQA-009-RESTORE-001B: consumer HTML /ask is a GET form (q + optional advanced filters)
 * on a site that also uses chrome query keys (`from` for context-nav, `hub_resume` for
 * Switch Hub). Those keys are not research filters. Treating them as "unsupported request
 * parameters" fail-closed the entire natural-language interpretation ("Use one value for
 * each supported request parameter." / Coverage UNSUPPORTED / Check the request / zero
 * agencies) even when `q` was a valid 001B discovery request. Ignore chrome keys and
 * empty filter values so typed Research can execute+disclose. Duplicate *research* keys
 * and invalid non-empty filters still fail closed. `selected=undefined` remains invalid
 * (name-continuation contract), while empty / stringified-absent Advanced filters are not
 * applied as entity/state/loa/evidence.
 */
const CHROME_PARAM =
  /^(?:from|hub_resume|_rsc|_vercel_share|vercelToolbarCode|dpl|fbclid|gclid|gclsrc|dclid|msclkid|twclid|ttclid|li_fat_id|mc_cid|mc_eid|_ga|_gl|vero_id)$/i;
function isChromeParam(key: string): boolean {
  return CHROME_PARAM.test(key) || key.toLowerCase().startsWith("utm_");
}
/** A request option is real only if it is a non-empty string that is not a stringified absence. */
function realOption(value: unknown): value is string {
  return typeof value === "string" && value !== "" && value !== "undefined" && value !== "null";
}
/** Present research values only: empty / stringified absence is not a parameter the consumer chose. */
function presentParamValues(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).filter(realOption);
}
export function readInsuranceRequest(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): InsuranceRequest {
  const params =
    input instanceof URLSearchParams
      ? input
      : new URLSearchParams(
          Object.entries(input).flatMap(([k, v]) =>
            Array.isArray(v)
              ? v.map((x) => [k, x])
              : v === undefined
                ? []
                : [[k, v]],
          ),
        );
  const out: InsuranceRequest = {
    raw: params.get("q") ?? "",
    page: Number(params.get("page") || "1"),
    options: {},
  };
  for (const key of new Set(params.keys())) {
    if (isChromeParam(key)) continue;
    const values = params.getAll(key).filter((value) => value !== "");
    if (!values.length) continue;
    if (!KEYS.includes(key) || values.length > 1)
      out.error = "Use one value for each supported request parameter.";
  }
  if (out.raw.length > INSURANCE_ASK_INPUT_LIMIT)
    out.error = `Use at most ${INSURANCE_ASK_INPUT_LIMIT} characters; no input was truncated.`;
  if (!Number.isInteger(out.page) || out.page < 1 || out.page > 200)
    out.error = "Page must be an integer from 1 to 200.";
  const allowed: Record<string, readonly string[]> = {
    entity: ["agency", "person", "insurer"],
    state: US_STATES.map((s) => s.code),
    loa: ["property", "casualty", "life", "health"],
    evidence: ["credential", "appointment", "marketplace"],
  };
  for (const [key, values] of Object.entries(allowed)) {
    const chosen = presentParamValues(params, key);
    if (!chosen.length) continue;
    const value = chosen[0]!;
    if (!values.includes(value)) out.error = `Invalid ${key} filter.`;
    else (out.options as Record<string, string>)[key] = value;
  }
  const zip = params.get("zip"),
    selected = params.get("selected");
  if (zip) {
    if (!/^\d{5}$/.test(zip)) out.error = "Enter a five-digit ZIP.";
    else out.options.zip = zip;
  }
  if (selected) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        selected,
      )
    )
      out.error = "Invalid candidate reference.";
    else out.options.selected = selected;
  }
  return out;
}
export function planInsuranceRequest(
  raw: string,
  page: number,
  suppliedOptions: InsuranceRequestOptions = {},
): ParsedInsuranceAsk {
  // A structured caller may hand over `{ entity: undefined, ... }`. An absent filter is not a filter.
  const options = definedRequestOptions(suppliedOptions);
  const checked = readInsuranceRequest(
    new URLSearchParams(
      Object.entries({ q: raw, page: String(page), ...options }).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  );
  if (checked.error) return invalidResearch(raw, checked.error);
  const p = interpretInsuranceAskQuery(raw, page),
    q = p.query;
  q.requestOptions = { ...options };
  if (options.selected) {
    if (!q.nameQuery && !q.identifier)
      return invalidResearch(
        raw,
        "Candidate selection requires the original name or exact identifier request.",
      );
    q.selectedEntity = options.selected;
  }
  if (options.zip) {
    if (!q.directoryContext)
      return invalidResearch(
        raw,
        "ZIP refinement requires a local directory request.",
      );
    q.mode = "directory";
    q.refinement = undefined;
    q.terminalState = undefined;
    q.directoryZip = options.zip;
    q.directoryContext = {
      ...q.directoryContext,
      effectiveZip: options.zip,
      unresolvedConditions: q.directoryContext.unresolvedConditions.filter(
        (x) => x !== "ZIP required",
      ),
    };
    p.interpretation.push({
      label: "Selected directory ZIP",
      value: options.zip,
    });
  }
  if (q.mode === "fail_closed") return p;
  if (q.directoryContext) {
    if (options.entity || options.state || options.loa || options.evidence) {
      q.conditions = [
        ...(q.conditions ?? []),
        {
          value: JSON.stringify({
            entity: options.entity,
            state: options.state,
            loa: options.loa,
            evidence: options.evidence,
          }),
          meaning: "regulatory filters are not directory listing filters",
          outcome: "UNSUPPORTED",
        },
      ];
    }
    return p;
  }
  if (q.identifier || q.nameQuery) {
    for (const [key, value] of Object.entries(options).filter(
      ([k]) => !["selected", "zip"].includes(k),
    ))
      q.conditions = [
        ...(q.conditions ?? []),
        {
          value,
          meaning: `requested ${key} filter on identity`,
          outcome: "NEEDS_CLARIFICATION",
        },
      ];
    return p;
  }
  if (options.entity) q.entityClass = options.entity;
  if (options.state) {
    if (q.jurisdiction && q.jurisdiction.meaning !== "credential_jurisdiction")
      return invalidResearch(
        raw,
        "A credential-state filter cannot replace address or domicile meaning.",
      );
    q.jurisdiction = {
      state: options.state,
      meaning: "credential_jurisdiction",
    };
  }
  if (options.loa) {
    q.linesOfAuthority = [options.loa[0]!.toUpperCase() + options.loa.slice(1)];
    q.loaAsOfficialObservation = q.jurisdiction?.state !== "FL";
  }
  if (options.evidence && options.evidence !== "credential") {
    q.mode = "fail_closed";
    q.refinement = "identity";
    q.terminalState = "NEEDS_CLARIFICATION";
    q.failReason =
      "This evidence filter requires an exact identity and the requested appointment or Marketplace context.";
  }
  // TH-DISCOVERY-GEN-001: this used to unconditionally force a bare fail_closed for any
  // person-class entity-mode query, duplicating (and overriding) interpret.ts's own handling --
  // execute.ts's listPersons now broadens an unsupported mass-producer cohort to real agencies (or
  // the national Wave-1 cohort) for the resolved jurisdiction instead of a zero-provider dead end,
  // so this query must reach it unmodified rather than being re-converted to fail_closed here.
  //
  // TH-DISCOVERY-PARITY-001B: this used to also unconditionally force a bare fail_closed for any
  // AGENCY-class entity-mode query in a state outside FL/TX/MA/OH/VT -- overriding, before
  // execution, exactly the same "zero providers despite plausible inventory" case this ticket
  // exists to fix. execute.ts's listAgencies now broadens a resolved-but-uncredentialed state to
  // InsuranceTrustHub's separate public verified-agency directory (real, geography-aware rows), and
  // only falls back to an honest empty result when even that has nothing -- so this must reach
  // listAgencies unmodified too, the same as the person-class case above.
  p.interpretation = p.interpretation.filter(
    (x) =>
      ![
        "Entity",
        "Entity class",
        "credential jurisdiction",
        "LOA / credential class",
      ].includes(x.label),
  );
  if (q.entityClass)
    p.interpretation.push({ label: "Entity class", value: q.entityClass });
  if (q.jurisdiction)
    p.interpretation.push({
      label: q.jurisdiction.meaning,
      value: q.jurisdiction.state,
    });
  if (q.linesOfAuthority?.length)
    p.interpretation.push({
      label: "LOA / credential class",
      value: q.linesOfAuthority.join(", "),
    });
  return p;
}
const HREF_OPTION_KEYS = ["entity", "state", "loa", "evidence", "zip"] as const;
/** Only real option values survive: an absent filter is dropped, never carried as `undefined`. */
export function definedRequestOptions(options: InsuranceRequestOptions = {}): InsuranceRequestOptions {
  return Object.fromEntries(Object.entries(options).filter(([, value]) => realOption(value))) as InsuranceRequestOptions;
}
/**
 * TH-SEARCH-R1-019F: the ONE builder of hub-owned /ask links (selection, continuation, pagination).
 * Parameters are appended one by one and only when they hold a real value, so `=undefined` / `=null`
 * can never be emitted -- a hub link must work as issued, without a consumer repairing it.
 */
export function insuranceAskHref(input: {
  q: string;
  options?: InsuranceRequestOptions;
  page?: number;
  selected?: string;
}): string {
  const params = new URLSearchParams();
  params.set("q", input.q);
  for (const key of HREF_OPTION_KEYS) {
    const value = input.options?.[key];
    if (realOption(value)) params.set(key, value);
  }
  if (Number.isInteger(input.page) && input.page! > 1) params.set("page", String(input.page));
  const selected = input.selected ?? input.options?.selected;
  if (realOption(selected)) params.set("selected", selected);
  return "/ask?" + params.toString();
}
export function insuranceRequestHref(
  raw: string,
  options: InsuranceRequestOptions = {},
  page = 1,
): string {
  return insuranceAskHref({ q: raw, options, page });
}
