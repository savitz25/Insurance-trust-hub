/**
 * ASK-SEARCH-INSURANCE-002 — Ask handoff receiving entry.
 * noindex — does not create duplicate indexable directory architecture.
 */
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  parseInsuranceAskSearchContext,
  resolveAskHandoffDestination,
} from '@/lib/ask-handoff';
import { buildMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Ask handoff — InsuranceTrustHub',
  description: 'Structured AskTrustHub search handoff receiver.',
  path: '/from-ask',
  noIndex: true,
});

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FromAskPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = parseInsuranceAskSearchContext(params);

  if (!ctx) {
    redirect('/from-ask/unsupported?reason=invalid_context');
  }

  const dest = resolveAskHandoffDestination(ctx);
  redirect(dest.href);
}
