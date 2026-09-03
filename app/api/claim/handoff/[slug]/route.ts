import { NextResponse } from "next/server";
import { insurerCustomerEligible } from "@/lib/customer-integration/eligibility";
import { mintInsuranceHandoff } from "@/lib/customer-integration/handoff";
import { INSURANCE_CLAIM_VALIDATION_CONTRACT } from "@/lib/customer-claim-validation/contract";
import { validateInsuranceClaim } from "@/lib/customer-claim-validation/v1";
import {
  getPublishedBySlug,
  insurerProfilePath,
} from "@/lib/national/legal-insurer-pilot";

export const runtime = "nodejs";

const PUBLIC_ORIGIN = "https://www.insurancetrusthub.com";
const REDIRECT_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

function redirect(destination: URL | string) {
  return NextResponse.redirect(destination, {
    status: 302,
    headers: REDIRECT_HEADERS,
  });
}

function recoveryUrl(requestOrigin: string, slug?: string) {
  const url = new URL("/claim-insurer/unavailable", requestOrigin);
  if (slug) url.searchParams.set("profile", slug);
  return url;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const row = getPublishedBySlug(slug);
  const requestOrigin = new URL(request.url).origin;

  if (!row || !insurerCustomerEligible(row)) {
    return redirect(recoveryUrl(requestOrigin, row?.slug));
  }

  const canonicalProfileUrl = `${PUBLIC_ORIGIN}${insurerProfilePath(row.slug)}`;
  const validation = validateInsuranceClaim({
    contract: INSURANCE_CLAIM_VALIDATION_CONTRACT,
    entityClass: "legal_insurer",
    nativeProfileId: row.entity_id,
    naicCode: row.naic_cocode,
    canonicalProfileUrl,
  });

  if (
    validation.resultState !== "EXACT_IDENTITY" ||
    validation.publicationState !== "PUBLIC_PROFILE" ||
    !validation.current ||
    validation.nativeProfileId !== row.entity_id ||
    validation.sourceIdentifier?.value !== row.naic_cocode ||
    validation.canonicalProfileUrl !== canonicalProfileUrl
  ) {
    return redirect(recoveryUrl(requestOrigin, row.slug));
  }

  try {
    const minted = mintInsuranceHandoff(
      process.env.ATH_HANDOFF_SECRET || "",
      row,
      canonicalProfileUrl,
    );
    const askOrigin = (
      process.env.ATH_CUSTOMER_ORIGIN || "https://www.asktrusthub.com"
    ).replace(/\/+$/, "");
    return redirect(
      `${askOrigin}/claim/continue?handoff=${encodeURIComponent(minted.token)}`,
    );
  } catch (error) {
    console.error("Insurance customer handoff unavailable", {
      category: error instanceof Error ? error.message : "unknown",
      profileId: row.entity_id,
    });
    return redirect(recoveryUrl(requestOrigin, row.slug));
  }
}
