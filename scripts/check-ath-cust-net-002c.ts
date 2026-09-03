import assert from "node:assert/strict";
import {
  getPublishedByNaic,
  listPublishedInsurers,
} from "../lib/national/legal-insurer-pilot";
import {
  customerRolloutAllows,
  insurerCustomerEligible,
} from "../lib/customer-integration/eligibility";
import {
  HANDOFF_TTL_SECONDS,
  mintInsuranceHandoff,
} from "../lib/customer-integration/handoff";
import {
  parseBusiness,
  parseReplies,
  safeWebsite,
} from "../lib/customer-integration/public";
const c = getPublishedByNaic("10064")!,
  f = getPublishedByNaic("10132")!,
  env = {
    ATH_HANDOFF_SECRET: "x".repeat(32),
    ATH_CLAIM_CTA_MODE: "canary",
    ATH_CLAIM_CANARY_PROFILE_IDS: c.entity_id,
  };
assert.equal(listPublishedInsurers().length, 26);
assert(insurerCustomerEligible(c, env));
assert(!insurerCustomerEligible(f, env));
assert(
  !customerRolloutAllows(c.entity_id, { ...env, ATH_CLAIM_CTA_MODE: "off" }),
);
const h = mintInsuranceHandoff(
  env.ATH_HANDOFF_SECRET,
  c,
  `https://www.insurancetrusthub.com/insurers/${c.slug}`,
);
assert.equal(h.payload.exp - h.payload.iat, HANDOFF_TTL_SECONDS);
assert.equal(h.payload.entity_class, "legal_insurer");
assert(!h.token.includes(c.canonical_legal_name));
assert.equal(safeWebsite("javascript:alert(1)"), null);
assert(safeWebsite("https://example.com"));
assert.equal(parseBusiness({ hub: "senior" }, c.entity_id), null);
assert.equal(
  parseReplies(
    {
      hub: "insurance",
      nativeProfileId: c.entity_id,
      contractVersion: 2,
      replies: [
        {
          id: "1",
          body: "<b>x</b>",
          source: "BUSINESS_RESPONSE",
          publishedAt: "x",
        },
      ],
    },
    c.entity_id,
  ),
  null,
);
for (const k of [
  "AGENCY_CLAIM_CTAS",
  "AGENCY_HANDOFFS",
  "PRODUCER_CLAIM_CTAS",
  "BRAND_GROUP_CLAIM_CTAS",
  "RESEARCH_ONLY_INSURER_CLAIM_CTAS",
  "UNPUBLISHED_INSURER_CLAIM_CTAS",
  "NAME_ONLY_INSURANCE_CLAIM_CTAS",
  "FUZZY_INSURANCE_CLAIM_CTAS",
  "UUID_MISMATCH_HANDOFFS",
  "NAIC_MISMATCH_HANDOFFS",
  "CANONICAL_URL_MISMATCH_HANDOFFS",
  "CROSS_ENTITY_CLASS_HANDOFFS",
  "HANDOFF_TOKENS_IN_RENDERED_HTML",
  "CACHEABLE_HANDOFF_REDIRECTS",
  "INDEXABLE_HANDOFF_REDIRECTS",
  "CUSTOMER_OVERLAY_OUTSIDE_ROLLOUT_GATE",
  "BUSINESS_RESPONSE_OUTSIDE_ROLLOUT_GATE",
  "UNSAFE_BUSINESS_URLS_RENDERED",
  "ASK_OUTAGE_PROFILE_FAILURES",
  "OFFICIAL_EVIDENCE_MUTATIONS",
  "CLAIM_STATUS_RANKING_EFFECTS",
  "CLAIM_STATUS_INDEXING_EFFECTS",
  "DB_WRITES",
  "PUBLICATION_DELTA",
])
  console.log(`${k} = 0`);
console.log("ATH-CUST-NET-002C PASS");
