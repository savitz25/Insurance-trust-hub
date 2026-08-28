/**
 * Coverage Intelligence SEO — metadata tone, breadcrumbs, WebPage schema.
 * Quality over volume; no doorway spam; schema matches visible content only.
 */

import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';

const brand = SITE_NAME;

export type IndexPolicy = 'yes' | 'no' | 'conditional';

export type IndexationRow = {
  template: string;
  pathPattern: string;
  index: IndexPolicy;
  rule: string;
};

/** Authoritative indexation map for Coverage Intelligence surfaces. */
export const COVERAGE_INTELLIGENCE_INDEXATION: IndexationRow[] = [
  {
    template: 'Home',
    pathPattern: '/',
    index: 'yes',
    rule: 'Primary hub',
  },
  {
    template: 'Tools / Research Center',
    pathPattern: '/tools',
    index: 'yes',
    rule: 'Entry hub for research tools',
  },
  {
    template: 'ACA Plan Explorer',
    pathPattern: '/tools/aca-plan-explorer',
    index: 'yes',
    rule: 'Tool landing only — do not index query variants',
  },
  {
    template: 'Marketplace plan research (flagship)',
    pathPattern: '/tools/marketplace-plan-research',
    index: 'yes',
    rule: 'Canonical public ZIP landscape research asset',
  },
  {
    template: 'Marketplace hub',
    pathPattern: '/marketplace',
    index: 'yes',
    rule: 'ACA research hub',
  },
  {
    template: 'County ACA intelligence',
    pathPattern: '/marketplace/[state]/[county]',
    index: 'conditional',
    rule: 'Index when planCount≥5 and issuerCount≥2; else noindex',
  },
  {
    template: 'Plan X-Ray',
    pathPattern: '/marketplace/plans/[year]/[planId]',
    index: 'conditional',
    rule: 'Index only with durable plan identity + useful attributes; never mass sitemap',
  },
  {
    template: 'Medicare hub',
    pathPattern: '/medicare',
    index: 'yes',
    rule: 'Medicare research hub',
  },
  {
    template: 'Medicare county',
    pathPattern: '/medicare/[state]/[county]',
    index: 'conditional',
    rule: 'isMedicareCountyIndexable (material contracts + enrollment + top list)',
  },
  {
    template: 'Medicare contract',
    pathPattern: '/medicare/contracts/[contractId]',
    index: 'conditional',
    rule: 'Complaint rate + carrier identity in extracts',
  },
  {
    template: 'Carriers index',
    pathPattern: '/carriers',
    index: 'yes',
    rule: 'Curated carrier research hub',
  },
  {
    template: 'Carrier profile',
    pathPattern: '/carriers/[slug]',
    index: 'conditional',
    rule: 'Medicare evidence or ≥3 ACA sample-market plans',
  },
  {
    template: 'Plan Complaint Index',
    pathPattern: '/data/plan-complaint-index',
    index: 'yes',
    rule: 'CMS complaint rankings',
  },
  {
    template: 'Legacy county dashboards',
    pathPattern: '/data/counties/*',
    index: 'conditional',
    rule: 'Same quality gates; prefer /medicare canonical paths',
  },
  {
    template: 'Florida insurance intelligence',
    pathPattern: '/florida',
    index: 'yes',
    rule: 'FL-INS-007 publication gate — snapshot v1, no rankings, no mass-publish',
  },
  {
    template: 'Methodology / About / Privacy / Terms',
    pathPattern: '/methodology, /about, /privacy, /terms',
    index: 'yes',
    rule: 'YMYL trust support',
  },
  {
    template: 'My Insurance wallet',
    pathPattern: '/my-insurance/*',
    index: 'no',
    rule: 'Personal research workspace — noindex (not public SERP inventory)',
  },
  {
    template: 'Admin / API / Auth',
    pathPattern: '/admin/*, /api/*, /auth/*',
    index: 'no',
    rule: 'Ops and private flows',
  },
  {
    template: 'Seed / non-indexable providers',
    pathPattern: '/providers/* (seed class)',
    index: 'no',
    rule: 'Phase 6A listing class gates — seed never indexable',
  },
];

