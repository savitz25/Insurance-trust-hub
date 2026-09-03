import {
  mayPublishLegalInsurerPilot,
  type PublishedInsurer,
} from "@/lib/national/legal-insurer-pilot";

export function customerRolloutAllows(
  id: string,
  env: Record<string, string | undefined> = process.env,
) {
  if ((env.ATH_HANDOFF_SECRET || "").length < 32) return false;
  const mode = (env.ATH_CLAIM_CTA_MODE || "off").toLowerCase();
  if (mode === "all") return true;
  if (mode !== "canary") return false;
  return (env.ATH_CLAIM_CANARY_PROFILE_IDS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .includes(id.toLowerCase());
}

export function insurerCustomerEligible(
  row: PublishedInsurer,
  env: Record<string, string | undefined> = process.env,
) {
  return (
    customerRolloutAllows(row.entity_id, env) &&
    /^\d{5}$/.test(row.naic_cocode) &&
    mayPublishLegalInsurerPilot({
      entityKind: "legal_insurer",
      entityId: row.entity_id,
      naicCocode: row.naic_cocode,
    })
  );
}
