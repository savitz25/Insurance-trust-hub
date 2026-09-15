import { distinctiveNameTokens } from "./name-match";
import { US_STATES } from "@/lib/constants";
import {
  INSURANCE_ASK_INPUT_LIMIT,
  type ParsedInsuranceAsk,
  type InsuranceResearchQuery,
  type InsuranceEntityClass,
} from "./contract";

export function requestStates(text: string): string[] {
  return US_STATES.filter(
    (s) =>
      new RegExp(`\\b${s.name}\\b`, "i").test(text) ||
      new RegExp(`(?:\\bin\\s+|,\\s*)${s.code}\\b`, "i").test(text),
  ).map((s) => s.code);
}
export function requestedClass(text: string): InsuranceEntityClass | undefined {
  if (/\bagenc(?:y|ies)\b/i.test(text)) return "agency";
  if (/\b(?:person|individual|producer|agent)\b/i.test(text)) return "person";
  if (/\b(?:legal insurer|insurers?|insurance compan(?:y|ies))\b/i.test(text))
    return "insurer";
}
/**
 * TH-DISCOVERY-RESET-001: "Florida insurance company" and "insurance company Monmouth County New
 * Jersey" were misclassified below as an explicit company NAME (the entire phrase becomes
 * nameQuery, producing a doomed exact-match lookup and a false "no match" result) -- provider-
 * class + geography is a DISCOVERY request, not a name, but distinctiveNameTokens only filters
 * generic insurance words, not state/county geography, so a bare state or county name survived as
 * a "distinctive token" and satisfied the length check that gates that branch. Recognizes a query
 * as geography-only once its recognized state name(s), "<Name> County" patterns, and generic
 * insurance words are removed and nothing distinctive remains.
 */