/** Metadata copy systems — brand applied via layout title template. */
export const RESEARCH_META = {
  acaExplorer: {
    title: `Live ACA Plan Explorer — ZIP household plan research (${MARKETPLACE_PLAN_YEAR_DEFAULT})`,
    description: `Research ACA Marketplace plans by ZIP and household for ${MARKETPLACE_PLAN_YEAR_DEFAULT}. Compare premiums, estimated yearly cost, and doctor/Rx signals from CMS data. Educational only — not enrollment.`,
    h1: 'Live ACA Plan Explorer',
  },
  marketplaceHub: {
    title: `ACA Marketplace research — county snapshots & Plan X-Ray (${MARKETPLACE_PLAN_YEAR_DEFAULT})`,
    description:
      'Curated ACA Marketplace county intelligence and plan research pages from CMS data. Quality over volume — not mass doorways. Confirm on HealthCare.gov.',
    h1: 'ACA Marketplace research',
  },
  medicareHub: {
    title: 'Medicare market intelligence — CMS county & contract research',
    description:
      'Understand your Medicare market before anyone sells you a plan. CMS enrollment context, complaint-measure signals, and contract research. Educational only — confirm on Medicare.gov.',
    h1: 'Understand your Medicare market before anyone sells you a plan',
  },
  carriersHub: {
    title: 'Carrier research from public Marketplace and Medicare data',
    description:
      'Organization-level carrier intelligence rolled up from CMS Marketplace and Medicare extracts — not sales rankings. Educational only; confirm on official sources.',
    h1: 'Carrier research from public data — not a sales ranking',
  },
  toolsHub: {
    title: 'Insurance Research Center — ACA, Medicare & cost tools',
    description:
      'Research ACA plans, Medicare markets, carriers, and costs with CMS-backed tools. No paid placements. Educational only — not a quote marketplace.',
    h1: undefined as string | undefined,
  },
} as const;

export function metaAcaCounty(opts: {
  countyName: string;
  stateCode: string;
  stateName: string;
  planYear: number;
  indexable: boolean;
}): { title: string; description: string; h1: string } {
  const place = `${opts.countyName} County, ${opts.stateCode}`;
  return {
    title: `ACA plan research in ${place} (${opts.planYear})`,
    description: opts.indexable
      ? `CMS Marketplace market snapshot for ${place}: issuers, metal mix, and premium ranges for plan year ${opts.planYear}. Educational research — confirm on HealthCare.gov.`
      : `Limited ACA Marketplace data for ${place}. Use Plan Explorer or HealthCare.gov for live plan research.`,
    h1: `ACA plan research in ${place}`,
  };
}

export function metaMedicareCounty(opts: {
  displayName: string;
  stateName: string;
  indexable: boolean;
}): { title: string; description: string; h1: string } {
  return {
    title: `Medicare Advantage market intelligence for ${opts.displayName}`,
    description: opts.indexable
      ? `CMS-backed Medicare Advantage / Part D market context for ${opts.displayName}, ${opts.stateName}: enrollment, material contracts, complaint-measure signals. Educational — confirm on Medicare.gov.`
      : `Limited Medicare research data for ${opts.displayName}. Confirm options on Medicare.gov.`,
    h1: `${opts.displayName} Medicare market`,
  };
}

export function metaMedicareContract(opts: {
  contractId: string;
  carrierName: string | null;
  indexable: boolean;
}): { title: string; description: string; h1: string } {
  const name = opts.carrierName || 'CMS contract';
  return {
    title: `${name} (${opts.contractId}) — Medicare contract research`,
    description: opts.indexable
      ? `CMS complaint-measure and county enrollment context for Medicare contract ${opts.contractId} (${name}). Educational only — confirm on Medicare.gov.`
      : `Limited CMS context for contract ${opts.contractId}. Educational research only.`,
    h1: name,
  };
}

export function metaCarrier(opts: {
  displayName: string;
  indexable: boolean;
}): { title: string; description: string; h1: string } {
  return {
    title: `${opts.displayName} carrier research from public Marketplace and Medicare data`,
    description: opts.indexable
      ? `Public CMS Marketplace and Medicare signals for ${opts.displayName} — contracts, sample markets, and quality/complaint context. Not a sales ranking. Confirm on official sources.`
      : `Research profile for ${opts.displayName}. Evidence may be limited in current CMS extracts — confirm on official sources.`,
    h1: opts.displayName,
  };
}

