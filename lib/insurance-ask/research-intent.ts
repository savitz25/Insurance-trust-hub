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
    /^[A-Z]/.test(q) &&
    /\b(?:agency|insurance company|llc|inc|corp)\b/i.test(q) &&
    !/\b(?:in|near|which|what|how|show|does|has|have|can|should|this|licensed|credentialed|located|domiciled|complaints|best|serves)\b/i.test(
      q,
    ) &&
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
    return parsed(q, {
      mode: zip ? "directory" : "fail_closed",
      intent: "DIRECTORY_DISCOVERY",
      page,
      directoryZip: zip,
      coverageState: "PARTIAL",
      refinement: zip ? undefined : "zip",
      terminalState: zip ? undefined : "NEEDS_CLARIFICATION",
      failReason: zip
        ? undefined
        : "Enter a ZIP for public directory listings. Your requested place is retained; no ZIP or service area is guessed.",
      directoryContext: {
        requestedLocation: location,
        requestedInsuranceContext: context,
        effectiveZip: zip,
        unresolvedConditions: [
          ...(!zip ? ["ZIP required"] : []),
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
