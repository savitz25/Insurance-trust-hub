/**
 * ASK-SEARCH-INSURANCE-002 — fail-closed Ask handoff empty / unsupported.
 * noindex.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  EmptyCoveragePanel,
  NAIC_CONSUMER_URL,
} from '@/components/research/empty-coverage-panel';
import { ContextNav } from '@/components/context-nav';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Ask handoff — unsupported search',
  description: 'This AskTrustHub handoff is not supported on InsuranceTrustHub yet.',
  path: '/from-ask/unsupported',
  noIndex: true,
});

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function reasonCopy(reason: string): { title: string; body: string } {
  if (reason === 'medicare_agent') {
    return {
      title: 'Medicare agents are not listed in this directory yet',
      body: 'InsuranceTrustHub does not publish a first-class Medicare-agent inventory for Ask Universal Search. We will not substitute health-insurance brokerages for Medicare agents. Use Medicare research tools or browse verified agencies when you want a different search.',
    };
  }
  if (reason === 'ambiguous_entity') {
    return {
      title: 'We need a clearer insurance search type',
      body: 'Ask did not resolve whether you mean an insurance agency/brokerage or an insurance carrier. We will not guess. Pick agencies in the directory or browse carrier research profiles.',
    };
  }
  return {
    title: 'This Ask handoff could not be applied',
    body: 'The structured search context was missing, invalid, or not allowlisted. We will not invent filters or follow unsafe redirects. Browse the verified agency directory to continue research.',
  };
}

export default async function FromAskUnsupportedPage({ searchParams }: Props) {
  const params = await searchParams;
  const reasonRaw = params.reason;
  const reason = Array.isArray(reasonRaw) ? reasonRaw[0] ?? '' : reasonRaw ?? '';
  const copy = reasonCopy(reason);

  const widenLinks =
    reason === 'medicare_agent'
      ? [
          { href: '/tools/medicare-plan-finder', label: 'Medicare plan research tools' },
          { href: '/directory?verified=true', label: 'Browse verified agencies' },
        ]
      : reason === 'ambiguous_entity'
        ? [
            { href: '/directory?verified=true', label: 'Browse verified agencies' },
            { href: '/carriers', label: 'Browse carrier research' },
          ]
        : [{ href: '/directory?verified=true', label: 'Browse verified agencies' }];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <ContextNav
        pathname="/from-ask/unsupported"
        currentLabel="Ask handoff"
        backOverride={{
          href: '/directory?verified=true',
          label: '← Back to agency directory',
          shortLabel: 'Directory',
        }}
        className="mb-6"
      />
      <EmptyCoveragePanel
        variant="unmapped"
        title={copy.title}
        description={copy.body}
        primarySources={[{ href: NAIC_CONSUMER_URL, label: 'NAIC consumer resources', external: true }]}
        widenLinks={widenLinks}
      />
      <p className="mt-6 text-xs text-muted-foreground">
        Research only · Not an endorsement · We don&apos;t invent listings ·{' '}
        <Link href="/directory?verified=true" className="text-[#0284C7] hover:underline">
          Clear Ask context / directory home
        </Link>
      </p>
    </div>
  );
}
