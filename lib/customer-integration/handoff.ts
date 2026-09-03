import { createHmac, randomBytes } from "node:crypto";
import type { PublishedInsurer } from "@/lib/national/legal-insurer-pilot";

export const HANDOFF_TTL_SECONDS = 900;

export function mintInsuranceHandoff(
  secret: string,
  row: PublishedInsurer,
  canonicalProfileUrl: string,
  now = new Date(),
) {
  if (secret.length < 32) throw new Error("handoff_unavailable");

  const iat = Math.floor(now.getTime() / 1000);
  const payload = {
    v: 2 as const,
    aud: "asktrusthub" as const,
    hub_id: "insurance" as const,
    native_profile_id: row.entity_id,
    slug: row.slug,
    external_key: row.naic_cocode,
    source_system: "naic" as const,
    home_state: null,
    identifier_namespace: "NAIC" as const,
    entity_class: "legal_insurer" as const,
    canonical_profile_url: canonicalProfileUrl,
    display_name: row.canonical_legal_name,
    iat,
    exp: iat + HANDOFF_TTL_SECONDS,
    nonce: randomBytes(24).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  return { token: `${body}.${signature}`, payload };
}
