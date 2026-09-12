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
  for (const key of params.keys())
    if (!KEYS.includes(key) || params.getAll(key).length > 1)
      out.error = "Use one value for each supported request parameter.";
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
    const value = params.get(key);
    if (value) {
      if (!values.includes(value)) out.error = `Invalid ${key} filter.`;
      else (out.options as Record<string, string>)[key] = value;
    }
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
  options: InsuranceRequestOptions = {},
): ParsedInsuranceAsk {
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
  if (q.entityClass === "person" && q.mode === "entity") {
    q.mode = "fail_closed";
    q.refinement = "identity";
    q.failReason =
      "Public person directories are not published. Enter a labeled NPN.";
  }
  if (
    q.entityClass === "agency" &&
    q.jurisdiction &&
    !["FL", "TX", "MA", "OH", "VT"].includes(q.jurisdiction.state)
  ) {
    q.mode = "fail_closed";
    q.coverageState = "NOT_ACQUIRED";
    q.failReason = `${q.jurisdiction.state} agency bulk credentials are not acquired for this operation. This is not zero agencies.`;
  }
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
export function insuranceRequestHref(
  raw: string,
  options: InsuranceRequestOptions = {},
  page = 1,
): string {
  return (
    "/ask?" +
    new URLSearchParams({
      q: raw,
      ...options,
      ...(page > 1 ? { page: String(page) } : {}),
    })
  );
}
