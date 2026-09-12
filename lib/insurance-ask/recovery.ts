import type { InsuranceResearchQuery, RecoveryAction } from "./contract";
export const OFFICIAL_RECOVERY = {
  FL: {
    agency: "Florida Department of Financial Services",
    jurisdiction: "FL",
    purpose: "Agency, producer, NPN, license and appointment search",
    url: "https://licenseesearch.fldfs.com/",
    checkedAt: "2026-09-12",
    liveCheck: "Search fields observed; no individual status determination.",
  },
  TX: {
    agency: "Texas Department of Insurance",
    jurisdiction: "TX",
    purpose: "Agent/agency licensing and official name/license research path",
    url: "https://www.tdi.texas.gov/agent/index.html",
    checkedAt: "2026-09-12",
    liveCheck: "Official licensing page and lookup link observed.",
  },
  IL: {
    agency: "Illinois Department of Insurance",
    jurisdiction: "IL",
    purpose: "Official agent/producer lookup guidance",
    url: "https://idoi.illinois.gov/companies/agent-lookup.html",
    checkedAt: "2026-09-12",
    liveCheck: "Official Agent Lookup page observed.",
  },
  US: {
    agency: "National Association of Insurance Commissioners",
    jurisdiction: "US",
    purpose:
      "Consumer insurance research and state insurance-department pathways",
    url: "https://content.naic.org/consumer",
    checkedAt: "2026-09-12",
    liveCheck:
      "Official consumer landing observed; no live identity verification.",
  },
} as const;
export const STATE_RESEARCH: Record<string, string> = {
  FL: "/florida",
  TX: "/texas",
  NJ: "/new-jersey",
  CA: "/california",
  WA: "/washington",
  CO: "/colorado",
  VA: "/virginia",
  NY: "/new-york",
  IL: "/illinois",
};
export function recoveryFor(q: InsuranceResearchQuery): RecoveryAction[] {
  const state =
    q.jurisdiction?.state ??
    q.conditions?.find((c) => /jurisdiction|territory/.test(c.meaning))?.value;
  const out: RecoveryAction[] = [];
  if (q.conditions?.some((c) => /service territory/.test(c.meaning))) {
    if (
      state &&
      ["FL", "TX", "MA", "OH", "VT"].includes(state) &&
      q.entityClass === "agency"
    )
      out.push({
        type: "INTERNAL_RESEARCH",
        label: `Research agencies credentialed in ${state} instead`,
        destination:
          "/ask?" +
          new URLSearchParams({
            q: `insurance agencies credentialed in ${state}`,
          }),
        reason:
          "Explicit change from service territory to credential jurisdiction.",
        establishes: "Indexed state credential observations.",
        doesNotEstablish:
          "Service area, local office, appointment or availability.",
      });
    out.push({
      type: "INTERNAL_RESEARCH",
      label: "Browse public directory listings by ZIP instead",
      destination:
        "/ask?" + new URLSearchParams({ q: "insurance agency near me" }),
      reason: "Explicit directory research with a ZIP you enter.",
      establishes: "Public recorded-address listings.",
      doesNotEstablish: "Canonical identity, licensure or service territory.",
    });
  }

  if (state && STATE_RESEARCH[state])
    out.push({
      type: "INTERNAL_RESEARCH",
      label: `Open ${state} ${q.entityClass ?? "insurance"} research`,
      destination: STATE_RESEARCH[state]!,
      reason: "Existing jurisdiction-specific research and source limitations.",
      establishes:
        "Only the published state evidence and class-specific capabilities described there.",
      doesNotEstablish:
        "A complete roster, current authority, appointment or service territory.",
    });
  const official =
    q.entityClass !== "insurer" && state && state in OFFICIAL_RECOVERY
      ? OFFICIAL_RECOVERY[state as keyof typeof OFFICIAL_RECOVERY]
      : OFFICIAL_RECOVERY.US;
  out.push({
    type: "OFFICIAL_SOURCE",
    label: `Official ${official.agency} research`,
    destination: official.url,
    reason: official.purpose,
    establishes:
      "Access to official research; enter the supplied identifier or name and inspect its class.",
    doesNotEstablish:
      "Providing this link is not a live status check or proof of authorization.",
  });
  return out;
}