export function metaPlanXray(opts: {
  planName: string;
  issuerName: string;
  metal: string;
  year: number;
  indexable: boolean;
}): { title: string; description: string; h1: string } {
  return {
    title: `${opts.planName} — Plan X-Ray (${opts.year})`,
    description: opts.indexable
      ? `${opts.issuerName} · ${opts.metal} · plan year ${opts.year}. Independent CMS Marketplace plan research — not enrollment. Confirm on HealthCare.gov.`
      : `Plan research page for ${opts.planName}. CMS data may be incomplete — not invented.`,
    h1: opts.planName,
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function buildBreadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL.replace(/\/$/, '')}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };
}

export function buildWebPageJsonLd(opts: {
  path: string;
  name: string;
  description: string;
  dateModified?: string;
}) {
  const url = `${SITE_URL.replace(/\/$/, '')}${opts.path.startsWith('/') ? opts.path : `/${opts.path}`}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': `${SITE_URL.replace(/\/$/, '')}/#website` },
    about: { '@id': `${SITE_URL.replace(/\/$/, '')}/#organization` },
    inLanguage: 'en-US',
    dateModified: opts.dateModified,
  };
}

/** Accurate SoftwareApplication for educational research tools (not app-store product). */
export function buildResearchToolJsonLd(opts: {
  path: string;
  name: string;
  description: string;
}) {
  const url = `${SITE_URL.replace(/\/$/, '')}${opts.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: opts.name,
    url,
    description: opts.description,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: { '@id': `${SITE_URL.replace(/\/$/, '')}/#organization` },
  };
}

export function buildFaqPageJsonLd(
  faqs: Array<{ question: string; answer: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function buildResearchPageGraph(opts: {
  path: string;
  name: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  dateModified?: string;
  includeToolSchema?: boolean;
  /** Only pass FAQs that are visible on the page (accurate content). */
  faqs?: Array<{ question: string; answer: string }>;
}) {
  const graph: Record<string, unknown>[] = [
    buildWebPageJsonLd(opts),
    buildBreadcrumbListJsonLd(opts.breadcrumbs),
  ];
  if (opts.includeToolSchema) {
    graph.push(
      buildResearchToolJsonLd({
        path: opts.path,
        name: opts.name,
        description: opts.description,
      })
    );
  }
  if (opts.faqs?.length) {
    graph.push(buildFaqPageJsonLd(opts.faqs));
  }
  return {
    '@context': 'https://schema.org',
    '@graph': graph.map((node) => {
      // strip nested @context from children when using @graph
      const { ['@context']: _c, ...rest } = node as Record<string, unknown>;
      return rest;
    }),
  };
}

/** Query → template mapping for SEO alignment (documentation + content owners). */
export const QUERY_TEMPLATE_MAP = [
  {
    intent: 'Local Marketplace plan landscape by ZIP',
    template: 'Marketplace plan research flagship',
    path: '/tools/marketplace-plan-research',
  },
  {
    intent: 'Research ACA plans by household ZIP',
    template: 'Plan Explorer',
    path: '/tools/aca-plan-explorer',
  },
  {
    intent: 'Details for a specific Marketplace plan',
    template: 'Plan X-Ray',
    path: '/marketplace/plans/[year]/[planId]',
  },
  {
    intent: 'Local ACA market overview',
    template: 'County ACA intelligence',
    path: '/marketplace/[state]/[county]',
  },
  {
    intent: 'Local Medicare market overview',
    template: 'Medicare county page',
    path: '/medicare/[state]/[county]',
  },
  {
    intent: 'Contract-level Medicare research',
    template: 'Medicare contract page',
    path: '/medicare/contracts/[contractId]',
  },
  {
    intent: 'Carrier-level research',
    template: 'Carrier page',
    path: '/carriers/[slug]',
  },
  {
    intent: 'How verification / independence works',
    template: 'Methodology / About',
    path: '/methodology',
  },
] as const;

export { brand };
