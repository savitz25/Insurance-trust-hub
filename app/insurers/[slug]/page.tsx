import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalInsurerProfileView } from "@/components/insurers/legal-insurer-profile-view";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildResearchPageGraph } from "@/lib/seo/research-seo";
import {
  buildPilotProfile,
  getPublishedBySlug,
  insurerProfilePath,
  listPublishedInsurers,
  mayPublishLegalInsurerPilot,
  seoDescription,
  seoTitle,
} from "@/lib/national/legal-insurer-pilot";
import { insurerCustomerEligible } from "@/lib/customer-integration/eligibility";
import { fetchCustomerLayer } from "@/lib/customer-integration/public";

export const runtime = "nodejs";
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listPublishedInsurers().map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = getPublishedBySlug(slug);
  if (
    !row ||
    !mayPublishLegalInsurerPilot({
      entityKind: "legal_insurer",
      entityId: row.entity_id,
    })
  ) {
    return buildMetadata({
      title: "Legal insurer research",
      description: "Legal insurer research",
      noIndex: true,
    });
  }
  const path = insurerProfilePath(row.slug);
  return buildMetadata({
    title: seoTitle(row.canonical_legal_name, row.naic_cocode),
    description: seoDescription(row.canonical_legal_name),
    path,
    noIndex: false,
  });
}

export default async function LegalInsurerProfilePage({ params }: Props) {
  const { slug } = await params;
  const row = getPublishedBySlug(slug);
  if (
    !row ||
    !mayPublishLegalInsurerPilot({
      entityKind: "legal_insurer",
      entityId: row.entity_id,
    })
  ) {
    notFound();
  }
  const profile = buildPilotProfile(row);
  const customerEnabled = insurerCustomerEligible(row);
  const customer = customerEnabled
    ? await fetchCustomerLayer(row.entity_id)
    : { profile: null, replies: null };
  const path = insurerProfilePath(row.slug);
  const jsonLd = buildResearchPageGraph({
    path,
    name: row.canonical_legal_name,
    description: seoDescription(row.canonical_legal_name),
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Legal insurers", path: "/insurers" },
      { name: row.canonical_legal_name, path },
    ],
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <LegalInsurerProfileView
        row={row}
        profile={profile}
        customerEnabled={customerEnabled}
        customer={customer}
      />
    </>
  );
}