// TH-DISCOVERY-RESET-001: minimal, already-authoritative city -> launch-county crosswalk so a
// bare city name can reach real local-directory results without requiring a ZIP first. Bounded
// exactly to the FL_LAUNCH_COUNTIES set this source already accepts (lib/dfs/launch-counties.ts)
// -- these are not new geographic facts, just naming the principal cities of counties this source
// already publishes.
const FL_CITY_LAUNCH_COUNTY: Record<string, string> = {
  "boca raton": "palm_beach",
  "west palm beach": "palm_beach",
  "delray beach": "palm_beach",
  "boynton beach": "palm_beach",
  jupiter: "palm_beach",
  wellington: "palm_beach",
  "fort lauderdale": "broward",
  "ft lauderdale": "broward",
  "ft. lauderdale": "broward",
  "deerfield beach": "broward",
  "pompano beach": "broward",
  hollywood: "broward",
  "pembroke pines": "broward",
  "coral springs": "broward",
  miami: "miami_dade",
  "miami beach": "miami_dade",
  hialeah: "miami_dade",
  tampa: "hillsborough",
  "st petersburg": "pinellas",
  "st. petersburg": "pinellas",
  "saint petersburg": "pinellas",
  clearwater: "pinellas",
  orlando: "orange",
  jacksonville: "duval",
};
export function resolveFlCityLaunchCounty(location: string): string | undefined {
  const key = location
    .toLowerCase()
    .replace(/[,]+/g, " ")
    .replace(/\bflorida\b|\bfl\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return FL_CITY_LAUNCH_COUNTY[key];
}
function isGeographyOnlyPhrase(q: string, matchedStateCodes: string[]): boolean {
  let residue = q;
  for (const code of matchedStateCodes) {
    const state = US_STATES.find((s) => s.code === code);
    if (state) residue = residue.replace(new RegExp(`\\b${state.name}\\b`, "gi"), " ");
  }
  residue = residue.replace(/\b[A-Za-z][A-Za-z.'-]*\s+county\b/gi, " ");
  residue = residue.replace(
    /\b(?:insurance|ins|agency|agencies|company|companies|co|corporation|corp|inc|llc|llp|limited|ltd|services|group|insurer|insurers|the|and|of|an?)\b/gi,
    " ",
  );
  return !/[a-z]/i.test(residue);
}
export function invalidResearch(
  raw: string,
  reason: string,
): ParsedInsuranceAsk {
  return {
    raw,
    query: {
      mode: "fail_closed",
      intent: "FAIL_CLOSED",
      page: 1,
      terminalState: "INVALID_INPUT",
      coverageState: "UNSUPPORTED",
      failReason: reason,
    },
    interpretation: [{ label: "Request", value: reason }],
  };
}
function parsed(
  raw: string,
  query: InsuranceResearchQuery,
): ParsedInsuranceAsk {
  return {
    raw,
    query,
    interpretation: [
      { label: "Research task", value: query.intent ?? query.mode },
      ...(query.entityClass
        ? [{ label: "Entity class", value: query.entityClass }]
        : []),
      ...(query.nameQuery
        ? [{ label: "Requested name", value: query.nameQuery }]
        : []),
      ...(query.identifier
        ? [
            {
              label: "Identifier",
              value: `${query.identifier.type} ${query.identifier.value}`,
            },
          ]
        : []),
      ...(query.directoryContext
        ? [
            {
              label: "Requested location",
              value: query.directoryContext.requestedLocation,
            },
            {
              label: "Insurance context",
              value:
                query.directoryContext.requestedInsuranceContext.join(", ") ||
                "Not specified",
            },
          ]
        : []),
      ...(query.conditions ?? []).map((c) => ({
        label: c.meaning,
        value: `${c.value}: ${c.outcome}`,
      })),
    ],
  };
}
/** Early typed identity/local rules in the existing interpreter. No retrieval or result-driven classification. */
export function interpretIdentityAndLocal(
  raw: string,
  page: number,
): ParsedInsuranceAsk | null {
  const q = raw.trim();
  if (
    raw.length > INSURANCE_ASK_INPUT_LIMIT ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw)
  )
    return invalidResearch(
      raw,
      `Use at most ${INSURANCE_ASK_INPUT_LIMIT} characters without control characters. The full request was rejected; nothing was truncated.`,
    );
  if (!Number.isInteger(page) || page < 1 || page > 200)
    return invalidResearch(raw, "Page must be an integer from 1 to 200.");
  const states = requestStates(q),
    cls = requestedClass(q);
  const labels = [
    ...q.matchAll(
      /\b(npn|naic(?:\s+company)?(?:\s+code)?)\s*#?\s*([0-9][0-9 ]*)/gi,
    ),
  ];
  if (labels.length) {
    if (labels.length > 1)
      return parsed(q, {
        mode: "fail_closed",
        intent: "FAIL_CLOSED",
        page,
        refinement: "identity",
        terminalState: "NEEDS_CLARIFICATION",
        failReason:
          "Keep NPN and NAIC identities separate. Enter one labeled identifier for this lookup.",
      });
    const match = labels[0]!,
      value = match[2]!.replace(/ /g, ""),
      type = /^npn$/i.test(match[1]!) ? "npn" : "naic_company_code";
    const tail = q.slice(match.index! + match[0].length);
    if (
      (/[a-z]/i.test(tail[0] ?? "") && !/\s$/.test(match[2]!)) ||
      !(type === "npn" ? /^\d{4,12}$/ : /^\d{3,6}$/).test(value) ||
      /^(?:[.,/]\s*\d|(?:and|or)\s+\d|[a-z]\d)/i.test(tail)
    )
      return invalidResearch(
        raw,
        "Enter one complete labeled NPN or NAIC company code; separate numeric values are ambiguous.",
      );
    const appointment =
      /\b(?:appoint(?:ed|ment|ments)?|sell policies for|allowed to sell|authorized to sell)\b/i.test(
        q,
      );
    const marketplace = /\bmarketplace\b/i.test(q);
    const appointerName = appointment
      ? q
          .match(/\b(?:with|for|by)\s+(.+?)[?.]?$/i)?.[1]
          ?.replace(/[?.]+$/, "")
          .trim()
      : undefined;
    const query: InsuranceResearchQuery = {
      mode: appointment || marketplace ? "evidence" : "identifier",
      intent: appointment || marketplace ? "EVIDENCE" : "IDENTIFIER_LOOKUP",
      identifier: { type, value },
      entityClass: type === "naic_company_code" ? "insurer" : undefined,
      page,
      requestedTask: appointment
        ? "appointment"
        : marketplace
          ? "marketplace"
          : "identity",
      evidenceFamily: appointment
        ? "appointment"
        : marketplace
          ? "marketplace"
          : undefined,
      appointerName,
      marketplacePlanYear: marketplace
        ? q.match(/\b20\d{2}\b/)?.[0]
        : undefined,
      conditions: states.map((state) => ({
        value: state,
        meaning: "additional requested jurisdiction",
        outcome: "NEEDS_CLARIFICATION",
      })),
    };
    if (type === "npn" && cls)
      query.conditions = [
        ...(query.conditions ?? []),
        {
          value: cls,
          meaning:
            "requested entity class; source NPN class remains authoritative",
          outcome: "NEEDS_CLARIFICATION",
        },
      ];
    if (appointment && (!appointerName || type !== "npn")) {
      query.mode = "fail_closed";
      query.refinement = "appointer";
      query.terminalState = "NEEDS_CLARIFICATION";
      query.failReason =
        "Appointment research needs an exact NPN identity and the appointing entity. LOA does not establish appointment.";
    }
    return parsed(q, query);
  }
  if (
    (/\b(?:npn|naic)\b/i.test(q) && /\d/.test(q)) ||
    /^(?:find\s+)?(?:npn|naic(?: company)?(?: code)?)\s+[^0-9#]/i.test(q)
  )
    return invalidResearch(
      raw,
      "Enter a complete labeled NPN or NAIC company code.",
    );
  if (/^\d[\d ]*$/.test(q))
    return parsed(q, {
      mode: "fail_closed",
      intent: "FAIL_CLOSED",
      page,
      refinement: "identity",
      terminalState: "NEEDS_CLARIFICATION",
      failReason:
        "Label the number as NPN or NAIC company code. Digits do not establish entity class.",
    });
  let explicitName: string[] | null = /^(?:research|find|check|who is|is)\s+(.+?)\??$/i.exec(q);
  if (
    !explicitName &&
    /\b(?:agency|insurance company|llc|inc|corp)\b/i.test(q) &&
    !/\b(?:in|near|with|which|what|how|show|does|has|have|can|should|this|licensed|credentialed|located|domiciled|complaints|best|serves)\b/i.test(
      q,
    ) &&
    !isGeographyOnlyPhrase(q, states) &&
    distinctiveNameTokens(q).length
  )
    explicitName = [q, q];
  const local =
    /\b(?:near me|nearby|local|zip|directory)\b/i.test(q) ||
    (/\binsurance (?:agenc(?:y|ies)|agents?|compan(?:y|ies))\s+in\s+/i.test(
      q,
    ) &&
      states.length === 1 &&
      !new RegExp(
        `\\bin\\s+(?:${US_STATES.find((s) => s.code === states[0])?.name}|${states[0]})[?.]?$`,
        "i",
      ).test(q));
  if (
    local &&
    !explicitName &&
    !/\b(?:credential|licensed|domicil|appoint|best|cheapest)\b/i.test(q)
  ) {
    const zip = q.match(/\b\d{5}\b/)?.[0];
    const context = [
      ...q.matchAll(/\b(homeowners?|auto|life|health|medicare)\b/gi),
    ].map((m) => m[0].toLowerCase());
    const location =
      q.match(/\b(?:in|near)\s+(.+?)[?.]?$/i)?.[1]?.replace(/[?.]+$/, "") ??
      "near me";
    // TH-DISCOVERY-RESET-001: a bare city name (e.g. "Boca Raton") used to always fall to
    // fail_closed asking for a ZIP, hiding the real local-directory capability behind a ZIP
    // requirement even though the launch-county grain is already sufficient to run it. Resolves
    // against the same already-authoritative FL_LAUNCH_COUNTIES set this source already accepts
    // (not a new dataset) before requiring a ZIP.
    const launchCountyId = !zip ? resolveFlCityLaunchCounty(location) : undefined;
    return parsed(q, {
      mode: zip || launchCountyId ? "directory" : "fail_closed",
      intent: "DIRECTORY_DISCOVERY",
      page,
      directoryZip: zip,
      directoryLaunchCountyId: launchCountyId,
      coverageState: "PARTIAL",
      refinement: zip || launchCountyId ? undefined : "zip",
      terminalState: zip || launchCountyId ? undefined : "NEEDS_CLARIFICATION",
      failReason:
        zip || launchCountyId
          ? undefined
          : "Enter a ZIP for public directory listings. Your requested place is retained; no ZIP or service area is guessed.",
      directoryContext: {
        requestedLocation: location,
        requestedInsuranceContext: context,
        effectiveZip: zip,
        unresolvedConditions: [
          ...(!zip && !launchCountyId ? ["ZIP required"] : []),
          ...(launchCountyId
            ? [
                "Recorded public-directory county record, not a confirmed service area -- a county directory record does not mean an agency serves customers throughout the county.",
              ]
            : []),
          ...(context.length
            ? [
                "Insurance product context is retained, not an applied LOA, appointment or directory product filter.",
              ]
            : []),
        ],
      },
    });
  }
  if (
    /\b(?:how (?:do|can|to)|where (?:can|do))\b/i.test(q) &&
    /\b(?:verify|check|license)\b/i.test(q)
  )
    return parsed(q, {
      mode: "fail_closed",
      intent: "RECOVERY",
      page,
      entityClass: cls,
      refinement: "identity",
      terminalState: "NEEDS_CLARIFICATION",
      jurisdiction: states[0]
        ? { state: states[0], meaning: "credential_jurisdiction" }
        : undefined,
      failReason:
        "Enter the agency or legal insurer name, or a labeled NPN / NAIC company code. Match the exact identity, then review source-native credential and evidence records. Official verification is a separate check.",
    });
  if (
    explicitName &&
    !/^(?:this|an?|the)\s/i.test(explicitName[1]!) &&
    !/^who is\s+(?!.*\b(?:insurance|agency|company|insurer|llc|inc)\b)/i.test(
      q,
    ) &&
    !/\b(?:how|which|what|near me|agencies|insurers|agents|producers|credentialed|located|domiciled|best|complaints)\b/i.test(
      explicitName[1]!,
    )
  ) {
    let name = explicitName[1]!.replace(/^named\s+/i, "").trim();
    name = name
      .replace(
        /\s+(?:appointed\s+(?:with|by)|licensed|credentialed|in|located in|with offices in)\s+.*$/i,
        "",
      )
      .replace(/\s+(?:licensed|appointed)\??$/i, "")
      .replace(/^['"]|['"]$/g, "")
      .trim();
    if (
      /^(?:an? |this )?(?:insurance )?(?:agency|company|insurer|producer|agent|license)$/i.test(
        name,
      )
    )
      return null;
    if (cls === "person")
      return parsed(q, {
        mode: "fail_closed",
        intent: "NAME_IDENTITY",
        entityClass: "person",
        page,
        refinement: "identity",
        terminalState: "NEEDS_CLARIFICATION",
        failReason:
          "For an individual producer, enter a labeled NPN. Public person directories and profiles are not published.",
      });
    if (name.length >= 2 && !/^[\W_]+$/.test(name)) {
      const appointment = /\bappoint(?:ed|ment)?\b/i.test(q);
      return parsed(q, {
        mode: "entity",
        intent: "NAME_IDENTITY",
        entityClass: requestedClass(name),
        nameQuery: name,
        page,
        coverageState: "PARTIAL",
        requestedTask: appointment
          ? "appointment"
          : /\blicensed|credential/i.test(q)
            ? "credential"
            : "identity",
        appointerName: appointment
          ? q.match(/\b(?:with|by)\s+(.+?)[?.]?$/i)?.[1]?.replace(/[?.]+$/, "")
          : undefined,
        conditions: requestStates(
          q.match(
            /\s(?:in|located in|credentialed in|licensed in)\s+(.+?)\??$/i,
          )?.[1] ?? "",
        ).map((state) => ({
          value: state,
          meaning: "requested location/jurisdiction on named identity",
          outcome: "NEEDS_CLARIFICATION",
        })),
      });
    }
  }
  if (states.length > 1 && !/\bcompar/i.test(q))
    return parsed(q, {
      mode: "fail_closed",
      intent: "RECOVERY",
      page,
      entityClass: cls,
      terminalState: "NEEDS_CLARIFICATION",
      failReason:
        "The request includes multiple geographic requirements. Specify which is credential jurisdiction, address or domicile; they are not interchangeable.",
      conditions: states.map((value) => ({
        value,
        meaning: "requested geography",
        outcome: "NEEDS_CLARIFICATION",
      })),
    });
  return null;
}
